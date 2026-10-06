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
    'В settings.html суворо заборонені емодзі — дозволені лише централізовані векторні іконки'
  );
  assert.ok(!settingsHtml.includes('<svg'), 'settings.html не повинен містити inline SVG');
  console.log('✔ Тест 5 пройдено (в settings.html відсутні емодзі та inline SVG)');
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
  const occurrences = (settingsHtml.match(/\bexternal-link-icon\b/g) || []).length;
  assert.ok(
    occurrences >= 3,
    `В блоці About на кнопках Репозиторій, Ліцензія, Автор мають бути значки зовнішнього переходу (знайдено: ${occurrences})`
  );
  console.log('✔ Тест 7 пройдено (кнопки Репозиторій, Ліцензія, Автор містять централізовані значки зовнішнього переходу)');
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

// Тест 10: Перевірка просторої дворядкової структури для бейджа обраної локації (.selected-badge)
{
  assert.ok(
    settingsHtml.includes('class="selected-badge-header"') && settingsHtml.includes('id="selectedBadgeText" class="selected-badge-text"'),
    'settings.html має містити .selected-badge-header та окремий рядок .selected-badge-text'
  );
  const settingsCssPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.css');
  const settingsCss = fs.readFileSync(settingsCssPath, 'utf8');
  assert.ok(
    settingsCss.includes('.selected-badge-header') && settingsCss.includes('flex-direction: column;'),
    'settings.css має задавати flex-direction: column для .selected-badge та стилізувати .selected-badge-header'
  );
  console.log('✔ Тест 10 пройдено (бейдж обраної місцевості переведено на 2-рядкову простору верстку без розриву назви)');
}

// Тест 11: Перевірка іконок зовнішнього переходу для 3 посилань на політики конфіденційності, 3 кнопок About та кнопки донату
{
  const totalExternalIcons = (settingsHtml.match(/\bexternal-link-icon\b/g) || []).length;
  assert.strictEqual(
    totalExternalIcons,
    7,
    `Має бути рівно 7 іконок external-link (3 на кнопках About + 1 на кнопці донату + 3 на посиланнях політик), знайдено: ${totalExternalIcons}`
  );
  console.log('✔ Тест 11 пройдено (посилання About, донату та політик містять централізований значок зовнішнього переходу)');
}

// Тест 12: Перевірка збільшених шрифтів блоку About
{
  const settingsCssPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.css');
  const settingsCss = fs.readFileSync(settingsCssPath, 'utf8');
  assert.ok(settingsCss.includes('font-size: 13px;') && settingsCss.includes('.about-desc'), '.about-desc має розмір 13px');
  assert.ok(settingsCss.includes('font-size: 12.5px;') && settingsCss.includes('.about-policies-list'), '.about-policies-list має розмір 12.5px');
  assert.ok(settingsCss.includes('font-size: 12px;') && settingsCss.includes('.about-legal-item'), '.about-legal-item має розмір 12px');
  console.log('✔ Тест 12 пройдено (шрифти блоку About збільшено для комфортної читабельності)');
}

// Тест 13: Перевірка порядку елементів (кнопки в 1 рядок, донат, потім блок оновлення)
{
  assert.ok(
    !settingsHtml.includes('class="settings-group update-group"'),
    'Окрему секцію update-group має бути усунено на користь об\'єднання з about-group'
  );
  assert.ok(
    !settingsHtml.includes('class="update-card"'),
    'Внутрішню підкартку update-card має бути витягнуто (ліквідовано подвійні рамки)'
  );
  assert.ok(
    !settingsHtml.includes('>Про застосунок та оновлення<'),
    'Зайвий дублюючий заголовок group-label має бути видалено з секції about-group'
  );
  assert.ok(
    settingsHtml.includes('class="settings-group about-group"'),
    'Секція about-group має бути присутня'
  );
  assert.ok(
    settingsHtml.includes('class="about-donate-row"') && settingsHtml.includes('https://send.monobank.ua/jar/alert_desktop'),
    'Рядок підтримки/донату з Monobank банкою має бути присутній'
  );

  const aboutIndex = settingsHtml.indexOf('class="settings-group about-group"');
  const linksIndex = settingsHtml.indexOf('class="about-links-row"');
  const donateIndex = settingsHtml.indexOf('class="about-donate-row"');
  const updateBlockIndex = settingsHtml.indexOf('class="about-update-block"');
  const checkBtnIndex = settingsHtml.indexOf('id="btnCheckUpdate"');
  const downloadBtnIndex = settingsHtml.indexOf('id="btnDownloadUpdate"');
  const installBtnIndex = settingsHtml.indexOf('id="btnInstallUpdate"');
  const meteredChkIndex = settingsHtml.indexOf('id="chkAutoDownloadMetered"');
  const statusTextIndex = settingsHtml.indexOf('id="updateStatusText"');
  const devGroupIndex = settingsHtml.indexOf('class="settings-group dev-settings-group"');

  assert.ok(linksIndex > aboutIndex, 'Кнопки About мають бути всередині about-group');
  assert.ok(linksIndex < donateIndex, 'Кнопки About мають розташовуватися ПЕРЕД рядком донату');
  assert.ok(donateIndex < updateBlockIndex, 'Рядок донату має розташовуватися ПЕРЕД блоком оновлень');
  assert.ok(checkBtnIndex > updateBlockIndex && checkBtnIndex < devGroupIndex, 'btnCheckUpdate має бути всередині about-update-block');
  assert.ok(downloadBtnIndex > updateBlockIndex && downloadBtnIndex < devGroupIndex, 'btnDownloadUpdate має бути всередині about-update-block');
  assert.ok(installBtnIndex > updateBlockIndex && installBtnIndex < devGroupIndex, 'btnInstallUpdate має бути всередині about-update-block');
  assert.ok(meteredChkIndex > updateBlockIndex && meteredChkIndex < devGroupIndex, 'chkAutoDownloadMetered має бути всередині about-update-block');
  assert.ok(statusTextIndex > updateBlockIndex && statusTextIndex < devGroupIndex, 'updateStatusText має бути всередині about-update-block');

  const settingsCssPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.css');
  const settingsCss = fs.readFileSync(settingsCssPath, 'utf8');
  assert.ok(
    settingsCss.includes('.about-links-row') && settingsCss.includes('flex-wrap: nowrap;'),
    'settings.css має задавати flex-wrap: nowrap для .about-links-row щоб вмістити кнопки строго в один рядок'
  );
  assert.ok(
    settingsCss.includes('.about-donate-row') && settingsCss.includes('.about-donate-btn'),
    'settings.css має містити стилі рядка донату'
  );
  assert.ok(
    settingsCss.includes('.about-status-row') && settingsCss.includes('min-height: 20px;'),
    'settings.css має задавати min-height: 20px для .about-status-row для усунення стрибків layout'
  );
  assert.ok(
    settingsCss.includes('spinUpdate'),
    'settings.css має містити анімацію spinUpdate для обертання значка оновлення під час перевірки'
  );
  assert.ok(
    settingsCss.includes('scrollbar-gutter: stable;'),
    'settings.css має містити scrollbar-gutter: stable для .settings-body для стабілізації ширини при скролі'
  );
  assert.ok(
    !settingsCss.includes('.update-card {'),
    'settings.css не повинен містити стилів застарілої плашки .update-card'
  );

  console.log('✔ Тест 13 пройдено (кнопки About в 1 рядок, блок донату додано, заголовок About прибрано)');
}

// Тест 14: Перевірка окремої картки політик та просторого layout оновлень
{
  const aboutGroupIndex = settingsHtml.indexOf('class="settings-group about-group"');
  const policiesGroupIndex = settingsHtml.indexOf('class="settings-group policies-group"');
  const devGroupIndex = settingsHtml.indexOf('class="settings-group dev-settings-group"');
  const aboutSectionEndIndex = settingsHtml.indexOf('</section>', aboutGroupIndex);
  const policiesTitleIndex = settingsHtml.indexOf('id="policiesTitle"');
  const legalIndex = settingsHtml.indexOf('class="about-legal-box"');
  const policiesIndex = settingsHtml.indexOf('class="about-policies-box"');
  const unofficialClientIndex = settingsHtml.indexOf('<strong>Неофіційний клієнт:</strong>');

  assert.ok(aboutGroupIndex > 0, 'Картка About має бути присутня');
  assert.ok(policiesGroupIndex > aboutSectionEndIndex, 'Картка Політики має бути окремою від картки About');
  assert.ok(devGroupIndex > policiesGroupIndex, 'Картка Політики має розміщуватися перед параметрами розробника');
  assert.ok(policiesTitleIndex > policiesGroupIndex, 'Окрема картка має містити заголовок Політики');
  assert.ok(legalIndex > 0 && policiesIndex > 0, 'Блоки about-legal-box та about-policies-box мають бути присутні');
  assert.ok(policiesTitleIndex < unofficialClientIndex, 'Заголовок Політики має розміщуватися над текстом Неофіційний клієнт');
  assert.ok(legalIndex < policiesIndex, 'about-legal-box має розміщуватися ПЕРЕД about-policies-box');

  const settingsCssPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.css');
  const settingsCss = fs.readFileSync(settingsCssPath, 'utf8');
  assert.ok(
    settingsCss.includes('.about-status-row') && settingsCss.includes('width: 100%;'),
    'settings.css має задавати width: 100% для .about-status-row щоб статус не стискався кнопкою'
  );
  assert.ok(
    settingsCss.includes('.update-status-text') && settingsCss.includes('font-size: 12px;'),
    'settings.css має задавати font-size: 12px для .update-status-text для комфортного читання'
  );
  assert.ok(
    settingsCss.includes('.about-update-block') && settingsCss.includes('gap: 10px;'),
    'settings.css має задавати gap: 10px для .about-update-block для просторого розміщення елементів'
  );

  console.log('✔ Тест 14 пройдено (окрема картка Політики та повноширинний просторий layout статусу оновлень)');
}

// Тест 15: Перевірка підтримки автопрокручування до блоку About
{
  const preloadSettingsPath = path.join(__dirname, '..', 'src', 'preload', 'preload-settings.js');
  const preloadSettings = fs.readFileSync(preloadSettingsPath, 'utf8');
  assert.ok(preloadSettings.includes('onScrollToSection'), 'preload-settings.js повинен надавати метод onScrollToSection');

  const settingsJsPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.js');
  const settingsJs = fs.readFileSync(settingsJsPath, 'utf8');
  assert.ok(settingsJs.includes('scrollToAboutSection'), 'settings.js повинен містити функцію scrollToAboutSection');
  assert.ok(settingsJs.includes('scrollIntoView'), 'settings.js повинен використовувати scrollIntoView для плавного прокручування');
  console.log('✔ Тест 15 пройдено (автопрокручування до блоку About підтримується через IPC та status.updateDownloaded)');
}

// Тест 16: Перевірка UI та захисту збереження для API-токенів
{
  const settingsJsPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.js');
  const settingsJs = fs.readFileSync(settingsJsPath, 'utf8');
  const preloadPath = path.join(__dirname, '..', 'src', 'preload', 'preload-settings.js');
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  const mainPath = path.join(__dirname, '..', 'src', 'main', 'main.js');
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  const settingsCssPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.css');
  const settingsCss = fs.readFileSync(settingsCssPath, 'utf8');

  assert.ok(settingsHtml.includes('id="btnVerifyApiToken"'), 'settings.html має містити кнопку перевірки токена');
  assert.ok(settingsHtml.includes('id="apiTokenStatus"'), 'settings.html має містити пояснення стану перевірки');
  assert.ok(settingsHtml.includes('id="saveBlockedReason"'), 'footer має пояснювати блокування збереження');
  assert.ok(settingsJs.includes('Введіть токен, щоб увімкнути перевірку.'), 'UI має пояснювати недоступність перевірки');
  assert.ok(settingsJs.includes('Щоб зберегти, спочатку перевірте токен API.'), 'UI має пояснювати недоступність збереження');
  assert.ok(settingsJs.includes("tokenVerificationState !== 'trusted'"), 'renderer має блокувати збереження неперевіреного токена');
  assert.ok(settingsHtml.includes('id="inputApiKey"') && settingsHtml.includes('aria-invalid="false"'), 'поле токена має початковий доступний стан aria-invalid');
  assert.ok(
    settingsJs.includes("['empty', 'unverified', 'error'].includes(state)"),
    'порожній, неперевірений і помилковий токен мають позначатися як невалідні'
  );
  assert.ok(settingsJs.includes("state === 'checking'"), 'активна перевірка токена має окремий стан оформлення');
  assert.ok(settingsJs.includes("classList.toggle('is-token-invalid'"), 'renderer має перемикати червоний контур токена');
  assert.ok(settingsJs.includes("classList.toggle('is-token-checking'"), 'renderer має перемикати синій контур під час перевірки');
  assert.ok(settingsJs.includes("setAttribute('aria-invalid'"), 'renderer має синхронізувати aria-invalid зі станом токена');
  assert.ok(settingsCss.includes('#inputApiKey.is-token-invalid:not(:disabled)'), 'CSS має містити червоний контур невалідного токена');
  assert.ok(settingsCss.includes('#inputApiKey.is-token-checking:not(:disabled)'), 'CSS має містити синій контур токена під час перевірки');
  assert.ok(preloadContent.includes("ipcRenderer.invoke('verify-api-token'"), 'preload має надавати обмежений verify-api-token IPC');
  assert.ok(mainContent.includes('api.isApiTokenTrusted(newConfig)'), 'головний процес має захищати save-config від неперевіреного токена');
  const checkboxHints = settingsHtml.match(/class="field-hint checkbox-hint"/g) || [];
  const checkboxHintCss = settingsCss.match(/\.checkbox-hint\s*\{[^}]+\}/s);
  assert.strictEqual(checkboxHints.length, 2, 'обидва пояснення чекбоксів мають використовувати спільне вирівнювання');
  assert.ok(checkboxHintCss && checkboxHintCss[0].includes('padding-left: 26px;'), 'пояснення чекбоксів мають відступ 26px до вертикалі лейбла');
  const legalCss = settingsCss.match(/\.about-legal-box\s*\{[^}]+\}/s);
  const policiesCss = settingsCss.match(/\.about-policies-box\s*\{[^}]+\}/s);
  assert.ok(legalCss && legalCss[0].includes('border-top: none;'), 'розділювач перед юридичним блоком має бути прибраний');
  assert.ok(policiesCss && policiesCss[0].includes('border-top: none;'), 'розділювач перед політиками має бути прибраний');
  console.log('✔ Тест 16 пройдено (контури токена, вирівнювання пояснень та main-process guard присутні)');
}

// Тест 17: Контрольоване завершення роботи із секції Система
{
  const settingsJsPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.js');
  const settingsJs = fs.readFileSync(settingsJsPath, 'utf8');
  const settingsCssPath = path.join(__dirname, '..', 'src', 'renderer', 'settings', 'settings.css');
  const settingsCss = fs.readFileSync(settingsCssPath, 'utf8');
  const preloadPath = path.join(__dirname, '..', 'src', 'preload', 'preload-settings.js');
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  const mainPath = path.join(__dirname, '..', 'src', 'main', 'main.js');
  const mainContent = fs.readFileSync(mainPath, 'utf8');

  assert.ok(settingsHtml.includes('class="settings-group system-group"'), 'секція Система має окремий клас для системних дій');
  assert.ok(settingsHtml.includes('id="btnQuitApp"'), 'секція Система має містити кнопку завершення роботи');
  assert.ok(settingsHtml.includes('Повністю закриє застосунок і припинить моніторинг тривог.'), 'користувач має бачити наслідок завершення роботи');
  assert.ok(settingsHtml.includes('aria-describedby="quitAppDescription"'), 'кнопка завершення має бути пов’язана з поясненням');
  assert.ok(settingsHtml.includes('btn-danger-icon ui-icon icon-power'), 'кнопка завершення має використовувати централізовану іконку живлення');
  const powerIcon = fs.readFileSync(path.join(__dirname, '..', 'assets', 'icons', 'ui', 'power.svg'), 'utf8');
  assert.ok(powerIcon.includes('M18.36 6.64a9 9 0 1 1-12.73 0'), 'канонічний power.svg має містити лінійну іконку живлення');

  assert.ok(settingsCss.includes('.btn-danger-outline'), 'CSS має містити danger-стиль кнопки завершення');
  assert.ok(settingsCss.includes('.btn-danger-outline:hover:not(:disabled)'), 'danger-кнопка має видимий hover-стан');
  assert.ok(settingsCss.includes('.btn-danger-outline:focus-visible'), 'danger-кнопка має доступний focus-стан');
  assert.ok(settingsCss.includes('.btn-danger-outline:disabled'), 'danger-кнопка має disabled-стан під час підтвердження');

  const quitHandlerStart = settingsJs.indexOf("btnQuitApp.addEventListener('click'");
  const quitHandlerEnd = settingsJs.indexOf('// Керування станом UI оновлень', quitHandlerStart);
  const quitHandler = settingsJs.slice(quitHandlerStart, quitHandlerEnd);
  assert.ok(quitHandlerStart > 0 && quitHandlerEnd > quitHandlerStart, 'renderer має містити окремий обробник завершення роботи');
  assert.ok(quitHandler.includes('stopAudioTest()'), 'перед завершенням має зупинятися тестовий звук');
  assert.ok(quitHandler.includes('requestQuitApp()'), 'renderer має викликати лише обмежений preload-метод');
  assert.ok(quitHandler.includes('btnQuitApp.disabled = true'), 'кнопка має блокуватися на час підтвердження');
  assert.ok(!quitHandler.includes('saveConfig'), 'завершення роботи не повинно намагатися зберегти форму');
  assert.ok(!quitHandler.includes('tokenVerificationState'), 'валідація токена не повинна блокувати завершення роботи');

  assert.ok(preloadContent.includes("requestQuitApp: () => ipcRenderer.invoke('request-quit-app')"), 'preload має експонувати requestQuitApp без параметрів');
  assert.ok(mainContent.includes("ipcMain.handle('request-quit-app'"), 'головний процес має обробляти request-quit-app');
  assert.ok(mainContent.includes("message: 'Завершити роботу AlertDesktop?'"), 'нативний діалог має містити чітке питання');
  assert.ok(mainContent.includes("buttons: ['Скасувати', 'Завершити роботу']"), 'нативний діалог має безпечний і руйнівний варіанти');
  assert.ok(mainContent.includes('defaultId: 0') && mainContent.includes('cancelId: 0'), 'Скасувати має бути типовою та Esc-дією');
  assert.ok(mainContent.includes('if (result.response !== 1)'), 'скасування не повинно завершувати застосунок');
  assert.ok(mainContent.includes('setImmediate(() => app.quit())'), 'підтвердження має запускати штатний app.quit');
  assert.ok(mainContent.includes("app.on('before-quit'") && mainContent.includes('api.stopPolling()'), 'штатне очищення має виконуватися перед виходом');

  console.log('✔ Тест 17 пройдено (безпечне завершення роботи через нативне підтвердження)');
}

console.log('🎉 Усі тести інтерфейсу налаштувань успішно пройдено!');
