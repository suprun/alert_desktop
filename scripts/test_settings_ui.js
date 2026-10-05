const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Запуск тестів інтерфейсу вікна налаштувань (Settings UI)...');

const settingsHtmlPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.html');
const settingsHtml = fs.readFileSync(settingsHtmlPath, 'utf8');

// Тест 1: Перевірка наявності посилань на репозиторій, ліцензію та автора
{
  assert.ok(
    settingsHtml.includes('https://github.com/suprun/alert_desktop'),
    'settings.html має містити посилання на репозиторій https://github.com/suprun/alert_desktop'
  );
  assert.ok(
    settingsHtml.includes('https://github.com/suprun/alert_desktop/blob/main/LICENSE'),
    'settings.html має містити посилання на ліцензію Apache-2.0'
  );
  assert.ok(
    settingsHtml.includes('https://github.com/suprun'),
    'settings.html має містити посилання на автора https://github.com/suprun'
  );
  console.log('✔ Тест 1 пройдено (посилання на репозиторій, ліцензію та автора присутні)');
}

// Тест 2: Перевірка перейменування блоку на "Параметри для розробників"
{
  assert.ok(
    settingsHtml.includes('Параметри для розробників'),
    'settings.html має містити назву "Параметри для розробників"'
  );
  assert.ok(
    !settingsHtml.includes('Налаштування джерела даних (API)'),
    'Стара назва "Налаштування джерела даних (API)" повинна бути замінена'
  );
  console.log('✔ Тест 2 пройдено (блок коректно перейменовано на "Параметри для розробників")');
}

// Тест 3: Перевірка розташування блоку розробників в кінці сторінки після "Про застосунок"
{
  const aboutIndex = settingsHtml.indexOf('class="settings-group about-group"');
  const devIndex = settingsHtml.indexOf('class="settings-group dev-settings-group"');

  assert.ok(aboutIndex !== -1, 'Секція about-group має бути знайдена');
  assert.ok(devIndex !== -1, 'Секція dev-settings-group має бути знайдена');
  assert.ok(
    devIndex > aboutIndex,
    'Блок "Параметри для розробників" (dev-settings-group) має розташовуватися ПІСЛЯ блоку "Про застосунок" (about-group)'
  );
  console.log('✔ Тест 3 пройдено (блок розробника розташовано в кінці сторінки після блоку "Про застосунок")');
}

// Тест 4: Перевірка атрибуту readonly для поля адреси API
{
  assert.ok(
    settingsHtml.includes('id="inputServerUrl" class="form-input" readonly'),
    'Поле inputServerUrl має мати атрибут readonly'
  );
  console.log('✔ Тест 4 пройдено (поле inputServerUrl має атрибут readonly)');
}

// Тест 5: Перевірка відсутності емодзі в settings.html
{
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert.ok(
    !emojiRegex.test(settingsHtml),
    'В settings.html суворо заборонені емодзі — дозволені лише векторні SVG'
  );
  console.log('✔ Тест 5 пройдено (в settings.html повністю відсутні емодзі, використовуються векторні SVG)');
}

// Тест 6: Перевірка наявності notifyReady в preload-settings.js
{
  const preloadPath = path.join(__dirname, '..', 'src', 'preload', 'preload-settings.js');
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  assert.ok(
    preloadContent.includes('notifyReady'),
    'preload-settings.js має експортувати метод notifyReady'
  );
  assert.ok(
    preloadContent.includes('settings-window-ready'),
    'preload-settings.js має надсилати подію settings-window-ready'
  );
  console.log('✔ Тест 6 пройдено (preload-settings.js містить notifyReady для захисту від мерехтіння)');
}

// Тест 7: Перевірка іконок зовнішнього переходу (external-link) на 3 кнопках About
{
  const occurrences = (settingsHtml.match(/class="external-link-icon"/g) || []).length;
  assert.ok(
    occurrences >= 3,
    `В блоці About на кнопках Репозиторій, Ліцензія, Автор мають бути значки зовнішнього переходу (знайдено: ${occurrences})`
  );
  console.log('✔ Тест 7 пройдено (кнопки Репозиторій, Ліцензія, Автор містять векторні SVG значки зовнішнього переходу)');
}

// Тест 8: Перевірка відсутності подвійної плашки (плашка в плашці) у блоці About
{
  const settingsCssPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.css');
  const settingsCss = fs.readFileSync(settingsCssPath, 'utf8');
  assert.ok(
    settingsCss.includes('border: none;'),
    'settings.css має задавати border: none для .about-card щоб усунути подвійну рамку'
  );
  assert.ok(
    settingsCss.includes('background: transparent;'),
    'settings.css має задавати background: transparent для .about-card'
  );
  console.log('✔ Тест 8 пройдено (блок About витягнуто із внутрішньої плашки в плашці — border: none та background: transparent)');
}

// Тест 9: Перевірка повернення фокусу на головне вікно при закритті налаштувань
{
  const settingsWindowJsPath = path.join(__dirname, '..', 'src', 'main', 'settings-window.js');
  const settingsWindowJs = fs.readFileSync(settingsWindowJsPath, 'utf8');
  assert.ok(
    settingsWindowJs.includes('parentWindow.focus()'),
    'settings-window.js повинен викликати parentWindow.focus() при закритті вікна'
  );
  console.log('✔ Тест 9 пройдено (фокус гарантовано повертається на головне вікно при закритті налаштувань)');
}

console.log('🎉 Усі тести інтерфейсу налаштувань успішно пройдено!');
