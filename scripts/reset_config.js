const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || (
  process.platform === 'darwin'
    ? path.join(process.env.HOME, 'Library', 'Application Support')
    : path.join(process.env.HOME, '.config')
);

const configPath = path.join(appData, 'alert-desktop', 'config.json');

try {
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    console.log(`Налаштування успішно видалено: ${configPath}`);
  } else {
    console.log(`Файл налаштувань не знайдено: ${configPath}`);
  }
} catch (err) {
  console.error(`Помилка під час видалення налаштувань: ${err.message}`);
  process.exit(1);
}
