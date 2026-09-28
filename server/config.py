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
        self.alerts_api_token: str = os.getenv("ALERTS_API_TOKEN", "").strip()
        self.upstream_api_url: str = os.getenv(
            "UPSTREAM_API_URL", "https://api.alerts.in.ua/v1/alerts/active.json"
        ).strip()

        # Інтервал опитування: мінімум 10 секунд для захисту від блокування API
        try:
            interval = int(os.getenv("POLL_INTERVAL_SECONDS", "15"))
            self.poll_interval_seconds: int = max(10, interval)
        except ValueError:
            self.poll_interval_seconds: int = 15

        self.server_host: str = os.getenv("SERVER_HOST", "0.0.0.0").strip()

        try:
            self.server_port: int = int(os.getenv("SERVER_PORT", "8080"))
        except ValueError:
            self.server_port: int = 8080

        self.log_level: str = os.getenv("LOG_LEVEL", "INFO").strip().upper()

    def validate(self) -> list[str]:
        """Перевіряє коректність обов'язкових параметрів."""
        warnings: list[str] = []
        if not self.alerts_api_token:
            warnings.append(
                "ALERTS_API_TOKEN не задано. Сервер не зможе отримувати дані з api.alerts.in.ua."
            )
        if self.poll_interval_seconds < 10:
            warnings.append(
                "POLL_INTERVAL_SECONDS менше 10 секунд. Встановлено значення 10 для дотримання лімітів."
            )
        return warnings


settings = Settings()
