const assert = require('assert');
const { formatThreatInfo, cleanSourceMessage } = require('../src/main/threat-utils');

console.log('Testing threat-utils formatting...');

// Тест 0: Очищення повідомлення від суфіксів
{
  assert.strictEqual(cleanSourceMessage('Дронова загроза (жовтий рівень)'), 'Дронова загроза');
  assert.strictEqual(cleanSourceMessage('Ракетна небезпека (червоний рівень)'), 'Ракетна небезпека');
  assert.strictEqual(cleanSourceMessage('[Загроза балістики]'), 'Загроза балістики');
  console.log('✔ Тест 0 пройдено (cleanSourceMessage)');
}

// Тест 1: Дронова загроза (жовтий рівень)
{
  const threats = [{ source_message: 'Дронова загроза (жовтий рівень)' }];
  const res = formatThreatInfo(threats, 'air_raid', 'yellow');
  assert.strictEqual(res.badgeLabel, 'Дрони');
  assert.strictEqual(res.iconType, 'drone');
  assert.strictEqual(res.tooltipSuffix, 'Дрони');
  assert.strictEqual(res.notificationText, 'Дрони. Загроза ударних БПЛА. Оцініть безпекову ситуацію.');
  console.log('✔ Тест 1 пройдено (Дронова загроза жовтий рівень)');
}

// Тест 2: Ракетна небезпека (червоний рівень)
{
  const threats = [{ source_message: 'Ракетна небезпека (червоний рівень)' }];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.badgeLabel, 'Ракети');
  assert.strictEqual(res.iconType, 'missile');
  assert.strictEqual(res.tooltipSuffix, 'Ракети');
  assert.strictEqual(res.notificationText, 'Ракети. Загроза ракетного удару. Негайно прямуйте в укриття!');
  console.log('✔ Тест 2 пройдено (Ракетна небезпека червоний рівень)');
}

// Тест 3: Загроза балістичного озброєння
{
  const threats = [{ source_message: 'Загроза застосування балістичного озброєння з півдня' }];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.badgeLabel, 'Балістика');
  assert.strictEqual(res.iconType, 'ballistic');
  assert.strictEqual(res.tooltipSuffix, 'Балістика');
  assert.strictEqual(res.notificationText, 'Балістика. Загроза застосування балістичного озброєння!');
  console.log('✔ Тест 3 пройдено (Балістичне озброєння)');
}

// Тест 4: КАБ / Тактична авіація
{
  const threats = [{ source_message: 'Пуски керованих авіаційних бомб тактичною авіацією' }];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.badgeLabel, 'Пуски КАБ');
  assert.strictEqual(res.iconType, 'aviation');
  assert.strictEqual(res.tooltipSuffix, 'Пуски КАБ');
  console.log('✔ Тест 4 пройдено (Пуски КАБ)');
}

// Тест 5: Кілька загроз одночасно (дрони + ракети)
{
  const threats = [
    { source_message: 'Дронова загроза (жовтий рівень)' },
    { source_message: 'Ракетна загроза' }
  ];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.badgeLabel, 'Дрони, Ракети');
  assert.strictEqual(res.tooltipSuffix, 'Дрони, Ракети');
  console.log('✔ Тест 5 пройдено (Декілька загроз)');
}

// Тест 6: Артобстріл
{
  const threats = [];
  const res = formatThreatInfo(threats, 'artillery_shelling', 'red');
  assert.strictEqual(res.badgeLabel, 'Артобстріл');
  assert.strictEqual(res.iconType, 'artillery');
  assert.strictEqual(res.tooltipSuffix, 'Артобстріл');
  assert.strictEqual(res.notificationText, 'Загроза артилерійського обстрілу. Перебувайте в укриттях!');
  console.log('✔ Тест 6 пройдено (Артобстріл)');
}

// Тест 7: Звичайна тривога без деталізації
{
  const threats = [];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.hasThreats, false);
  assert.strictEqual(res.badgeLabel, '');
  assert.strictEqual(res.tooltipSuffix, '');
  assert.strictEqual(res.notificationText, 'Негайно пройдіть в найближче укриття!');
  console.log('✔ Тест 7 пройдено (Звичайна тривога без загроз)');
}

console.log('All threat-utils unit tests passed successfully!');
