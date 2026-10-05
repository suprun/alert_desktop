const assert = require('assert');
const config = require('../src/main/config');
const apiService = require('../src/main/api');

console.log('🧪 Запуск тестів адаптера Ubilling Aerial Alerts API...');

// Тест 1: Обробка некоректних/порожніх даних
assert.deepStrictEqual(apiService.normalizeUbillingPayload(null), [], 'Порожні дані мають повертати []');
assert.deepStrictEqual(apiService.normalizeUbillingPayload({}), [], 'Об\'єкт без states має повертати []');
assert.deepStrictEqual(apiService.normalizeUbillingPayload({ states: {} }), [], 'states: {} має повертати []');
console.log('✔ Тест 1 пройдено (обробка порожніх/невалідних даних)');

// Тест 2: Нормалізація корисного навантаження (Ubilling payload)
const samplePayload = {
  source: 'Vadym Klymenko API (default)',
  cachedat: '2026-10-05 11:50:44',
  states: {
    'Вінницька область': { alertnow: false, changed: '1970-01-01 03:00:00' },
    'Дніпропетровська область': { alertnow: true, changed: '2026-10-05 10:15:30' },
    'Севастополь': { alertnow: true, changed: '2022-12-11 00:22:00' },
    'м. Київ': { alertnow: true, changed: '1970-01-01 03:00:00' },
    'Крим': { alertnow: true, changed: '2023-01-01 12:00:00' }
  }
};

const normalized = apiService.normalizeUbillingPayload(samplePayload);
assert.strictEqual(normalized.length, 4, 'Очікується 4 активні тривоги (Вінницька область неактивна)');

// Перевірка Дніпропетровської області
const dniproAlert = normalized.find(a => a.location_title === 'Дніпропетровська область');
assert.ok(dniproAlert, 'Дніпропетровська область має бути в масиві активних тривог');
assert.strictEqual(dniproAlert.location_uid, '9', 'UID Дніпропетровської області має бути 9');
assert.strictEqual(dniproAlert.location_type, 'state');
assert.strictEqual(dniproAlert.alert_type, 'air_raid');
assert.strictEqual(dniproAlert.alert_level, 'red');

// Перевірка мапінгу Севастополя
const sevastopolAlert = normalized.find(a => a.location_title === 'м. Севастополь');
assert.ok(sevastopolAlert, 'Севастополь має мапитися на канонічну назву "м. Севастополь"');
assert.strictEqual(sevastopolAlert.location_uid, '30', 'UID м. Севастополь має бути 30');

// Перевірка мапінгу Криму
const crimeaAlert = normalized.find(a => a.location_title === 'Автономна Республіка Крим');
assert.ok(crimeaAlert, 'Крим має мапитися на "Автономна Республіка Крим"');
assert.strictEqual(crimeaAlert.location_uid, '29', 'UID Криму має бути 29');

// Перевірка форматування дат (1970 -> поточний час, валідна дата -> ISO)
assert.ok(dniproAlert.started_at.includes('2026-10-05'), 'Валідна дата має коректно конвертуватися в ISO');
const parsedKievDate = new Date(normalized.find(a => a.location_title === 'м. Київ').started_at);
assert.ok(!isNaN(parsedKievDate.getTime()) && parsedKievDate.getFullYear() >= 2026, '1970-01-01 має бути замінено на валідний поточний час');
console.log('✔ Тест 2 пройдено (нормалізація, мапінг регіонів та парсинг часу)');

// Тест 3: Прямий збіг для обраної області
config.set('locationUid', '9');
config.set('locationTitle', 'Дніпропетровська область');

apiService._processAlertsPayload(normalized, { suppressNotification: true });
let state = apiService.getStatus();
assert.strictEqual(state.isAlert, true, 'Очікується активна тривога для Дніпропетровської області');
assert.strictEqual(state.alertType, 'air_raid');
assert.strictEqual(state.alertLevel, 'red');
assert.strictEqual(state.alertScope, null, 'Для прямої області alertScope має бути null');
console.log('✔ Тест 3 пройдено (прямий збіг для обраної області)');

// Тест 4: Ієрархічний збіг для громади в активній області (громада -> область)
// Апостолівська територіальна громада (uid: '271', oblastUid: '9', oblastTitle: 'Дніпропетровська область')
config.set('locationUid', '271');
config.set('locationTitle', 'Апостолівська територіальна громада');

apiService._processAlertsPayload(normalized, { suppressNotification: true });
state = apiService.getStatus();
assert.strictEqual(state.isAlert, true, 'Громада має успадковувати тривогу батьківської області');
assert.strictEqual(state.alertScope, 'Дніпропетровська область', 'alertScope має вказувати назву батьківської області');
console.log('✔ Тест 4 пройдено (успадкування тривоги громадою від області з alertScope)');

// Тест 5: Локація у спокійній області (Вінницька область)
config.set('locationUid', '4');
config.set('locationTitle', 'Вінницька область');

apiService._processAlertsPayload(normalized, { suppressNotification: true });
state = apiService.getStatus();
assert.strictEqual(state.isAlert, false, 'У Вінницькій області тривоги немає');
assert.strictEqual(state.alertType, 'none');
assert.strictEqual(state.alertLevel, 'none');
console.log('✔ Тест 5 пройдено (відсутність тривоги для неактивної області)');

// Тест 6: Повний відбій
const allClearPayload = {
  source: 'Vadym Klymenko API (default)',
  states: {
    'Дніпропетровська область': { alertnow: false, changed: '1970-01-01 03:00:00' }
  }
};
const clearNormalized = apiService.normalizeUbillingPayload(allClearPayload);
config.set('locationUid', '9');
config.set('locationTitle', 'Дніпропетровська область');
apiService._processAlertsPayload(clearNormalized, { suppressNotification: true });
state = apiService.getStatus();
assert.strictEqual(state.isAlert, false, 'Після відбою isAlert має бути false');
console.log('✔ Тест 6 пройдено (коректний перехід у відбій)');

// Тест 7: Відключення WebSocket для провайдера Ubilling
config.set('devMode', true);
config.set('apiProvider', 'ubilling');
assert.strictEqual(config.getWsUrl(), null, 'config.getWsUrl() для ubilling має повертати null');

// Відновлюємо дефолтний конфіг для збереження чистоти стану тестів
config.set('devMode', false);
config.set('apiProvider', 'gateway');
config.set('locationUid', '31');
config.set('locationTitle', 'м. Київ');
apiService._processAlertsPayload([], { suppressNotification: true });

console.log('✔ Тест 7 пройдено (відключення WebSocket для Ubilling)');
console.log('🎉 Усі тести адаптера Ubilling API успішно виконано!');
