"""
Модуль конфігурації проксі-сервера тривог.
Зчитує параметри з оточення та файлу .env.
"""

import os
from pathlib import Path

# Спроба завантажити python-dotenv за наявності
try:
    from dotenv import load_dotenv
    env_file = Path(__file__).resolve().parent / ".env"
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
except ImportError:
    pass


class Settings:
    """Клас налаштувань сервера."""

    def __init__(self):
        # Токен для api.ukrainealarm.com
        self.ukralarm_api_token: str = (
            os.getenv("UKRALARM_API_TOKEN") or ""
        ).strip()

        # Токен для api.alerts.in.ua
        self.alerts_in_ua_token: str = (
            os.getenv("ALERTS_IN_UA_TOKEN") or os.getenv("ALERTS_API_TOKEN") or ""
        ).strip()

        # Якщо UKRALARM_API_TOKEN не задано окремо, перевіряємо ALERTS_API_TOKEN для зворотної сумісності
        if not self.ukralarm_api_token and os.getenv("ALERTS_API_TOKEN"):
            self.ukralarm_api_token = os.getenv("ALERTS_API_TOKEN").strip()

        # Псевдонім для зворотної сумісності з попередніми викликами
        self.alerts_api_token: str = self.ukralarm_api_token

        self.upstream_api_url: str = os.getenv(
            "UPSTREAM_API_URL", "https://api.ukrainealarm.com"
        ).strip().rstrip("/")
        self.public_webhook_url: str = os.getenv(
            "PUBLIC_WEBHOOK_URL", "https://api.applink.pp.ua/api/v3/webhook"
        ).strip()

        # URL та інтервал для фонового опитування alerts.in.ua
        self.alerts_in_ua_url: str = os.getenv(
            "ALERTS_IN_UA_URL", "https://api.alerts.in.ua/v1/alerts/active.json"
        ).strip()

        try:
            aiu_poll = int(os.getenv("ALERTS_IN_UA_POLL_INTERVAL", "8"))
            # Безпечний інтервал: 8-10 сек (7.5 запитів на хвилину при ліміті 8-10 req/min)
            self.alerts_in_ua_poll_interval: int = max(6, aiu_poll)
        except ValueError:
            self.alerts_in_ua_poll_interval: int = 8

        # Інтервал фонової повторної синхронізації з UkraineAlarm (у секундах)
        try:
            resync = int(os.getenv("RESYNC_INTERVAL_SECONDS", os.getenv("POLL_INTERVAL_SECONDS", "300")))
            self.resync_interval_seconds: int = max(30, resync)
        except ValueError:
            self.resync_interval_seconds: int = 300

        self.server_host: str = os.getenv("SERVER_HOST", "0.0.0.0").strip()

        try:
            self.server_port: int = int(os.getenv("SERVER_PORT", "8080"))
        except ValueError:
            self.server_port: int = 8080

        self.log_level: str = os.getenv("LOG_LEVEL", "INFO").strip().upper()

    def validate(self) -> list[str]:
        """Перевіряє коректність обов'язкових параметрів."""
        warnings: list[str] = []
        if not self.ukralarm_api_token:
            warnings.append(
                "UKRALARM_API_TOKEN не задано. Сервер не зможе взаємодіяти з api.ukrainealarm.com."
            )
        if not self.alerts_in_ua_token:
            warnings.append(
                "ALERTS_IN_UA_TOKEN / ALERTS_API_TOKEN не задано. Сервер не зможе збагачувати загрози з alerts.in.ua."
            )
        if not self.public_webhook_url:
            warnings.append(
                "PUBLIC_WEBHOOK_URL не задано. Сервер не зможе підписатися на вебхуки."
            )
        return warnings


settings = Settings()
