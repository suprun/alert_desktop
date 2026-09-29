"""
Головний модуль FastAPI проксі-шлюзу тривог UkraineAlarm.
Забезпечує:
- Прийом Webhook від api.ukrainealarm.com (/api/v3/webhook).
- WebSocket трансляцію клієнтам alert_desktop у реальному часі (/ws).
- REST ендпоінт активних тривог для fallback (/v1/alerts/active.json).
- Діагностику працездатності (/health).
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from config import settings
    from proxy_service import proxy_service
except ImportError:
    from server.config import settings
    from server.proxy_service import proxy_service

logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("alert_proxy")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Керування життєвим циклом шлюзу: запуск та зупинка фонових задач."""
    logger.info("Запуск проксі-шлюзу UkraineAlarm...")
    warnings = settings.validate()
    for w in warnings:
        logger.warning("Конфігураційне зауваження: %s", w)

    await proxy_service.initialize()
    bg_task = asyncio.create_task(proxy_service.background_loop())

    yield

    logger.info("Зупинка проксі-шлюзу UkraineAlarm...")
    bg_task.cancel()
    try:
        await bg_task
    except asyncio.CancelledError:
        pass
    await proxy_service.close()
    logger.info("Шлюз успішно зупинено.")


app = FastAPI(
    title="UkraineAlarm Webhook Proxy & WebSocket Gateway",
    description="Шлюз для прийому Webhook від UkraineAlarm та миттєвої трансляції клієнтам через WebSocket",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", summary="Інформація про шлюз")
async def root():
    """Інформаційна сторінка стану шлюзу."""
    health = proxy_service.get_health_status()
    return {
        "service": "UkraineAlarm Webhook Gateway & Proxy",
        "status": health["status"],
        "active_alerts": health["active_alerts_count"],
        "connected_ws_clients": health["connected_ws_clients"],
        "webhook_registered": health["webhook_registered"],
        "uptime_seconds": health["uptime_seconds"],
        "endpoints": {
            "webhook": "/api/v3/webhook",
            "websocket": "/ws",
            "alerts_rest": "/v1/alerts/active.json",
            "health": "/health",
            "refresh": "/refresh"
        },
        "docs_url": "/docs"
    }


@app.post("/api/v3/webhook", summary="Прийом Webhook від UkraineAlarm")
@app.post("/webhook", include_in_schema=False)
async def receive_webhook(request: Request):
    """
    Приймає HTTP POST від api.ukrainealarm.com при зміні статусу тривоги.
    Формат: {"status": "Activate"|"DEACTIVATE", "regionId": 8, "alarmType": "AIR", "createdAt": "..."}
    """
    try:
        body: Dict[str, Any] = await request.json()
    except Exception as exc:
        logger.warning("Невалідний JSON у вебхуку: %s", exc)
        return JSONResponse(status_code=400, content={"error": "Invalid JSON body"})

    result = await proxy_service.handle_webhook(body)
    return JSONResponse(content=result, status_code=200)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Двосторонній WebSocket канал для клієнтів alert_desktop.
    При підключенні відправляє initial_state з повним списком активних тривог,
    а далі транслює події alert_event у режимі реального часу (0 сек затримки).
    """
    await proxy_service.register_ws(websocket)
    try:
        while True:
            # Очікуємо ping від клієнта для keep-alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await proxy_service.unregister_ws(websocket)
    except Exception as exc:
        logger.debug("Виняток у з'єднанні WebSocket: %s", exc)
        await proxy_service.unregister_ws(websocket)


@app.get("/v1/alerts/active.json", summary="Активні тривоги (REST Fallback)")
@app.get("/api/v1/alerts/active.json", include_in_schema=False)
@app.get("/alerts", include_in_schema=False)
async def get_active_alerts():
    """
    Повертає актуальний кешований список тривог для клієнтів alert_desktop.
    Використовується для зворотної сумісності та fallback при розриві сокета.
    """
    payload = proxy_service.get_alerts_payload()
    return JSONResponse(
        content=payload,
        headers={
            "Cache-Control": "public, max-age=5",
            "X-Proxy-Source": "ukrainealarm_webhook_gateway"
        }
    )


@app.get("/health", summary="Перевірка стану здоров'я шлюзу")
@app.get("/status", include_in_schema=False)
async def health_check():
    """Діагностичний ендпоінт для моніторингу та systemd watchdog."""
    health = proxy_service.get_health_status()
    return JSONResponse(content=health, status_code=200)


@app.post("/refresh", summary="Примусова звірка тривог з UkraineAlarm API")
@app.get("/refresh", summary="Примусова звірка тривог з UkraineAlarm API (GET)")
async def manual_refresh():
    """Виконує негайну повну синхронізацію тривог з UkraineAlarm API."""
    success = await proxy_service.sync_active_alerts()
    health = proxy_service.get_health_status()
    return {
        "success": success,
        "active_alerts_count": health["active_alerts_count"],
        "last_error": health["last_error"],
        "synced_at": health["last_sync_time"]
    }


@app.post("/webhook/register", summary="Повторна реєстрація Webhook в UkraineAlarm")
async def reregister_webhook():
    """Примусово надсилає запит на реєстрацію Webhook в UkraineAlarm API."""
    success = await proxy_service.register_webhook()
    return {
        "success": success,
        "webhook_url": settings.public_webhook_url,
        "registered": proxy_service._webhook_registered
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=False
    )
