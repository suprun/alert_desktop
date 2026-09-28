"""
Головний модуль FastAPI проксі-сервера тривог.
Забезпечує роутинг запитів від клієнтів alert_desktop, життєвий цикл фонового сервісу
та діагностику працездатності.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from config import settings
    from proxy_service import proxy_service
except ImportError:
    from server.config import settings
    from server.proxy_service import proxy_service

# Налаштування логування
logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("alert_proxy")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Керування життєвим циклом додатка: запуск та зупинка фонових задач."""
    logger.info("Запуск проксі-сервера alerts_proxy...")
    warnings = settings.validate()
    for w in warnings:
        logger.warning("Конфігураційне зауваження: %s", w)

    await proxy_service.initialize()
    poll_task = asyncio.create_task(proxy_service.poll_loop())

    yield

    logger.info("Зупинка проксі-сервера alerts_proxy...")
    poll_task.cancel()
    try:
        await poll_task
    except asyncio.CancelledError:
        pass
    await proxy_service.close()
    logger.info("Сервер успішно зупинено.")


app = FastAPI(
    title="Alerts.in.ua Proxy Server",
    description="Кешуючий проксі-сервер та ретранслятор для додатків alert_desktop",
    version="1.0.0",
    lifespan=lifespan
)

# Дозвіл міждоменних запитів (CORS) для клієнтів Electron / браузерів
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", summary="Інформація про сервіс")
async def root():
    """Інформаційна сторінка проксі-сервера."""
    health = proxy_service.get_health_status()
    return {
        "service": "Alerts.in.ua Cache & Proxy Server",
        "status": health["status"],
        "active_alerts": health["active_alerts_count"],
        "uptime_seconds": health["uptime_seconds"],
        "endpoints": {
            "alerts": "/v1/alerts/active.json",
            "health": "/health",
            "refresh": "/refresh"
        },
        "docs_url": "/docs"
    }


@app.get("/v1/alerts/active.json", summary="Отримати активні тривоги (основний ендпоінт)")
@app.get("/api/v1/alerts/active.json", include_in_schema=False)
@app.get("/alerts", include_in_schema=False)
async def get_active_alerts():
    """
    Повертає актуальний кешований список тривог для клієнтів alert_desktop.
    Повністю сумісний зі структурою офіційного API alerts.in.ua.
    """
    payload = proxy_service.get_alerts_payload()
    return JSONResponse(
        content=payload,
        headers={
            "Cache-Control": "public, max-age=5",
            "X-Proxy-Source": "alerts_proxy_ubuntu"
        }
    )


@app.get("/health", summary="Перевірка стану здоров'я сервісу")
@app.get("/status", include_in_schema=False)
async def health_check():
    """Діагностичний ендпоінт для моніторингу та systemd watchdog."""
    health = proxy_service.get_health_status()
    status_code = 200
    if health["status"] in ("no_token", "degraded"):
        # Повертаємо 200 навіть при degraded, щоб балансувальник не вбивав процес,
        # але передаємо статус у тілі відповіді
        status_code = 200
    return JSONResponse(content=health, status_code=status_code)


@app.post("/refresh", summary="Примусове позачергове оновлення кешу")
@app.get("/refresh", summary="Примусове позачергове оновлення кешу (GET)")
async def manual_refresh():
    """Виконує негайний запит до upstream API і повертає оновлений стан."""
    success = await proxy_service.fetch_upstream()
    health = proxy_service.get_health_status()
    return {
        "success": success,
        "active_alerts_count": health["active_alerts_count"],
        "last_error": health["last_error"],
        "cached_at": health["last_success_time"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=False
    )
