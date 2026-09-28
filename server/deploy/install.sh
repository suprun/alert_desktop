#!/usr/bin/env bash
# =====================================================================
# Скрипт автоматичного встановлення та налаштування проксі-сервера на Ubuntu
# =====================================================================

set -e

INSTALL_DIR="/opt/alert_proxy"
SERVICE_NAME="alert-proxy"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Перевірка прав root
if [ "$EUID" -ne 0 ]; then
  echo "Помилка: Запустіть цей скрипт з правами root (наприклад: sudo bash install.sh)"
  exit 1
fi

echo "=========================================================="
echo " Встановлення Alerts.in.ua Proxy Server на Ubuntu"
echo "=========================================================="

# 1. Оновлення та встановлення системних залежностей
echo "[1/6] Перевірка системних пакетів (python3, venv, pip, curl)..."
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip curl

# 2. Створення робочої директорії
echo "[2/6] Створення директорії ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"

# Визначення шляху до папки server звідки запускається скрипт
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_SRC="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Копіювання файлів проєкту
cp "${SERVER_SRC}/requirements.txt" "${INSTALL_DIR}/"
cp "${SERVER_SRC}/config.py" "${INSTALL_DIR}/"
cp "${SERVER_SRC}/proxy_service.py" "${INSTALL_DIR}/"
cp "${SERVER_SRC}/main.py" "${INSTALL_DIR}/"

if [ ! -f "${INSTALL_DIR}/.env" ]; then
  if [ -f "${SERVER_SRC}/.env" ]; then
    cp "${SERVER_SRC}/.env" "${INSTALL_DIR}/.env"
  elif [ -f "${SERVER_SRC}/.env.example" ]; then
    cp "${SERVER_SRC}/.env.example" "${INSTALL_DIR}/.env"
  fi
fi

# 3. Створення віртуального середовища Python
echo "[3/6] Налаштування віртуального середовища venv..."
if [ ! -d "${INSTALL_DIR}/venv" ]; then
  python3 -m venv "${INSTALL_DIR}/venv"
fi

"${INSTALL_DIR}/venv/bin/pip" install --upgrade pip -q
"${INSTALL_DIR}/venv/bin/pip" install -r "${INSTALL_DIR}/requirements.txt" -q

# 4. Налаштування токена у .env
echo "[4/6] Перевірка конфігурації .env..."
if grep -q "your_token_here" "${INSTALL_DIR}/.env" 2>/dev/null || ! grep -q "ALERTS_API_TOKEN" "${INSTALL_DIR}/.env" 2>/dev/null; then
  echo ""
  echo "Введіть ваш API-токен від devs.alerts.in.ua (або натисніть Enter, щоб налаштувати пізніше у ${INSTALL_DIR}/.env):"
  read -r USER_TOKEN
  if [ -n "$USER_TOKEN" ]; then
    sed -i "s/ALERTS_API_TOKEN=.*/ALERTS_API_TOKEN=${USER_TOKEN}/" "${INSTALL_DIR}/.env"
    echo "Токен успішно збережено."
  else
    echo "Увага: Не забудьте вказати ALERTS_API_TOKEN у файлі ${INSTALL_DIR}/.env пізніше!"
  fi
fi

chmod 600 "${INSTALL_DIR}/.env"

# Надання прав користувачу www-data
chown -R www-data:www-data "${INSTALL_DIR}"

# 5. Встановлення служби systemd
echo "[5/6] Реєстрація служби systemd (${SERVICE_NAME})..."
cp "${SERVER_SRC}/systemd/alert-proxy.service" "${SERVICE_FILE}"

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

# 6. Перевірка статусу
echo "[6/6] Очікування старту сервісу..."
sleep 2

LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=========================================================="
echo " Встановлення успішно завершено!"
echo "=========================================================="
echo "Статус служби:"
systemctl status "${SERVICE_NAME}" --no-pager -n 5 || true

echo ""
echo "Корисні команди для керування на Ubuntu:"
echo " - Перевірити статус:   sudo systemctl status ${SERVICE_NAME}"
echo " - Переглянути логи:     sudo journalctl -u ${SERVICE_NAME} -f"
echo " - Перезапустити:        sudo systemctl restart ${SERVICE_NAME}"
echo " - Редагувати .env:      sudo nano ${INSTALL_DIR}/.env"
echo ""
echo "Налаштування клієнта alert_desktop:"
echo " У вікні 'Налаштування' додатку вкажіть URL:"
echo "   http://${LOCAL_IP}:8080/v1/alerts/active.json"
echo " (або http://127.0.0.1:8080/v1/alerts/active.json якщо локально)"
echo "=========================================================="
