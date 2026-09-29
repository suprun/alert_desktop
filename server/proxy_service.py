"""
Сервіс гібридного шлюзу тривог:
1. Прийом Webhook-подій від https://api.ukrainealarm.com з автоматичною реєстрацією (0 сек затримки).
2. Фонове збагачення детальними загрозами від https://api.alerts.in.ua (масив threats: дрони, ракети, балістика тощо).
3. Миттєва трансляція оновлень клієнтам через WebSocket.
4. Зворотна сумісність через REST API (GET /v1/alerts/active.json).
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

        # Кеш деталізованих загроз від alerts.in.ua
        # location_uid -> threat_dict
        self._threats_by_uid: Dict[str, Dict[str, Any]] = {}
        # (title.lower(), oblast.lower()) -> threat_dict
        self._threats_by_title: Dict[tuple, Dict[str, Any]] = {}

        # Підключені WebSocket клієнти
        self._connected_clients: Set[WebSocket] = set()

        self._start_time: float = time.time()
        self._last_webhook_time: Optional[datetime] = None
        self._last_sync_time: Optional[datetime] = None
        self._last_aiu_sync_time: Optional[datetime] = None
        self._last_aiu_request_time: float = 0.0

        self._last_error: Optional[str] = None
        self._last_aiu_error: Optional[str] = None

        self._total_webhooks: int = 0
        self._total_ws_broadcasts: int = 0
        self._total_aiu_polls: int = 0
        self._webhook_registered: bool = False

        # HTTP клієнти
        self._client: Optional[httpx.AsyncClient] = None
        self._alerts_in_ua_client: Optional[httpx.AsyncClient] = None

        self._is_running: bool = False
        self._lock = asyncio.Lock()

    async def initialize(self):
        """Ініціалізація HTTP клієнтів, завантаження довідника регіонів, початкових тривог та загроз."""
        ua_headers = {
            "Accept": "application/json",
            "User-Agent": "alert_desktop_proxy/2.0"
        }
        if settings.ukralarm_api_token:
            ua_headers["Authorization"] = settings.ukralarm_api_token

        self._client = httpx.AsyncClient(
            timeout=15.0,
            headers=ua_headers
        )

        aiu_headers = {
            "Accept": "application/json",
            "User-Agent": "alert_desktop_proxy/2.0"
        }
        if settings.alerts_in_ua_token:
            aiu_headers["Authorization"] = f"Bearer {settings.alerts_in_ua_token}"

        self._alerts_in_ua_client = httpx.AsyncClient(
            timeout=10.0,
            headers=aiu_headers
        )

        self._is_running = True

        # 1. Завантажуємо ієрархію регіонів для нормалізації вебхук-подій
        await self.load_regions()

        # 2. Отримуємо актуальні загрози з alerts.in.ua для наповнення кешу загроз
        await self.sync_threats_from_alerts_in_ua()

        # 3. Отримуємо актуальний початковий зріз тривог UkraineAlarm
        await self.sync_active_alerts()

        # 4. Автоматично реєструємо Webhook в UkraineAlarm API
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

        if self._alerts_in_ua_client:
            await self._alerts_in_ua_client.aclose()
            self._alerts_in_ua_client = None

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

    def _find_threat_for_alert(self, rid: str, r_name: str, r_oblast: str) -> Optional[Dict[str, Any]]:
        """Шукає деталі загрози в кеші alerts.in.ua: спочатку за числовим UID, потім за назвою."""
        # 1. Прямий збіг за числовим UID (у більшості випадків ідентичний в обох API)
        if rid in self._threats_by_uid:
            return self._threats_by_uid[rid]

        clean_name = r_name.lower().strip()
        clean_oblast = r_oblast.lower().strip()

        # 2. Збіг за назвою та областю
        if (clean_name, clean_oblast) in self._threats_by_title:
            return self._threats_by_title[(clean_name, clean_oblast)]

        # 3. Збіг тільки за назвою локації
        for (t_name, _), data in self._threats_by_title.items():
            if t_name == clean_name:
                return data

        # 4. Спадкування від області (якщо загроза оголошена на всю область, а тривога активна в районі/громаді)
        if clean_oblast:
            for (t_name, _), data in self._threats_by_title.items():
                if t_name == clean_oblast or (clean_oblast and t_name in clean_oblast):
                    return data

        return None

    async def load_regions(self) -> bool:
        """Завантажує повне дерево регіонів із UkraineAlarm API."""
        if not self._client or not settings.ukralarm_api_token:
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

    async def sync_threats_from_alerts_in_ua(self) -> bool:
        """Отримує актуальні загрози з alerts.in.ua та збагачує активні тривоги."""
        if not self._alerts_in_ua_client or not settings.alerts_in_ua_token:
            return False

        # Захист від перевищення ліміту (мінімум 6 сек між запитами: максимум 10 req/min)
        now_ts = time.time()
        if now_ts - self._last_aiu_request_time < 6.0:
            return False

        self._last_aiu_request_time = now_ts
        self._total_aiu_polls += 1

        try:
            response = await self._alerts_in_ua_client.get(settings.alerts_in_ua_url)
            if response.status_code == 200:
                data = response.json()
                aiu_alerts = data.get("alerts", [])

                new_threats_uid: Dict[str, Dict[str, Any]] = {}
                new_threats_title: Dict[tuple, Dict[str, Any]] = {}

                for a in aiu_alerts:
                    uid = str(a.get("location_uid") or a.get("id") or "").strip()
                    title = (a.get("location_title") or "").strip()
                    oblast = (a.get("location_oblast") or "").strip()
                    alert_level = (a.get("alert_level") or "red").lower()
                    threats = a.get("threats") if isinstance(a.get("threats"), list) else []

                    threat_data = {
                        "location_uid": uid,
                        "location_title": title,
                        "location_oblast": oblast,
                        "alert_level": alert_level,
                        "threats": threats,
                        "updated_at": a.get("updated_at")
                    }

                    if uid:
                        new_threats_uid[uid] = threat_data
                    if title:
                        new_threats_title[(title.lower().strip(), oblast.lower().strip())] = threat_data

                changed = False
                async with self._lock:
                    self._threats_by_uid = new_threats_uid
                    self._threats_by_title = new_threats_title
                    self._last_aiu_sync_time = datetime.now(timezone.utc)
                    self._last_aiu_error = None

                    # Збагачуємо поточні активні тривоги
                    for rid, alert_item in self._active_alerts.items():
                        r_name = alert_item.get("location_title", "")
                        r_oblast = alert_item.get("location_oblast", "")
                        found = self._find_threat_for_alert(rid, r_name, r_oblast)

                        if found:
                            new_level = found["alert_level"]
                            new_threats = found["threats"]
                            if alert_item.get("threats") != new_threats or alert_item.get("alert_level") != new_level:
                                alert_item["threats"] = new_threats
                                alert_item["alert_level"] = new_level
                                changed = True
                        else:
                            if "threats" not in alert_item:
                                alert_item["threats"] = []

                if changed:
                    logger.info("Загрози збагачено з alerts.in.ua. Надсилаємо оновлення підключеним клієнтам.")
                    await self.broadcast_ws({
                        "event": "sync_state",
                        "alerts": list(self._active_alerts.values()),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

                return True
            elif response.status_code == 429:
                self._last_aiu_error = "Rate limit (HTTP 429) від alerts.in.ua"
                logger.warning(self._last_aiu_error)
                return False
            else:
                self._last_aiu_error = f"HTTP {response.status_code} від alerts.in.ua"
                logger.warning(self._last_aiu_error)
                return False
        except Exception as exc:
            self._last_aiu_error = f"Виняток alerts.in.ua: {exc}"
            logger.warning(self._last_aiu_error)
            return False

    async def sync_active_alerts(self) -> bool:
        """Отримує поточні активні тривоги з GET /api/v3/alerts UkraineAlarm."""
        if not self._client or not settings.ukralarm_api_token:
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

                        # Збагачення з кешу загроз
                        threat_info = self._find_threat_for_alert(rid, r_name, r_oblast)
                        threats = threat_info.get("threats", []) if threat_info else []
                        if threat_info and threat_info.get("alert_level"):
                            level = threat_info["alert_level"]

                        new_active[rid] = {
                            "location_uid": rid,
                            "location_title": r_name,
                            "location_type": r_type,
                            "location_oblast": r_oblast,
                            "alert_type": self._normalize_alarm_type(raw_type),
                            "alert_level": level,
                            "threats": threats,
                            "started_at": last_update,
                            "updated_at": last_update,
                            "raw_alarm_type": raw_type,
                            "source": "ukrainealarm_api"
                        }

                async with self._lock:
                    differs = (
                        set(new_active.keys()) != set(self._active_alerts.keys())
                        or any(new_active[k].get("threats") != self._active_alerts[k].get("threats") for k in new_active if k in self._active_alerts)
                    )
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
        if not self._client or not settings.ukralarm_api_token:
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

            # Якщо вже зареєстровано (400 / 409 / conflict) — оновлюємо через PATCH
            logger.info("POST повернув status=%d, спроба оновлення через PATCH...", resp.status_code)
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
        Обробка вхідного POST запиту від Webhook UkraineAlarm (0 сек затримки).
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

        # Збагачуємо загрозу, якщо вона вже є в кеші
        threat_info = self._find_threat_for_alert(region_id, r_name, r_oblast)
        level = "red"
        threats = []
        if threat_info:
            level = threat_info.get("alert_level", "red")
            threats = threat_info.get("threats", [])

        alert_obj = None
        async with self._lock:
            if is_activate:
                alert_obj = {
                    "location_uid": region_id,
                    "location_title": r_name,
                    "location_type": r_type,
                    "location_oblast": r_oblast,
                    "alert_type": self._normalize_alarm_type(alarm_type_raw),
                    "alert_level": level,
                    "threats": threats,
                    "started_at": created_at,
                    "updated_at": created_at,
                    "raw_alarm_type": alarm_type_raw,
                    "source": "ukrainealarm_webhook"
                }
                self._active_alerts[region_id] = alert_obj
            else:
                self._active_alerts.pop(region_id, None)

            current_alerts_list = list(self._active_alerts.values())

        # Миттєва трансляція всім WebSocket клієнтам (0 сек)!
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

        # Якщо увімкнулася нова тривога, а деталі загроз ще не підтягнулися,
        # запускаємо асинхронне неблокуюче дозбагачення з alerts.in.ua
        if is_activate and not threats and settings.alerts_in_ua_token:
            asyncio.create_task(self.sync_threats_from_alerts_in_ua())

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
                "service": "hybrid_alert_gateway"
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
        - Кожні alerts_in_ua_poll_interval (8-10 сек): опитування alerts.in.ua для оновлення загроз.
        - Кожні resync_interval_seconds (300 сек): звірка цілісності з GET /api/v3/alerts UkraineAlarm.
        """
        logger.info(
            "Фоновий моніторинг запущено. Інтервал загроз alerts.in.ua: %d сек, звірка UkraineAlarm: %d сек",
            settings.alerts_in_ua_poll_interval,
            settings.resync_interval_seconds
        )
        ticks = 0
        aiu_ticks = 0

        while self._is_running:
            try:
                await asyncio.sleep(2)
                ticks += 2
                aiu_ticks += 2

                # 1. Heartbeat WebSocket клієнтам кожні 30 секунд
                if ticks % 30 == 0 and self._connected_clients:
                    await self.broadcast_ws({
                        "event": "ping",
                        "active_count": len(self._active_alerts),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

                # 2. Періодичне збагачення загроз з alerts.in.ua (кожні 8-10 сек)
                if aiu_ticks >= settings.alerts_in_ua_poll_interval:
                    aiu_ticks = 0
                    await self.sync_threats_from_alerts_in_ua()

                # 3. Періодична звірка тривог з UkraineAlarm API (кожні 300 сек)
                if ticks >= settings.resync_interval_seconds:
                    ticks = 0
                    logger.debug("Виконується планова звірка тривог з UkraineAlarm API...")
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
            "disclaimer": "Дані надано гібридним сервером-шлюзом UkraineAlarm Webhook & alerts.in.ua Threats Enricher",
            "meta": {
                "source": "hybrid_gateway",
                "is_stale": False,
                "cached_at": now_utc.isoformat(),
                "alerts_count": len(alerts_list),
                "threats_cached_count": len(self._threats_by_uid),
                "webhook_registered": self._webhook_registered,
                "connected_ws_clients": len(self._connected_clients)
            }
        }

    def get_health_status(self) -> Dict[str, Any]:
        """Діагностика стану шлюзу."""
        uptime = int(time.time() - self._start_time)
        has_ukralarm = bool(settings.ukralarm_api_token)
        has_aiu = bool(settings.alerts_in_ua_token)

        return {
            "status": "ok" if (has_ukralarm and has_aiu) else "partial",
            "uptime_seconds": uptime,
            "ukrainealarm": {
                "webhook_registered": self._webhook_registered,
                "public_webhook_url": settings.public_webhook_url,
                "upstream_api_url": settings.upstream_api_url,
                "total_webhooks_received": self._total_webhooks,
                "last_webhook_time": self._last_webhook_time.isoformat() if self._last_webhook_time else None,
                "last_sync_time": self._last_sync_time.isoformat() if self._last_sync_time else None,
                "last_error": self._last_error
            },
            "alerts_in_ua": {
                "configured": has_aiu,
                "url": settings.alerts_in_ua_url,
                "poll_interval_sec": settings.alerts_in_ua_poll_interval,
                "total_polls": self._total_aiu_polls,
                "threats_cached_count": len(self._threats_by_uid),
                "last_sync_time": self._last_aiu_sync_time.isoformat() if self._last_aiu_sync_time else None,
                "last_error": self._last_aiu_error
            },
            "connected_ws_clients": len(self._connected_clients),
            "total_ws_broadcasts": self._total_ws_broadcasts,
            "active_alerts_count": len(self._active_alerts),
            "regions_indexed": len(self._regions_map)
        }


proxy_service = AlertProxyService()
