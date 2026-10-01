#!/usr/bin/env bash
# scripts/install.sh — Універсальний інсталятор AlertDesktop для Linux (x86_64 / arm64)
# Встановлення однією командою:
#   curl -fsSL https://raw.githubusercontent.com/suprun/alert_desktop/main/scripts/install.sh | bash

set -e

REPO="suprun/alert_desktop"
APP_NAME="AlertDesktop"
EXEC_NAME="alert-desktop"

echo "=== Встановлення AlertDesktop для Linux ==="

# 1. Визначення архітектури процесора
RAW_ARCH=$(uname -m)
case "$RAW_ARCH" in
  x86_64|amd64)
    TARGET_ARCH="x86_64"
    ARCH_KEY="x64"
    ;;
  aarch64|arm64|armv8*)
    TARGET_ARCH="arm64"
    ARCH_KEY="arm64"
    ;;
  *)
    echo "❌ Помилка: Архітектура процесора '$RAW_ARCH' наразі не підтримується."
    exit 1
    ;;
esac

echo "✓ Виявлено архітектуру процесора: $TARGET_ARCH ($RAW_ARCH)"

# 2. Отримання інформації про останній реліз із GitHub API
echo "✓ Пошук останнього релізу на GitHub (${REPO})..."
RELEASE_JSON=$(curl -sSL -H "Accept: application/vnd.github.v3+json" "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null || true)

DOWNLOAD_URL=""
if [ -n "$RELEASE_JSON" ] && ! echo "$RELEASE_JSON" | grep -q "Not Found"; then
  # Спочатку шукаємо по exact target_arch або arch_key
  DOWNLOAD_URL=$(echo "$RELEASE_JSON" | grep -o 'https://[^"]*\.AppImage' | grep -iE "(${TARGET_ARCH}|${ARCH_KEY})" | head -n 1 || true)
  if [ -z "$DOWNLOAD_URL" ]; then
    DOWNLOAD_URL=$(echo "$RELEASE_JSON" | grep -o 'https://[^"]*\.AppImage' | head -n 1 || true)
  fi
fi

# Fallback-посилання за замовчуванням
if [ -z "$DOWNLOAD_URL" ]; then
  echo "! Увага: Не вдалося отримати пряме посилання через API, використовуємо стандартний шаблон URL..."
  DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${APP_NAME}-${ARCH_KEY}.AppImage"
fi

echo "✓ Посилання для завантаження: $DOWNLOAD_URL"

# 3. Підготовка локальних директорій користувача
BIN_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/512x512/apps"

mkdir -p "$BIN_DIR" "$DESKTOP_DIR" "$ICON_DIR"

APP_PATH="${BIN_DIR}/${EXEC_NAME}"

echo "✓ Завантаження AppImage..."
if curl -L --progress-bar "$DOWNLOAD_URL" -o "$APP_PATH"; then
  chmod +x "$APP_PATH"
  echo "✓ Файл програми успішно збережено: $APP_PATH"
else
  echo "❌ Помилка завантаження файлу за посиланням $DOWNLOAD_URL"
  exit 1
fi

# 4. Завантаження та встановлення іконки
ICON_PATH="${ICON_DIR}/${EXEC_NAME}.png"
ICON_URL="https://raw.githubusercontent.com/${REPO}/main/assets/icons/app-icon.png"
echo "✓ Встановлення піктограми застосунку..."
curl -sSL "$ICON_URL" -o "$ICON_PATH" 2>/dev/null || true

# 5. Створення .desktop ярлика
DESKTOP_FILE="${DESKTOP_DIR}/${EXEC_NAME}.desktop"
cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Name=AlertDesktop
GenericName=Повітряні тривоги
Comment=Десктопний клієнт для моніторингу повітряних тривог на базі Electron
Exec=${APP_PATH} --hidden %U
Icon=${EXEC_NAME}
Terminal=false
Type=Application
Categories=Utility;Network;Monitor;
StartupWMClass=AlertDesktop
EOF

chmod +x "$DESKTOP_FILE"
echo "✓ Системний ярлик створено: $DESKTOP_FILE"

# 6. Оновлення системної бази ярликів стільниці
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo ""
echo "==========================================================="
echo "🎉 AlertDesktop успішно встановлено!"
echo "   Запуск: ${APP_PATH}"
echo "   Також доступно в системному меню застосунків вашого DE."
echo "==========================================================="
