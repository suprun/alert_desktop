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
assert.ok(uids.has('16'), 'Луганська область (16) має бути на карті');
console.log('✔ Тест 3 пройдено (Київ, Крим, Севастополь та Луганська область присутні на карті)');

// 4. Перевірка повної відсутності емодзі у файлах інтерфейсу
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'main', 'index.html'), 'utf8');
const rendererJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'main', 'renderer.js'), 'utf8');

// Regex для детекції емодзі
const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/u;

assert.ok(!emojiRegex.test(indexHtml), 'В index.html не повинно бути емодзі');
assert.ok(!emojiRegex.test(rendererJs), 'В renderer.js не повинно бути емодзі');
console.log('✔ Тест 4 пройдено (в інтерфейсі повністю відсутні емодзі — виключно векторні SVG)');

// 5. Перевірка наявності всіх 4 вкладок у розмітці та векторизованих favicons сайтів
const requiredTabs = ['internal', 'alertsinua', 'ukrainealarm', 'neptun'];
for (const tab of requiredTabs) {
  assert.ok(indexHtml.includes(`data-tab="${tab}"`), `Вкладка ${tab} має бути присутня в index.html`);
}
// Векторизований маячок Alerts.in.ua (промені, купол, основа)
assert.ok(indexHtml.includes('rect x="5" y="17" width="14" height="4"'), 'Вкладка alertsinua має містити векторизований маячок Alerts.in.ua');
// Детальний векторизований силует карти України UkraineAlarm у колі
assert.ok(indexHtml.includes('circle cx="12" cy="12" r="9.5"'), 'Вкладка ukrainealarm має містити коло-бейдж');
assert.ok(indexHtml.includes('M19.97 10.85L19.86 10.24'), 'Вкладка ukrainealarm має містити детальний векторизований силует карти України');
// Векторизований тризуб Neptun без щита зі збільшеним розміром
assert.ok(indexHtml.includes('M12 2.5L13.7 5.8'), 'Вкладка neptun має містити векторизований тризуб');
assert.ok(!indexHtml.includes('fill-rule="evenodd"'), 'Вкладка neptun не повинна містити контур щита');

// Перевірка наявності файлів іконок вкладок у assets/icons/tabs/
const tabsAssetDir = path.join(__dirname, '..', 'assets', 'icons', 'tabs');
for (const tab of requiredTabs) {
  const filePath = path.join(tabsAssetDir, `tab-${tab}.svg`);
  assert.ok(fs.existsSync(filePath), `Файл ${filePath} має існувати в assets/icons/tabs/`);
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.length > 50, `Файл ${filePath} не повинен бути порожнім`);
}
console.log('✔ Тест 5 пройдено (усі 4 вкладки present з векторизованими favicons сайтів та файлами в assets/icons/tabs)');

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

// 12. Перевірка плаваючої пігулки, адаптації її теми та приховування меню/реклами UkraineAlarm у preload-map.js
const preloadMapJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'preload-map.js'), 'utf8');
assert.ok(preloadMapJs.includes('app-map-external-pill'), 'preload-map.js має містити віджет app-map-external-pill');
assert.ok(preloadMapJs.includes('.bottom-banner'), 'preload-map.js має приховувати .bottom-banner');
assert.ok(preloadMapJs.includes('.header, .header-wrapper'), 'preload-map.js має приховувати .header UkraineAlarm');
assert.ok(preloadMapJs.includes('pill-light') && preloadMapJs.includes('pill-dark'), 'preload-map.js має підтримувати стилі світлої та темної тем для пігулки');
assert.ok(preloadMapJs.includes('app-map-pill-icon'), 'preload-map.js має містити захищену векторну іконку app-map-pill-icon');
assert.ok(preloadMapJs.includes('updatePillTheme'), 'preload-map.js має містити функцію updatePillTheme');
assert.ok(!emojiRegex.test(preloadMapJs), 'В preload-map.js не повинно бути емодзі');
console.log('✔ Тест 12 пройдено (плаваюча пігулка, адаптація її теми до світлої/темної та векторна іконка UkraineAlarm валідні)');

// 13. Перевірка підписів назв областей на векторній карті
assert.ok(Array.isArray(mapData.MAP_OBLAST_LABELS), 'MAP_OBLAST_LABELS має бути масивом');
assert.ok(mapData.MAP_OBLAST_LABELS.length >= 25, `Очікується мінімум 25 підписів областей, отримано: ${mapData.MAP_OBLAST_LABELS.length}`);
for (const label of mapData.MAP_OBLAST_LABELS) {
  assert.ok(label.name && typeof label.name === 'string', 'Підпис області повинен мати назву');
  assert.ok(typeof label.x === 'number' && typeof label.y === 'number', 'Підпис області повинен мати координати x та y');
}
const labelNames = new Set(mapData.MAP_OBLAST_LABELS.map(l => l.name));
assert.ok(labelNames.has('Київська'), 'Підпис Київська область має бути присутнім');
assert.ok(labelNames.has('Львівська'), 'Підпис Львівська область має бути присутнім');
assert.ok(labelNames.has('Харківська'), 'Підпис Харківська область має бути присутнім');
assert.ok(labelNames.has('Одеська'), 'Підпис Одеська область має бути присутнім');
assert.ok(labelNames.has('АР Крим'), 'Підпис АР Крим має бути присутнім');
assert.ok(indexHtml.includes('id="oblastLabelsLayer"'), 'index.html має містити шар oblastLabelsLayer');
assert.ok(rendererJs.includes('map-oblast-label'), 'renderer.js має рендерити класи map-oblast-label');
assert.ok(styleCss.includes('.map-oblast-label'), 'style.css має містити стилі для .map-oblast-label');
console.log(`✔ Тест 13 пройдено (підписи назв областей валідні: ${mapData.MAP_OBLAST_LABELS.length} підписів, наявні шари та стилі)`);

// 14. Перевірка синхронізації початкового стану вкладок при завантаженні та відсутності спалаху вбудованої карти
const preloadMainJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'preload-main.js'), 'utf8');
const mainJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'main.js'), 'utf8');
const windowJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'window.js'), 'utf8');

assert.ok(preloadMainJs.includes("getActiveMapTabSync: () => ipcRenderer.sendSync('get-active-map-tab-sync')"), 'preload-main.js має надавати getActiveMapTabSync');
assert.ok(preloadMainJs.includes("getActiveMapTab: () => ipcRenderer.invoke('get-active-map-tab')"), 'preload-main.js має надавати getActiveMapTab');
assert.ok(preloadMainJs.includes('onMapTabChanged: (callback) =>'), 'preload-main.js має надавати onMapTabChanged');
assert.ok(mainJs.includes('get-active-map-tab-sync'), 'main.js має обробляти get-active-map-tab-sync');
assert.ok(windowJs.includes('initialTab: this.activeTab'), 'window.js має передавати initialTab у параметрах loadFile');
assert.ok(rendererJs.includes('getActiveMapTabSync'), 'renderer.js має використовувати getActiveMapTabSync для миттєвої ініціалізації');
assert.ok(rendererJs.includes('onMapTabChanged'), 'renderer.js має слухати onMapTabChanged');
assert.ok(indexHtml.includes('id="internalMapContainer" class="internal-map-container" style="display: none;"'), 'index.html повинен мати initial display:none для internalMapContainer');
console.log('✔ Тест 14 пройдено (синхронізація активної вкладки при старті та захист від показу вбудованої карти валідні)');

// Тест 15: Індивідуальний фіксований розмір кнопок вкладок та мікровирівнювання
assert.ok(styleCss.includes('.tab-btn[data-tab="internal"]'), 'style.css повинен задавати стиль для вкладки internal');
assert.ok(styleCss.includes('.tab-btn[data-tab="alertsinua"]'), 'style.css повинен задавати стиль для вкладки alertsinua');
assert.ok(styleCss.includes('.tab-btn[data-tab="ukrainealarm"]'), 'style.css повинен задавати стиль для вкладки ukrainealarm');
assert.ok(styleCss.includes('.tab-btn[data-tab="neptun"]'), 'style.css повинен задавати стиль для вкладки neptun');
assert.ok(styleCss.includes('width: 142px;'), 'style.css повинен задавати фіксовану ширину 142px для internal');
assert.ok(styleCss.includes('width: 116px;'), 'style.css повинен задавати фіксовану ширину 116px для alertsinua');
assert.ok(styleCss.includes('width: 132px;'), 'style.css повинен задавати фіксовану ширину 132px для ukrainealarm');
assert.ok(styleCss.includes('width: 92px;'), 'style.css повинен задавати фіксовану ширину 92px для neptun');
assert.ok(styleCss.includes('padding: 0 12px;'), 'style.css повинен задавати padding: 0 12px для комфортного відступу з боків');
assert.ok(styleCss.includes('gap: 5px;'), 'style.css повинен задавати зменшений відступ gap: 5px між іконкою і лейблом');
assert.ok(styleCss.includes('transform: translateY(-1px);'), 'style.css повинен піднімати іконку translateY(-1px) для оптичного центрування');
console.log('✔ Тест 15 пройдено (кожна вкладка має індивідуальну фіксовану ширину відповідно до контенту: 142/116/132/92px)');

// Тест 16: Окремий шар підсвічування обраного району
assert.ok(indexHtml.includes('id="selectedHighlightLayer"'), 'index.html повинен містити окремий шар selectedHighlightLayer');
assert.ok(styleCss.includes('.selected-highlight-layer'), 'style.css повинен стилізувати selected-highlight-layer');
assert.ok(styleCss.includes('.map-district-highlight-outline'), 'style.css повинен містити стиль .map-district-highlight-outline');
assert.ok(rendererJs.includes('selectedHighlightLayer'), 'renderer.js повинен керувати selectedHighlightLayer');
console.log('✔ Тест 16 пройдено (окремий шар selectedHighlightLayer для неподільного контуру валідний)');

// Тест 17: Логіка трея та фокусу
assert.ok(windowJs.includes('this.mainWindow.isFocused()'), 'window.js повинен перевіряти isFocused() у toggle()');
console.log('✔ Тест 17 пройдено (toggle() фокусує вікно замість приховування при неактивному фокусі)');

// Тест 18: Згасання тіні бічної панелі деталей при закритті до 0
assert.ok(styleCss.includes('box-shadow: 0 0 0 rgba(0, 0, 0, 0);'), 'region-history-drawer повинен мати нульову тінь у закритому стані');
assert.ok(styleCss.includes('box-shadow 0.36s') || styleCss.includes('box-shadow 0.32s'), 'region-history-drawer повинен плавно анімувати згасання тіні');
assert.ok(styleCss.includes('box-shadow: -6px 0 24px rgba(0, 0, 0, 0.35);'), 'region-history-drawer.open повинен мати тінь лише у відкритому стані');
console.log('✔ Тест 18 пройдено (тінь висувної бічної панелі плавно згасає до 0 при закритті)');

// Тест 19: Оновлення бічної панелі наживо (Live update)
assert.ok(rendererJs.includes('refreshOpenHistoryDrawer'), 'renderer.js повинен містити функцію refreshOpenHistoryDrawer');
assert.ok(rendererJs.includes('activeDrawerDistrictUid'), 'renderer.js повинен відстежувати activeDrawerDistrictUid');
assert.ok(rendererJs.includes('drawerLiveRefreshTimer'), 'renderer.js повинен містити live-таймер drawerLiveRefreshTimer');
console.log('✔ Тест 19 пройдено (бічна панель вбудованої карти оновлюється наживо коли відкрита)');

// Тест 20: Приховування рекламних банерів та доку на карті Neptun зі збереженням NationwideBanner
assert.ok(preloadMapJs.includes('BottomDock_dock'), 'preload-map.js повинен приховувати BottomDock на карті Neptun');
assert.ok(preloadMapJs.includes('SupportBanner_'), 'preload-map.js повинен приховувати SupportBanner на карті Neptun');
assert.ok(preloadMapJs.includes('MapHeader_installSlot'), 'preload-map.js повинен приховувати MapHeader_installSlot на карті Neptun');
assert.ok(!preloadMapJs.includes('NationwideBanner'), 'preload-map.js не повинен приховувати NationwideBanner (оперативні сповіщення про загрози)');
assert.ok(windowJs.includes('BottomDock_dock'), 'window.js повинен містити insertCSS для очищення реклами Neptun');
assert.ok(windowJs.includes('adFilter'), 'window.js повинен містити мережевий adFilter для блокування рекламних мереж');
console.log('✔ Тест 20 пройдено (рекламні банери та док на карті Neptun надійно блокуються, а NationwideBanner збережено)');

// Тест 21: Плавні анімації карток панелі, узгодження іконок загроз та запам'ятовування вікна
assert.ok(styleCss.includes('drawerCardFadeIn'), 'style.css повинен містити анімацію drawerCardFadeIn для карток');
assert.ok(styleCss.includes('.drawer-animate-in'), 'style.css повинен містити клас .drawer-animate-in');
assert.ok(styleCss.includes('.drawer-loading.fade-out'), 'style.css повинен містити плавний fade-out лоадера');
assert.ok(rendererJs.includes('threatIcons.drone'), 'renderer.js повинен використовувати threatIcons.drone для картки статусу');
assert.ok(windowJs.includes('windowBounds'), 'window.js повинен відновлювати та зберігати windowBounds');
console.log('✔ Тест 21 пройдено (анімації карток, плавний лоадер, іконки загроз та збереження розміру вікна)');

console.log('🎉 Усі тести панелі вкладок, тем та векторної карти успішно виконано!');


