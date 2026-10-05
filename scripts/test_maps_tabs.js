const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Запуск тестів панелі вкладок та вбудованої векторної карти...');

// 1. Перевірка конфігурації
const config = require('../src/main/config');
const initialTab = config.get('activeMapTab');
assert.strictEqual(typeof initialTab, 'string', 'activeMapTab має бути рядком');
console.log('✔ Тест 1 пройдено (activeMapTab присутній у конфігурації)');

// 2. Перевірка геоданих карти
const mapData = require('../src/renderer/main/map-data');
assert.ok(mapData.MAP_VIEWBOX, 'MAP_VIEWBOX має бути визначений');
assert.ok(Array.isArray(mapData.MAP_REGIONS), 'MAP_REGIONS має бути масивом');
assert.ok(mapData.MAP_REGIONS.length >= 136, `Очікується мінімум 136 регіонів, отримано: ${mapData.MAP_REGIONS.length}`);
assert.ok(Array.isArray(mapData.MAP_OBLAST_BORDERS), 'MAP_OBLAST_BORDERS має бути масивом');
assert.ok(mapData.MAP_OBLAST_BORDERS.length >= 24, `Очікується мінімум 24 межі областей, отримано: ${mapData.MAP_OBLAST_BORDERS.length}`);
console.log(`✔ Тест 2 пройдено (геодані карти валідні: ${mapData.MAP_REGIONS.length} районів/регіонів, ${mapData.MAP_OBLAST_BORDERS.length} меж областей)`);

// 3. Перевірка наявності ключових міст та регіонів
const uids = new Set(mapData.MAP_REGIONS.map(r => String(r.uid)));
assert.ok(uids.has('31'), 'м. Київ (31) має бути на карті');
assert.ok(uids.has('29'), 'АР Крим (29) має бути на карті');
assert.ok(uids.has('30'), 'м. Севастополь (30) має бути на карті');
console.log('✔ Тест 3 пройдено (Київ, Крим та Севастополь присутні на карті)');

// 4. Перевірка повної відсутності емодзі у файлах інтерфейсу
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'main', 'index.html'), 'utf8');
const rendererJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'main', 'renderer.js'), 'utf8');

// Regex для детекції емодзі
const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/u;

assert.ok(!emojiRegex.test(indexHtml), 'В index.html не повинно бути емодзі');
assert.ok(!emojiRegex.test(rendererJs), 'В renderer.js не повинно бути емодзі');
console.log('✔ Тест 4 пройдено (в інтерфейсі повністю відсутні емодзі — виключно векторні SVG)');

// 5. Перевірка наявності всіх 4 вкладок у розмітці
const requiredTabs = ['internal', 'alertsinua', 'ukrainealarm', 'neptun'];
for (const tab of requiredTabs) {
  assert.ok(indexHtml.includes(`data-tab="${tab}"`), `Вкладка ${tab} має бути присутня в index.html`);
}
console.log('✔ Тест 5 пройдено (усі 4 вкладки present: internal, alertsinua, ukrainealarm, neptun)');

// 6. Перевірка методів WindowManager
const windowManager = require('../src/main/window');
assert.strictEqual(typeof windowManager.switchMapTab, 'function');
assert.strictEqual(typeof windowManager.getActiveMapTab, 'function');
assert.strictEqual(typeof windowManager.broadcastThemeToViews, 'function');

const res = windowManager.switchMapTab('internal');
assert.strictEqual(res.success, true);
assert.strictEqual(windowManager.getActiveMapTab(), 'internal');
console.log('✔ Тест 6 пройдено (методи WindowManager перемикання вкладок та тем працюють)');

// 7. Перевірка наявності верхньої кнопки теми та повної відсутності обертання при наведенні
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'main', 'style.css'), 'utf8');
assert.ok(indexHtml.includes('id="btnThemeToggle"'), 'Кнопка btnThemeToggle має бути в index.html');
assert.ok(!styleCss.includes('rotate(15deg)'), 'У style.css не повинно бути анімації обертання rotate(15deg)');
assert.ok(!/:hover[^{]*\{[^}]*rotate/i.test(styleCss), 'У style.css не повинно бути жодної анімації обертання кнопки при наведенні (:hover)');
console.log('✔ Тест 7 пройдено (btnThemeToggle присутній у шапці, обертання при hover відсутнє)');

// 8. Перевірка об'єднаної панелі статусу та легенди
assert.ok(indexHtml.includes('internal-map-status-bar'), 'Смуга internal-map-status-bar має бути в index.html');
assert.ok(indexHtml.includes('internal-map-legend'), 'Легенда має бути в index.html');
console.log('✔ Тест 8 пройдено (об\'єднана смуга internal-map-status-bar з легендою валідна)');

// 9. Перевірка висувної панелі історії адмінодиниці
assert.ok(indexHtml.includes('id="regionHistoryDrawer"'), 'Панель regionHistoryDrawer має бути в index.html');
assert.ok(indexHtml.includes('id="btnHistoryClose"'), 'Кнопка btnHistoryClose має бути в index.html');
console.log('✔ Тест 9 пройдено (висувна панель деталей та історії regionHistoryDrawer присутня)');

// 10. Перевірка однакового розміру кнопки перемикання теми та кнопки налаштувань
assert.ok(styleCss.includes('width: 32px;'), '.btn-icon має мати width: 32px');
assert.ok(styleCss.includes('height: 32px;'), '.btn-icon має мати height: 32px');
assert.ok(indexHtml.includes('id="btnThemeToggle" class="btn-icon"'), 'btnThemeToggle має мати клас .btn-icon');
assert.ok(indexHtml.includes('id="btnSettings" class="btn-icon"'), 'btnSettings має мати клас .btn-icon');
console.log('✔ Тест 10 пройдено (кнопка перемикання теми та кнопка налаштувань мають однаковий розмір 32x32px)');

// 11. Перевірка посилань на політики конфіденційності сервісів мап у налаштуваннях
const settingsHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.html'), 'utf8');
assert.ok(settingsHtml.includes('alerts.in.ua/privacy-policy'), 'settings.html має містити посилання на політику Alerts.in.ua');
assert.ok(settingsHtml.includes('map.ukrainealarm.com/confidentiality'), 'settings.html має містити посилання на політику UkraineAlarm');
assert.ok(settingsHtml.includes('neptun.in.ua'), 'settings.html має містити посилання на Neptun');
assert.ok(!emojiRegex.test(settingsHtml), 'В settings.html не повинно бути емодзі');
console.log('✔ Тест 11 пройдено (посилання на політики сервісів мап присутні в налаштуваннях без емодзі)');

// 12. Перевірка плаваючої пігулки та приховування меню/реклами UkraineAlarm у preload-map.js
const preloadMapJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'preload-map.js'), 'utf8');
assert.ok(preloadMapJs.includes('app-map-external-pill'), 'preload-map.js має містити віджет app-map-external-pill');
assert.ok(preloadMapJs.includes('.bottom-banner'), 'preload-map.js має приховувати .bottom-banner');
assert.ok(preloadMapJs.includes('.header, .header-wrapper'), 'preload-map.js має приховувати .header UkraineAlarm');
assert.ok(!emojiRegex.test(preloadMapJs), 'В preload-map.js не повинно бути емодзі');
console.log('✔ Тест 12 пройдено (плаваюча пігулка та приховування меню/реклами UkraineAlarm валідні)');

console.log('🎉 Усі тести панелі вкладок, тем та векторної карти успішно виконано!');
