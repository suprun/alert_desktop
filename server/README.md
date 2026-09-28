# Alerts.in.ua Proxy Server (Ubuntu / Linux)

Автономний кешуючий проксі-сервер та ретранслятор для API повітряних тривог України ([alerts.in.ua](https://alerts.in.ua/)).
Призначений для централізованого опитування офіційного API з єдиним токеном та роздачі актуального стану тривог клієнтським додаткам `alert_desktop` або веб-клієнтам.

---

## Переваги використання проксі

1. **Захист від блокування (Rate Limiting):** Офіційне API має суворі ліміти на частоту запитів. Проксі виконує лише 1 запит раз на 15 секунд до `api.alerts.in.ua`, обслуговуючи необмежену кількість клієнтів.
2. **Безпека ключа:** API-токен зберігається виключно на вашому сервері. Додатки `alert_desktop` отримують дані безпосередньо від проксі без необхідності вказувати токен на кожному комп'ютері.
3. **Миттєва відповідь:** Клієнти отримують дані з оперативної пам'яті (відповідь за ~1-2 мс).
4. **Стійкість до збоїв:** У разі тимчасової недоступності або таймаутів `alerts.in.ua` проксі повертає збережений останній валідний кеш із прапорцем застарілості `is_stale: true`, захищаючи додатки від аварійних помилок.

---

## Системні вимоги

- **ОС:** Ubuntu 20.04 LTS / 22.04 LTS / 24.04 LTS (або Debian 11/12).
- **Python:** 3.10 або новіша версія.
- **Мережа:** Доступ до інтернету для запитів до `api.alerts.in.ua`, відкритий вхідний порт (за замовчуванням `8080`).

---

## Швидке встановлення на Ubuntu (Автоматично)

1. Скопіюйте папку `server/` на ваш сервер Ubuntu (наприклад, у домашній каталог або `/tmp`):
   ```bash
   scp -r server/ user@your-server-ip:/tmp/server
   ```
2. Підключіться до сервера по SSH:
   ```bash
   ssh user@your-server-ip
   ```
3. Запустіть скрипт автоматичного встановлення від імені root:
   ```bash
   sudo bash /tmp/server/deploy/install.sh
   ```
Скрипт автоматично:
- встановить системні пакети `python3-venv`, `python3-pip`, `curl`;
- створить директорію `/opt/alert_proxy` та віртуальне оточення `venv`;
- встановить залежності `fastapi`, `uvicorn`, `httpx`, `python-dotenv`;
- запропонує ввести ваш `ALERTS_API_TOKEN`;
- зареєструє та запустить системну службу `alert-proxy.service` через `systemd`.

---

## Ручне встановлення на Ubuntu

Якщо ви бажаєте розгорнути сервіс вручну:

1. **Встановіть залежності ОС:**
   ```bash
   sudo apt update
   sudo apt install -y python3 python3-venv python3-pip curl
   ```

2. **Підготуйте директорію:**
   ```bash
   sudo mkdir -p /opt/alert_proxy
   sudo cp requirements.txt config.py proxy_service.py main.py .env.example /opt/alert_proxy/
   cd /opt/alert_proxy
   ```

3. **Створіть віртуальне оточення та встановіть бібліотеки:**
   ```bash
   sudo python3 -m venv venv
   sudo ./venv/bin/pip install --upgrade pip
   sudo ./venv/bin/pip install -r requirements.txt
   ```

4. **Налаштуйте файл `.env`:**
   ```bash
   sudo cp .env.example .env
   sudo nano .env
   ```
   Вкажіть ваш API-токен:
   ```env
   ALERTS_API_TOKEN=ваш_токен_тут
   UPSTREAM_API_URL=https://api.alerts.in.ua/v1/alerts/active.json
   POLL_INTERVAL_SECONDS=15
   SERVER_HOST=0.0.0.0
   SERVER_PORT=8080
   LOG_LEVEL=INFO
   ```
   Захистіть права доступу:
   ```bash
   sudo chmod 600 .env
   sudo chown -R www-data:www-data /opt/alert_proxy
   ```

5. **Налаштуйте systemd службу:**
   ```bash
   sudo cp systemd/alert-proxy.service /etc/systemd/system/alert-proxy.service
   sudo systemctl daemon-reload
   sudo systemctl enable alert-proxy
   sudo systemctl start alert-proxy
   ```

6. **Перевірте статус:**
   ```bash
   sudo systemctl status alert-proxy
   curl http://127.0.0.1:8080/health
   ```

---

## Команди керування службою на Ubuntu

- **Статус:** `sudo systemctl status alert-proxy`
- **Перезапуск:** `sudo systemctl restart alert-proxy`
- **Зупинка:** `sudo systemctl stop alert-proxy`
- **Перегляд живих логів:** `sudo journalctl -u alert-proxy -f`

---

## Доступні HTTP ендпоінти

| Метод | Ендпоінт | Опис |
|---|---|---|
| `GET` | `/v1/alerts/active.json` | **Основний ендпоінт:** повертає кешований масив активних тривог (сумісний з `alerts.in.ua` та `alert_desktop`). |
| `GET` | `/alerts` | Скорочений псевдонім основного ендпоінта. |
| `GET` | `/health` (або `/status`) | Діагностика працездатності: uptime, кількість тривог, статус upstream, час останнього опитування. |
| `POST`/`GET` | `/refresh` | Примусове позачергове опитування `api.alerts.in.ua`. |
| `GET` | `/` | Загальна інформація про сервіс та стан кешу. |
| `GET` | `/docs` | Інтерактивна OpenAPI Swagger-документація. |

---

## Підключення клієнта `alert_desktop`

1. Запустіть додаток `alert_desktop`.
2. Відкрийте вікно **Налаштування** (кнопка шестерні у шапці або правий клік у треї -> "Налаштування").
3. У блоці **"Зв'язок з сервером API"**:
   - У полі **"URL сервера або ретранслятора"** введіть адресу проксі:
     ```text
     http://<IP_ВАШОГО_СЕРВЕРА>:8080/v1/alerts/active.json
     ```
   - Поле **"API Ключ"** залиште **порожнім** (проксі передає свій токен централізовано).
4. Натисніть **"Зберегти налаштування"**.
5. Додаток почне отримувати актуальний статус тривог від вашого власного Ubuntu-проксі!
