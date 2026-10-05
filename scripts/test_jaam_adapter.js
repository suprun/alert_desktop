const assert = require('assert');
const config = require('../src/main/config');
const apiService = require('../src/main/api');

console.log('🧪 Запуск тестів адаптера JAAM API...');

// Тест 1: Обробка порожніх/невалідних даних
assert.deepStrictEqual(apiService.normalizeJaamPayload(null), [], 'Порожні дані мають повертати []');
assert.deepStrictEqual(apiService.normalizeJaamPayload({}), [], 'Порожній об\'єкт має повертати []');
assert.deepStrictEqual(apiService.normalizeJaamPayload({ states: {} }), [], 'Порожні states мають повертати []');
console.log('✔ Тест 1 пройдено (порожні дані)');

// Тест 2: Нормалізація корисного навантаження JAAM v3
const sampleJaamV3 = {
  version: 3,
  states: {
    'Івано-Франківська область': false,
    'Вінницька область': true,
    'Київ': true,
    'м. Харків та Харківська територіальна громада': true,
    'Автономна Республіка Крим': true
  }
};

const normalizedV3 = apiService.normalizeJaamPayload(sampleJaamV3);
assert.strictEqual(normalizedV3.length, 4, 'Очікується 4 активні тривоги (Івано-Франківська область неактивна)');

// Перевірка мапінгу Києва
const kyivAlert = normalizedV3.find(a => a.location_title === 'м. Київ');
assert.ok(kyivAlert, 'Київ має мапитися на "м. Київ"');
assert.strictEqual(kyivAlert.location_uid, '31');
assert.strictEqual(kyivAlert.alert_type, 'air_raid');
assert.strictEqual(kyivAlert.alert_level, 'red');

// Перевірка міської громади
const kharkivHromada = normalizedV3.find(a => a.location_title.includes('Харківська територіальна громада'));
assert.ok(kharkivHromada, 'Харківська територіальна громада має бути знайдена');
assert.strictEqual(kharkivHromada.location_type, 'hromada');
assert.strictEqual(kharkivHromada.location_uid, '1293');
assert.strictEqual(kharkivHromada.location_oblast, 'Харківська область');

// Перевірка Криму
const crimeaAlert = normalizedV3.find(a => a.location_title === 'Автономна Республіка Крим');
assert.ok(crimeaAlert);
assert.strictEqual(crimeaAlert.location_uid, '29');
console.log('✔ Тест 2 пройдено (нормалізація JAAM v3)');

// Тест 3: Нормалізація JAAM v2 (об'єкти з changes)
const sampleJaamV2 = {
  version: 2,
  states: {
    'Київ': { alertnow: false, changes: null },
    'Дніпропетровська область': { alertnow: true, district: true, changes: '2026-10-05T05:20:36Z' }
  }
};
const normalizedV2 = apiService.normalizeJaamPayload(sampleJaamV2);
assert.strictEqual(normalizedV2.length, 1);
assert.strictEqual(normalizedV2[0].location_uid, '9');
assert.strictEqual(normalizedV2[0].started_at, '2026-10-05T05:20:36Z');
console.log('✔ Тест 3 пройдено (нормалізація JAAM v2 з timestamps)');

// Тест 4: Ієрархічне успадкування тривоги громадою від області
// Жмеринська територіальна громада (uid: 179, oblastUid: 4 'Вінницька область')
config.set('locationUid', '179');
config.set('locationTitle', 'м. Жмеринка та Жмеринська територіальна громада');

apiService._processAlertsPayload(normalizedV3, { suppressNotification: true });
let state = apiService.getStatus();
assert.strictEqual(state.isAlert, true, 'Громада має успадковувати тривогу від активної Вінницької області');
assert.strictEqual(state.alertScope, 'Вінницька область');
console.log('✔ Тест 4 пройдено (успадкування тривоги від області)');

// Тест 5: Прямий збіг для виділеної громади (Харків)
config.set('locationUid', '1293');
config.set('locationTitle', 'м. Харків та Харківська територіальна громада');
apiService._processAlertsPayload(normalizedV3, { suppressNotification: true });
state = apiService.getStatus();
assert.strictEqual(state.isAlert, true, 'Харківська громада має пряму активну тривогу');
assert.strictEqual(state.alertScope, null, 'Для прямого збігу громади alertScope === null');
console.log('✔ Тест 5 пройдено (прямий збіг для громади)');

// Тест 6: Повний відбій
const clearJaam = {
  version: 3,
  states: {
    'Вінницька область': false
  }
};
config.set('locationUid', '179');
apiService._processAlertsPayload(apiService.normalizeJaamPayload(clearJaam), { suppressNotification: true });
state = apiService.getStatus();
assert.strictEqual(state.isAlert, false, 'Після відбою isAlert === false');
console.log('✔ Тест 6 пройдено (відбій тривоги)');

// Тест 7: Вимкнення WebSocket для JAAM (тільки HTTP-polling)
config.set('devMode', true);
config.set('apiProvider', 'jaam');
assert.strictEqual(config.getWsUrl(), null, 'getWsUrl() для jaam має повертати null');

// Відновлюємо дефолтний стан
config.set('devMode', false);
config.set('apiProvider', 'gateway');
config.set('locationUid', '31');
config.set('locationTitle', 'м. Київ');
apiService._processAlertsPayload([], { suppressNotification: true });

console.log('✔ Тест 7 пройдено (відключення WebSocket для JAAM)');
console.log('🎉 Усі тести адаптера JAAM API успішно пройдено!');
