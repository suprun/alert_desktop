# UkraineAlarm Webhook & WebSocket Gateway (Ubuntu / Linux)

Автономний шлюз для прийому офіційних Webhook від API [UkraineAlarm](https://api.ukrainealarm.com/) та миттєвої трансляції оновлень клієнтським десктопним додаткам `alert_desktop` через WebSocket (0 секунд затримки).

---

## Архітектура та переваги шлюзу

1. **Миттєві сповіщення (Push 0 сек):** UkraineAlarm надсилає HTTP POST на `/api/v3/webhook` у момент увімкнення або відбою тривоги. Шлюз моментально передає подію через відкриті канали WebSocket всім клієнтам `alert_desktop`.
2. **Автоматична реєстрація Webhook:** При старті сервер автоматично підписується в API `api.ukrainealarm.com` (`POST /api/v3/webhook`) на свій публічний URL.
3. **Безпека ключа:** Токен API зберігається виключно на VPS-сервері. Десктопні клієнти користувачів не потребують введення секретного токена.
4. **Ієрархія та нормалізація:** Сервер завантажує довідник регіонів (`GET /api/v3/regions`), ідентифікує тип (область, район, громада) та транслює повністю структуровані об'єкти.
5. **Стійкість та Fallback:** Поряд із WebSocket працює REST ендпоінт `GET /v1/alerts/active.json`. При розриві зв'язку або нестабільному інтернеті клієнт автоматично використовує REST опитування та відновлює сокет.
6. **Періодична автозвірка:** Кожні 5 хвилин шлюз звіряє кеш із `GET /api/v3/alerts` для захисту від пропущених пакетів при мережевих збоях.

---

## Системні вимоги

- **ОС:** Ubuntu 20.04 LTS / 22.04 LTS / 24.04 LTS (або Debian 11/12).
- **Python:** 3.10 або новіша версія.
- **Мережа:** Публічна IP-адреса, відкритий порт `8080` (для Webhook від UkraineAlarm та WebSocket клієнтів).

---

## Швидке розгортання через SSH (з комп'ютера розробника)

У репозиторії є автоматичний скрипт розгортання:
```bash
python scripts/deploy_remote.py
```
Скрипт зчитує налаштування з `server/.env`, підключається по SSH, оновлює код, встановлює залежності, перезапускає службу `alert-proxy` та проводить верифікацію ендпоінтів.

---

## Доступні HTTP та WebSocket ендпоінти

| Метод | Ендпоінт | Опис |
|---|---|---|
| `POST` | `/api/v3/webhook` | **Прийом Webhook від UkraineAlarm:** обробка подій початку (`Activate`) та завершення (`DEACTIVATE`) тривог. |
| `WS` | `/ws` | **WebSocket Gateway:** двосторонній канал зв'язку для додатків `alert_desktop` з миттєвою доставкою оновлень. |
| `GET` | `/v1/alerts/active.json` | **REST Fallback:** кешований список активних тривог для зворотної сумісності. |
| `GET` | `/health` | Діагностика: uptime, статус реєстрації вебхука, кількість сокетів, активні тривоги. |
| `POST` | `/refresh` | Примусова повна синхронізація тривог з `api.ukrainealarm.com`. |
| `POST` | `/webhook/register` | Примусова повторна реєстрація адреси Webhook в UkraineAlarm API. |

---

## Налаштування оточення (.env)

```env
# Обов'язково: токен API від api.ukrainealarm.com
ALERTS_API_TOKEN=ваш_токен

# Upstream URL для взаємодії з UkraineAlarm
UPSTREAM_API_URL=https://api.ukrainealarm.com

# Публічний URL для прийому Webhook
PUBLIC_WEBHOOK_URL=http://<IP_СЕРВЕРА>:8080/api/v3/webhook

# Інтервал фонової планової звірки (секунди)
RESYNC_INTERVAL_SECONDS=300

# Хост та порт
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
LOG_LEVEL=INFO
```

---

## Команди керування службою на Ubuntu

- **Статус:** `sudo systemctl status alert-proxy`
- **Перезапуск:** `sudo systemctl restart alert-proxy`
- **Зупинка:** `sudo systemctl stop alert-proxy`
- **Живі логи:** `sudo journalctl -u alert-proxy -f`
