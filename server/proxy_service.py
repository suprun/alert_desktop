"""
Сервіс шлюзу тривог UkraineAlarm: Webhook прийом, WebSocket роздача клієнтам та кешування.
Забезпечує:
- Прийом Webhook-подій від https://api.ukrainealarm.com з автоматичною реєстрацією підписки.
- Миттєву трансляцію оновлень через WebSocket (0 сек затримки).
- Початкову синхронізацію та періодичну звірку цілісності кешу активних тривог.
- Зворотну сумісність через REST API (GET /v1/alerts/active.json).
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket
import httpx

try:
    from config import settings
except ImportError:
    from server.config import settings

logger = logging.getLogger("alert_proxy")


class AlertProxyService:
    """Сервіс керування станом тривог, обробки вебхуків та трансляції клієнтам."""

    def __init__(self):
        # Мапа ідентифікаторів регіонів: regionId -> { id, name, type, oblast }
        self._regions_map: Dict[str, Dict[str, Any]] = {}
        # Активні тривоги: regionId -> alert_dict
        self._active_alerts: Dict[str, Dict[str, Any]] = {}

        # Підключені WebSocket клієнти
        self._connected_clients: Set[WebSocket] = set()

        self._start_time: float = time.time()
        self._last_webhook_time: Optional[datetime] = None
        self._last_sync_time: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._total_webhooks: int = 0
        self._total_ws_broadcasts: int = 0
        self._webhook_registered: bool = False

        self._client: Optional[httpx.AsyncClient] = None
        self._is_running: bool = False
        self._lock = asyncio.Lock()

    async def initialize(self):
        """Ініціалізація HTTP клієнта, завантаження довідника регіонів та початкових тривог."""
        headers = {
            "Accept": "application/json",
            "User-Agent": "alert_desktop_proxy/2.0"
        }
        if settings.alerts_api_token:
            headers["Authorization"] = settings.alerts_api_token

        self._client = httpx.AsyncClient(
            timeout=15.0,
            headers=headers
        )
        self._is_running = True

        # 1. Завантажуємо ієрархію регіонів для нормалізації вебхук-подій
        await self.load_regions()

        # 2. Отримуємо актуальний початковий зріз тривог
        await self.sync_active_alerts()

        # 3. Автоматично реєструємо Webhook в UkraineAlarm API
        await self.register_webhook()

    async def close(self):
        """Звільнення ресурсів при зупинці."""
        self._is_running = False

        # Закриваємо всі підключені сокети
        for ws in list(self._connected_clients):
            try:
                await ws.close(code=1000, reason="Server shutting down")
            except Exception:
                pass
        self._connected_clients.clear()

        if self._client:
            await self._client.aclose()
            self._client = None

    def _normalize_alarm_type(self, raw_type: str) -> str:
        """Приведення типу тривоги до стандартного формату alert_desktop."""
        t = (raw_type or "").strip().upper()
        mapping = {
            "AIR": "air_raid",
            "ARTILLERY": "artillery_shelling",
            "URBAN_FIGHTS": "urban_fights",
            "CHEMICAL": "chemical",
            "NUCLEAR": "nuclear"
        }
        return mapping.get(t, "air_raid")

    async def load_regions(self) -> bool:
        """Завантажує повне дерево регіонів із UkraineAlarm API."""
        if not self._client or not settings.alerts_api_token:
            return False

        url = f"{settings.upstream_api_url}/api/v3/regions"
        try:
            logger.info("Завантаження довідника регіонів із %s...", url)
            response = await self._client.get(url)
            if response.status_code == 200:
                data = response.json()
                states = data.get("states", [])

                new_map: Dict[str, Dict[str, Any]] = {}

                def index_items(items: list, oblast_name: str = ""):
                    for item in items:
                        rid = str(item.get("regionId", "")).strip()
                        name = item.get("regionName", "")
                        rtype = item.get("regionType", "")
                        current_oblast = name if rtype == "State" else oblast_name
                        if rid:
                            new_map[rid] = {
                                "id": rid,
                                "name": name,
                                "type": rtype,
                                "oblast": current_oblast
                            }
                        children = item.get("regionChildIds")
                        if children and isinstance(children, list):
                            index_items(children, current_oblast)

                index_items(states)
                self._regions_map = new_map
                logger.info("Успішно завантажено %d регіонів у довідник.", len(new_map))
                return True
            else:
                logger.warning(
                    "Помилка завантаження регіонів: HTTP %d %s",
                    response.status_code, response.text[:200]
                )
                return False
        except Exception as exc:
            logger.warning("Виняток під час завантаження регіонів: %s", exc)
            return False

    async def sync_active_alerts(self) -> bool:
        """Отримує поточні активні тривоги з GET /api/v3/alerts."""
        if not self._client or not settings.alerts_api_token:
            self._last_error = "ALERTS_API_TOKEN не задано"
            return False

        url = f"{settings.upstream_api_url}/api/v3/alerts"
        try:
            response = await self._client.get(url)
            if response.status_code == 200:
                alerts_data = response.json()
                new_active: Dict[str, Dict[str, Any]] = {}

                for group in alerts_data:
                    rid = str(group.get("regionId", "")).strip()
                    r_info = self._regions_map.get(rid, {})
                    r_name = r_info.get("name") or group.get("regionName") or f"Регіон {rid}"
                    r_type = (r_info.get("type") or group.get("regionType") or "State").lower()
                    r_oblast = r_info.get("oblast") or ""

                    for a in group.get("activeAlerts", []):
                        levels = a.get("activeAlertLevels", [])
                        level = levels[0].get("alertLevel", "Red").lower() if levels else "red"
                        raw_type = a.get("type", "AIR")
                        last_update = a.get("lastUpdate") or datetime.now(timezone.utc).isoformat()

                        new_active[rid] = {
                            "location_uid": rid,
                            "location_title": r_name,
                            "location_type": r_type,
                            "location_oblast": r_oblast,
                            "alert_type": self._normalize_alarm_type(raw_type),
                            "alert_level": level,
                            "started_at": last_update,
                            "updated_at": last_update,
                            "raw_alarm_type": raw_type,
                            "source": "ukrainealarm_api"
                        }

                async with self._lock:
                    differs = set(new_active.keys()) != set(self._active_alerts.keys())
                    self._active_alerts = new_active
                    self._last_sync_time = datetime.now(timezone.utc)
                    self._last_error = None

                logger.info(
                    "Синхронізовано активні тривоги: %d активних регіонів",
                    len(new_active)
                )

                if differs:
                    await self.broadcast_ws({
                        "event": "sync_state",
                        "alerts": list(new_active.values()),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

                return True
            else:
                self._last_error = f"HTTP {response.status_code} від /api/v3/alerts"
                logger.warning(self._last_error)
                return False
        except Exception as exc:
            self._last_error = f"Помилка синхронізації тривог: {exc}"
            logger.warning(self._last_error)
            return False

    async def register_webhook(self) -> bool:
        """Реєструє або оновлює URL вебхука в UkraineAlarm API."""
        if not self._client or not settings.alerts_api_token:
            return False

        if not settings.public_webhook_url:
            logger.warning("PUBLIC_WEBHOOK_URL не вказано — пропуск реєстрації вебхука.")
            return False

        url = f"{settings.upstream_api_url}/api/v3/webhook"
        body = {"webHookUrl": settings.public_webhook_url}

        try:
            logger.info("Реєстрація Webhook у %s -> %s...", url, settings.public_webhook_url)
            # Спроба POST (нова підписка)
            resp = await self._client.post(url, json=body)
            if resp.status_code in (200, 201, 204):
                self._webhook_registered = True
                logger.info("[+] Webhook успішно зареєстровано (POST): %s", settings.public_webhook_url)
                return True

            # Якщо вже зареєстровано або 400 — пробуємо PATCH (оновити URL)
            logger.info("Спроба оновлення Webhook через PATCH...")
            patch_resp = await self._client.patch(url, json=body)
            if patch_resp.status_code in (200, 204):
                self._webhook_registered = True
                logger.info("[+] Webhook успішно оновлено (PATCH): %s", settings.public_webhook_url)
                return True
            else:
                logger.warning(
                    "[-] Не вдалося налаштувати Webhook: POST status=%d, PATCH status=%d (%s)",
                    resp.status_code, patch_resp.status_code, patch_resp.text[:200]
                )
                return False
        except Exception as exc:
            logger.warning("Виняток під час реєстрації Webhook: %s", exc)
            return False

    async def handle_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Обробка вхідного POST запиту від Webhook UkraineAlarm.
        Приклад тіла:
        {"status": "Activate", "regionId": 8, "alarmType": "AIR", "createdAt": "2023-08-04T10:38:22Z"}
        """
        self._total_webhooks += 1
        now_utc = datetime.now(timezone.utc)
        self._last_webhook_time = now_utc

        region_id = str(payload.get("regionId", "")).strip()
        status_raw = str(payload.get("status", "")).strip()
        alarm_type_raw = str(payload.get("alarmType", payload.get("type", "AIR"))).strip()
        created_at = str(payload.get("createdAt", now_utc.isoformat()))

        is_activate = status_raw.lower() in ("activate", "active", "started", "start")

        logger.info(
            "WEBHOOK: status=%s (is_activate=%s), regionId=%s, alarmType=%s, createdAt=%s",
            status_raw, is_activate, region_id, alarm_type_raw, created_at
        )

        r_info = self._regions_map.get(region_id, {})
        r_name = r_info.get("name") or f"Регіон {region_id}"
        r_type = (r_info.get("type") or "State").lower()
        r_oblast = r_info.get("oblast") or ""

        alert_obj = None
        async with self._lock:
            if is_activate:
                alert_obj = {
                    "location_uid": region_id,
                    "location_title": r_name,
                    "location_type": r_type,
                    "location_oblast": r_oblast,
                    "alert_type": self._normalize_alarm_type(alarm_type_raw),
                    "alert_level": "red",
                    "started_at": created_at,
                    "updated_at": created_at,
                    "raw_alarm_type": alarm_type_raw,
                    "source": "ukrainealarm_webhook"
                }
                self._active_alerts[region_id] = alert_obj
            else:
                self._active_alerts.pop(region_id, None)

            current_alerts_list = list(self._active_alerts.values())

        # Миттєва трансляція всім WebSocket клієнтам!
        ws_message = {
            "event": "alert_event",
            "status": status_raw,
            "is_activate": is_activate,
            "regionId": region_id,
            "alarmType": alarm_type_raw,
            "alert": alert_obj,
            "alerts": current_alerts_list,
            "active_count": len(current_alerts_list),
            "timestamp": now_utc.isoformat()
        }
        await self.broadcast_ws(ws_message)

        return {
            "status": "ok",
            "is_activate": is_activate,
            "regionId": region_id,
            "active_alerts_count": len(current_alerts_list)
        }

    async def register_ws(self, ws: WebSocket):
        """Реєстрація нового WebSocket клієнта та передача початкового стану."""
        await ws.accept()
        self._connected_clients.add(ws)
        logger.info(
            "Новий WebSocket клієнт підключено. Всього активних клієнтів: %d",
            len(self._connected_clients)
        )

        # Надсилаємо актуальний повний стан при підключенні
        try:
            await ws.send_json({
                "event": "initial_state",
                "alerts": list(self._active_alerts.values()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "service": "ukrainealarm_webhook_proxy"
            })
        except Exception as exc:
            logger.warning("Помилка відправки initial_state клієнту: %s", exc)

    async def unregister_ws(self, ws: WebSocket):
        """Видалення відключеного WebSocket клієнта."""
        self._connected_clients.discard(ws)
        logger.info(
            "WebSocket клієнт відключено. Залишилось клієнтів: %d",
            len(self._connected_clients)
        )

    async def broadcast_ws(self, message: Dict[str, Any]):
        """Трансляція повідомлення всім активним WebSocket клієнтам."""
        if not self._connected_clients:
            return

        self._total_ws_broadcasts += 1
        disconnected = []

        for ws in list(self._connected_clients):
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            self._connected_clients.discard(ws)

    async def background_loop(self):
        """
        Фоновий цикл:
        - Кожні 30 сек: heartbeat ping підключеним клієнтам.
        - Кожні resync_interval_seconds: звірка цілісності з GET /api/v3/alerts.
        """
        logger.info(
            "Фоновий моніторинг запущено. Інтервал звірки: %d сек",
            settings.resync_interval_seconds
        )
        ticks = 0
        while self._is_running:
            try:
                await asyncio.sleep(15)
                ticks += 15

                # 1. Heartbeat WebSocket клієнтам кожні 30 секунд
                if ticks % 30 == 0 and self._connected_clients:
                    await self.broadcast_ws({
                        "event": "ping",
                        "active_count": len(self._active_alerts),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

                # 2. Періодична звірка тривог для захисту від пропущених через мережу вебхуків
                if ticks >= settings.resync_interval_seconds:
                    ticks = 0
                    logger.debug("Виконується планова звірка тривог з upstream API...")
                    await self.sync_active_alerts()

            except asyncio.CancelledError:
                logger.info("Фоновий цикл зупинено.")
                break
            except Exception as exc:
                logger.warning("Помилка фонового циклу: %s", exc)

    def get_alerts_payload(self) -> Dict[str, Any]:
        """Повертає кешовані дані для клієнтів за стандартом REST (fallback)."""
        now_utc = datetime.now(timezone.utc)
        alerts_list = list(self._active_alerts.values())
        return {
            "alerts": alerts_list,
            "disclaimer": "Дані надано сервером-шлюзом UkraineAlarm Webhook",
            "meta": {
                "source": "ukrainealarm_webhook",
                "is_stale": False,
                "cached_at": now_utc.isoformat(),
                "alerts_count": len(alerts_list),
                "webhook_registered": self._webhook_registered,
                "connected_ws_clients": len(self._connected_clients)
            }
        }

    def get_health_status(self) -> Dict[str, Any]:
        """Діагностика стану шлюзу."""
        uptime = int(time.time() - self._start_time)
        return {
            "status": "ok" if settings.alerts_api_token else "no_token",
            "uptime_seconds": uptime,
            "webhook_registered": self._webhook_registered,
            "public_webhook_url": settings.public_webhook_url,
            "upstream_api_url": settings.upstream_api_url,
            "connected_ws_clients": len(self._connected_clients),
            "total_webhooks_received": self._total_webhooks,
            "total_ws_broadcasts": self._total_ws_broadcasts,
            "last_webhook_time": self._last_webhook_time.isoformat() if self._last_webhook_time else None,
            "last_sync_time": self._last_sync_time.isoformat() if self._last_sync_time else None,
            "active_alerts_count": len(self._active_alerts),
            "regions_indexed": len(self._regions_map),
            "last_error": self._last_error
        }


proxy_service = AlertProxyService()
