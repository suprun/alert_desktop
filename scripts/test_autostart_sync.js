// scripts/test_autostart_sync.js
// Тестування двосторонньої синхронізації між реєстром Windows та конфігурацією застосунку

const assert = require('assert');
const autostart = require('../src/main/autostart');
const config = require('../src/main/config');

console.log('🧪 Запуск тесту синхронізації автозапуску (AutoStart Sync)...');

const initialSystemState = autostart.isEnabled();
const initialConfigState = config.get('autoStart');

try {
  // Тест 1: Перевірка узгодженості get('autoStart') та getAll().autoStart із системою
  const systemState = autostart.isEnabled();
  const configAutoStart = config.get('autoStart');
  const allConfig = config.getAll();

  assert.strictEqual(configAutoStart, systemState, 'config.get("autoStart") має збігатися з autostart.isEnabled()');
  assert.strictEqual(allConfig.autoStart, systemState, 'config.getAll().autoStart має збігатися з autostart.isEnabled()');
  console.log('✔ Тест 1 пройдено: config.get("autoStart") та getAll() динамічно синхронізовані із системою');

  // Тест 2: saveConfig({ autoStart: true }) умикає автозапуск у реєстрі
  config.saveConfig({ autoStart: true });
  assert.strictEqual(autostart.isEnabled(), true, 'autostart.isEnabled() має бути true після saveConfig(autoStart: true)');
  assert.strictEqual(config.get('autoStart'), true, 'config.get("autoStart") має бути true');
  console.log('✔ Тест 2 пройдено: збереження autoStart: true активує системний автозапуск');

  // Тест 3: saveConfig({ autoStart: false }) вимикає автозапуск у реєстрі
  config.saveConfig({ autoStart: false });
  assert.strictEqual(autostart.isEnabled(), false, 'autostart.isEnabled() має бути false після saveConfig(autoStart: false)');
  assert.strictEqual(config.get('autoStart'), false, 'config.get("autoStart") має бути false');
  console.log('✔ Тест 3 пройдено: збереження autoStart: false вимикає системний автозапуск');

  // Тест 4: Зміна в системі безпосередньо через autostart підхоплюється config.get('autoStart')
  autostart.setAutoStart(true);
  assert.strictEqual(config.get('autoStart'), true, 'config.get("autoStart") підхоплює зовнішню зміну в true');
  autostart.setAutoStart(false);
  assert.strictEqual(config.get('autoStart'), false, 'config.get("autoStart") підхоплює зовнішню зміну в false');
  console.log('✔ Тест 4 пройдено: зовнішні зміни в системі негайно відображаються в конфігурації');

} finally {
  // Відновлення початкового стану системи та конфігурації
  autostart.setAutoStart(initialSystemState);
  config.saveConfig({ autoStart: initialConfigState });
  console.log(`Початковий стан відновлено (autoStart: ${initialSystemState})`);

  // Очищення локального config.json, якщо тест виконувався без Electron app
  const fs = require('fs');
  const path = require('path');
  const localConfigPath = path.join(process.cwd(), 'config.json');
  if (config.configPath === localConfigPath && fs.existsSync(localConfigPath)) {
    try {
      fs.unlinkSync(localConfigPath);
    } catch (_) {}
  }
}

console.log('🎉 Усі тести синхронізації автозапуску успішно пройдено!');
