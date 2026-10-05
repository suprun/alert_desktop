const assert = require('assert');
const config = require('../src/main/config');
const apiService = require('../src/main/api');

console.log('🧪 Запуск тестів адаптера NEPTUN API...');

// Тест 1: Обробка порожніх/невалідних даних
assert.deepStrictEqual(apiService.normalizeNeptunPayload(null), [], 'Порожні дані мають повертати []');
assert.deepStrictEqual(apiService.normalizeNeptunPayload({}), [], 'Порожній об\'єкт має повертати []');
assert.deepStrictEqual(apiService.normalizeNeptunPayload({ raions: [], oblasts: [] }), [], 'Порожні масиви мають повертати []');
console.log('✔ Тест 1 пройдено (порожні дані)');

// Тест 2: Нормалізація районів, парсинг загроз та виправлення апострофів/перейменувань
const sampleNeptun = {
  version: 1791191533,
  updatedAt: '2026-10-05T10:00:00.000Z',
  raions: [
    {
      key: 'кам’янський',
      name: 'Кам’янський район',
      oblast: 'Дніпропетровська область',
      since: '2026-10-05T08:30:00.000Z',
      level: 'yellow',
      reasons: ['Дронова загроза (жовтий рівень)']
    },
    {
      key: 'красноградський',
      name: 'Красноградський район',
      oblast: 'Харківська область',
      since: '2026-10-05T09:15:00.000Z',
      level: 'red',
      reasons: ['Ракетна загроза (червоний рівень)']
    },
    {
      key: 'нікопольський',
      name: 'Нікопольський район',
      oblast: 'Дніпропетровська область',
      since: '2026-10-05T07:00:00.000Z',
      level: 'red',
      reasons: ['Загроза артобстрілу (червоний рівень)']
    }
  ],
  oblasts: [
    {
      key: 'севастополь',
      name: 'Севастополь',
      oblast: 'Автономна Республіка Крим',
      since: '2022-12-10T22:22:00Z',
      level: 'red'
    },
    {
      key: 'м. київ',
      name: 'м. Київ',
      oblast: 'м. Київ',
      since: '2026-10-05T09:50:00Z',
      level: 'red'
    }
  ]
};

const normalized = apiService.normalizeNeptunPayload(sampleNeptun);
assert.strictEqual(normalized.length, 5, 'Очікується 5 активних тривог (3 райони + 2 області)');

// Перевірка кучерявого апострофа: Кам’янський район -> Кам'янський район
const kamyanske = normalized.find(a => a.location_title.includes('Кам'));
assert.ok(kamyanske, 'Кам’янський район має бути знайдено');
assert.strictEqual(kamyanske.location_uid, '42', 'UID Кам\'янського району має бути 42');
assert.strictEqual(kamyanske.alert_level, 'yellow', 'Рівень загрози БПЛА має бути yellow');
assert.strictEqual(kamyanske.threats[0].threat_type, 'drones', 'Тип загрози має бути drones');

// Перевірка перейменування: Красноградський район -> Берестинський район
const berestyn = normalized.find(a => a.location_uid === '144' || a.location_title.includes('Берестинський'));
assert.ok(berestyn, 'Красноградський район має мапитися на Берестинський район (UID 144)');
assert.strictEqual(berestyn.threats[0].threat_type, 'unspecified_missiles');

// Перевірка артобстрілу
const nikopol = normalized.find(a => a.location_title.includes('Нікопольський'));
assert.ok(nikopol);
assert.strictEqual(nikopol.alert_type, 'artillery_shelling');

// Перевірка областей
const sevastopol = normalized.find(a => a.location_title === 'м. Севастополь');
assert.ok(sevastopol, 'Севастополь має мапитися на "м. Севастополь"');
assert.strictEqual(sevastopol.location_uid, '30');

const kyiv = normalized.find(a => a.location_title === 'м. Київ');
assert.ok(kyiv, 'м. Київ має бути знайдено');
assert.strictEqual(kyiv.location_uid, '31');
console.log('✔ Тест 2 пройдено (нормалізація, мапінг назв, парсинг загроз)');

// Тест 3: Ієрархічний пошук для громади (громада -> район)
// Божедарівська територіальна громада (uid: 293, raionUid: 42 "Кам'янський район")
config.set('locationUid', '293');
config.set('locationTitle', 'Божедарівська територіальна громада');

apiService._processAlertsPayload(normalized, { suppressNotification: true });
let state = apiService.getStatus();
assert.strictEqual(state.isAlert, true, 'Громада має успадковувати тривогу від району');
assert.strictEqual(state.alertLevel, 'yellow');
assert.ok(state.alertScope.includes("Кам'янський район"), 'alertScope має вказувати на район');
console.log('✔ Тест 3 пройдено (громада успадковує тривогу району)');

// Тест 4: Перевірка прямого збігу для м. Київ
config.set('locationUid', '31');
config.set('locationTitle', 'м. Київ');
apiService._processAlertsPayload(normalized, { suppressNotification: true });
state = apiService.getStatus();
assert.strictEqual(state.isAlert, true, 'м. Київ має активну тривогу');
assert.strictEqual(state.alertScope, null, 'Для прямого збігу alertScope має бути null');
console.log('✔ Тест 4 пройдено (прямий збіг для міста)');

// Тест 5: WebSocket адреса для NEPTUN
config.set('devMode', true);
config.set('apiProvider', 'neptun');
assert.strictEqual(config.getWsUrl(), 'wss://neptun.in.ua/api/v1/stream', 'getWsUrl() для neptun має повертати стрім neptun');

// Відновлюємо дефолтний конфіг
config.set('devMode', false);
config.set('apiProvider', 'gateway');
config.set('locationUid', '31');
config.set('locationTitle', 'м. Київ');
apiService._processAlertsPayload([], { suppressNotification: true });

console.log('✔ Тест 5 пройдено (WebSocket URL для NEPTUN)');
console.log('🎉 Усі тести адаптера NEPTUN API успішно пройдено!');
