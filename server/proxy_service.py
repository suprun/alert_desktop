"""
Сервіс фонового опитування та кешування даних API alerts.in.ua.
Забезпечує періодичне оновлення кешу, захист від перевищення лімітів (rate limit),
зберігання останнього валідного стану при збоях мережі та миттєву роздачу клієнтам.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

try:
    from config import settings
except ImportError:
    from server.config import settings

logger = logging.getLogger("alert_proxy")


class AlertProxyService:
    """Сервіс керування кешем та взаємодії з upstream API."""

    def __init__(self):
        self._cached_payload: Dict[str, Any] = {
            "alerts": [],
            "disclaimer": "Дані кешовано проксі-сервером alerts_proxy",
            "meta": {
                "source": "cache",
                "is_stale": True,
                "cached_at": None,
                "alerts_count": 0
            }
        }
        self._start_time: float = time.time()
        self._last_success_time: Optional[datetime] = None
        self._last_poll_time: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._total_polls: int = 0
        self._failed_polls: int = 0
        self._client: Optional[httpx.AsyncClient] = None
        self._is_running: bool = False
        self._backoff_delay: int = 0

    async def initialize(self):
        """Ініціалізація HTTP клієнта."""
        self._client = httpx.AsyncClient(
            timeout=10.0,
            headers={
                "Accept": "application/json",
                "User-Agent": "alert_desktop_proxy/1.0"
            }
        )
        self._is_running = True

    async def close(self):
        """Звільнення ресурсів при зупинці."""
        self._is_running = False
        if self._client:
            await self._client.aclose()
            self._client = None

    async def fetch_upstream(self) -> bool:
        """
        Виконує один запит до офіційного API alerts.in.ua.
        Повертає True, якщо оновлення успішне, False — якщо помилка.
        """
        if not settings.alerts_api_token:
            self._last_error = "ALERTS_API_TOKEN не задано в .env"
            return False

        if not self._client:
            return False

        self._total_polls += 1
        self._last_poll_time = datetime.now(timezone.utc)

        headers = {
            "Authorization": f"Bearer {settings.alerts_api_token}",
            "X-API-Key": settings.alerts_api_token
        }

        # Підтримка передачі токена в query-параметрі token= за необхідності
        url = settings.upstream_api_url
        params = {}
        if "token=" not in url:
            params["token"] = settings.alerts_api_token

        try:
            response = await self._client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                # Нормалізація відповіді: масив або об'єкт { alerts: [...] }
                raw_alerts: List[Dict[str, Any]] = []
                disclaimer = "Дані отримано через alerts.in.ua"
                
                if isinstance(data, list):
                    raw_alerts = data
                elif isinstance(data, dict):
                    raw_alerts = data.get("alerts", [])
                    disclaimer = data.get("disclaimer", disclaimer)

                now_utc = datetime.now(timezone.utc)
                self._last_success_time = now_utc
                self._last_error = None
                self._backoff_delay = 0

                self._cached_payload = {
                    "alerts": raw_alerts,
                    "disclaimer": disclaimer,
                    "meta": {
                        "source": "alerts_proxy_cache",
                        "is_stale": False,
                        "cached_at": now_utc.isoformat(),
                        "alerts_count": len(raw_alerts)
                    }
                }
                logger.info(
                    "Кеш оновлено: %d активних тривог", len(raw_alerts)
                )
                return True

            elif response.status_code == 429:
                # Upstream rate limit перевищено — вмикаємо експоненційну паузу
                self._failed_polls += 1
                self._backoff_delay = min(60, (self._backoff_delay or 15) * 2)
                self._last_error = (
                    f"HTTP 429 Too Many Requests від upstream. "
                    f"Пауза {self._backoff_delay} сек."
                )
                logger.warning(self._last_error)
                return False

            elif response.status_code in (401, 403):
                self._failed_polls += 1
                self._last_error = f"HTTP {response.status_code} Unauthorized. Перевірте ALERTS_API_TOKEN!"
                logger.error(self._last_error)
                return False

            else:
                self._failed_polls += 1
                self._last_error = f"HTTP {response.status_code} від upstream"
                logger.warning(self._last_error)
                return False

        except httpx.TimeoutException:
            self._failed_polls += 1
            self._last_error = "Таймаут з'єднання з upstream API (10 сек)"
            logger.warning(self._last_error)
            return False

        except Exception as exc:
            self._failed_polls += 1
            self._last_error = f"Помилка запиту до upstream: {str(exc)}"
            logger.warning(self._last_error)
            return False

    async def poll_loop(self):
        """Нескінченний фоновий цикл опитування з урахуванням інтервалу та помилок."""
        logger.info(
            "Фоновий сервіс опитування запущено. Інтервал: %d сек",
            settings.poll_interval_seconds
        )

        while self._is_running:
            await self.fetch_upstream()

            # Якщо активний backoff при помилці 429 — чекаємо довше
            sleep_time = self._backoff_delay if self._backoff_delay > 0 else settings.poll_interval_seconds
            try:
                await asyncio.sleep(sleep_time)
            except asyncio.CancelledError:
                logger.info("Фоновий цикл опитування зупинено.")
                break

    def get_alerts_payload(self) -> Dict[str, Any]:
        """
        Повертає кешовані дані для клієнтів alert_desktop.
        Динамічно обчислює прапорець застарілості (is_stale).
        """
        is_stale = True
        if self._last_success_time:
            delta = (datetime.now(timezone.utc) - self._last_success_time).total_seconds()
            # Дані вважаються застарілими, якщо успішного оновлення не було більше 3 інтервалів
            is_stale = delta > (settings.poll_interval_seconds * 3)

        payload = dict(self._cached_payload)
        payload["meta"] = {
            **payload.get("meta", {}),
            "is_stale": is_stale,
            "last_error": self._last_error if is_stale else None
        }
        return payload

    def get_health_status(self) -> Dict[str, Any]:
        """Повертає діагностичні показники стану сервісу."""
        uptime = int(time.time() - self._start_time)
        alerts_count = len(self._cached_payload.get("alerts", []))
        
        status = "ok"
        if not settings.alerts_api_token:
            status = "no_token"
        elif self._last_success_time is None:
            status = "initializing"
        else:
            delta = (datetime.now(timezone.utc) - self._last_success_time).total_seconds()
            if delta > (settings.poll_interval_seconds * 3):
                status = "degraded"

        return {
            "status": status,
            "uptime_seconds": uptime,
            "poll_interval_seconds": settings.poll_interval_seconds,
            "last_poll_time": self._last_poll_time.isoformat() if self._last_poll_time else None,
            "last_success_time": self._last_success_time.isoformat() if self._last_success_time else None,
            "total_polls": self._total_polls,
            "failed_polls": self._failed_polls,
            "active_alerts_count": alerts_count,
            "last_error": self._last_error
        }


proxy_service = AlertProxyService()
