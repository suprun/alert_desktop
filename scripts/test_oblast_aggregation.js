const assert = require('assert');
const path = require('path');
const config = require('../src/main/config');
const apiService = require('../src/main/api');

console.log('🧪 Запуск тестів агрегації тривог по області (Bottom-Up Oblast Aggregation)...');

// 1. Мокуємо обрану локацію: Черкаська область (uid: '24')
config.set('locationUid', '24');
config.set('locationTitle', 'Черкаська область');

// Тестовий набір 1: Усі 4 райони Черкаської області активні (дронова загроза)
const all4RaionsAlerts = [
  {
    location_uid: '153',
    location_title: 'Золотоніський район',
    location_type: 'district',
    location_oblast: 'Черкаська область',
    alert_type: 'air_raid',
    alert_level: 'yellow',
    threats: [{ threat_type: 'drones', level: 'yellow', started_at: '2026-09-30T01:43:55Z' }],
    started_at: '2026-09-30T01:43:55Z'
  },
  {
    location_uid: '152',
    location_title: 'Черкаський район',
    location_type: 'district',
    location_oblast: 'Черкаська область',
    alert_type: 'air_raid',
    alert_level: 'yellow',
    threats: [{ threat_type: 'drones', level: 'yellow', started_at: '2026-09-30T02:02:42Z' }],
    started_at: '2026-09-30T02:02:42Z'
  },
  {
    location_uid: '150',
    location_title: 'Звенигородський район',
    location_type: 'district',
    location_oblast: 'Черкаська область',
    alert_type: 'air_raid',
    alert_level: 'yellow',
    threats: [{ threat_type: 'drones', level: 'yellow', started_at: '2026-09-30T04:27:45Z' }],
    started_at: '2026-09-30T04:27:45Z'
  },
  {
    location_uid: '151',
    location_title: 'Уманський район',
    location_type: 'district',
    location_oblast: 'Черкаська область',
    alert_type: 'air_raid',
    alert_level: 'yellow',
    threats: [{ threat_type: 'drones', level: 'yellow', started_at: '2026-09-30T04:40:05Z' }],
    started_at: '2026-09-30T04:40:05Z'
  }
];

apiService._processAlertsPayload(all4RaionsAlerts, { suppressNotification: true });
let state = apiService.getStatus();

assert.strictEqual(state.isAlert, true, 'Очікується isAlert === true коли всі 4 райони області активні');
assert.strictEqual(state.alertLevel, 'yellow', 'Очікується жовтий рівень загрози БПЛА');
assert.strictEqual(state.threatInfo.iconType, 'drone', 'Очікується іконка drone');
assert.strictEqual(state.threatInfo.badgeLabel, 'Дронова загроза', 'Очікується лейбл Дронова загроза');
assert.strictEqual(state.startedAt, '2026-09-30T01:43:55.000Z', 'Очікується найраніший час початку');
console.log('✅ Тест 1 пройдено: Всі 4 райони активні -> статус Повна тривога по області (Дронова загроза)');

// Тестовий набір 2: Лише 3 з 4 районів активні (Уманський район чистий)
const only3RaionsAlerts = all4RaionsAlerts.slice(0, 3);
apiService._processAlertsPayload(only3RaionsAlerts, { suppressNotification: true });
state = apiService.getStatus();

assert.strictEqual(state.isAlert, false, 'Очікується isAlert === false коли не всі райони активні (Варіант 2)');
assert.strictEqual(state.alertLevel, 'none', 'Очікується рівень none');
console.log('✅ Тест 2 пройдено: 3 з 4 районів активні -> статус Немає тривоги (суворе правило всіх районів)');

// Тестовий набір 3: Комбінована загроза (у 3 районах дрони, а в 4-му ракета червоного рівня)
const comboAllRaionsAlerts = [
  ...all4RaionsAlerts.slice(0, 3),
  {
    location_uid: '151',
    location_title: 'Уманський район',
    location_type: 'district',
    location_oblast: 'Черкаська область',
    alert_type: 'air_raid',
    alert_level: 'red',
    threats: [{ threat_type: 'unspecified_missiles', level: 'red', started_at: '2026-09-30T05:00:00Z' }],
    started_at: '2026-09-30T05:00:00Z'
  }
];

apiService._processAlertsPayload(comboAllRaionsAlerts, { suppressNotification: true });
state = apiService.getStatus();

assert.strictEqual(state.isAlert, true, 'Очікується isAlert === true');
assert.strictEqual(state.alertLevel, 'red', 'Очікується червоний рівень загрози через ракету');
assert.strictEqual(state.threatInfo.iconType, 'combo_missile_drone', 'Очікується комбінована іконка ракета+дрон');
assert.strictEqual(state.threatInfo.badgeLabel, 'Ракетна та дронова загроза', 'Очікується комбінований лейбл');
console.log('✅ Тест 3 пройдено: Комбіновані загрози в районах коректно обєднуються для всієї області');

// Тестовий набір 4: Пряма загальнообласна тривога (location_type: 'state')
const directOblastAlert = [
  {
    location_uid: '24',
    location_title: 'Черкаська область',
    location_type: 'state',
    location_oblast: 'Черкаська область',
    alert_type: 'air_raid',
    alert_level: 'red',
    threats: [],
    started_at: '2026-09-30T05:10:00Z'
  }
];

apiService._processAlertsPayload(directOblastAlert, { suppressNotification: true });
state = apiService.getStatus();

assert.strictEqual(state.isAlert, true, 'Очікується isAlert === true при прямому загальнообласному алерті');
assert.strictEqual(state.alertLevel, 'red', 'Очікується red рівень');
console.log('✅ Тест 4 пройдено: Прямий загальнообласний алерт пріоритетно активує тривогу');

// Тестовий набір 5: Відбій (порожній список або тривоги в іншій області)
apiService._processAlertsPayload([], { suppressNotification: true });
state = apiService.getStatus();

assert.strictEqual(state.isAlert, false, 'Очікується isAlert === false при відбої');
console.log('✅ Тест 5 пройдено: Відбій коректно переводить статус у "Немає тривоги"');

// Повертаємо дефолтну локацію (м. Київ, uid: '31')
config.set('locationUid', '31');
config.set('locationTitle', 'м. Київ');

console.log('🎉 Усі тести агрегації тривог по області успішно виконано!');
