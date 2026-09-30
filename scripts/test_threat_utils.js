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
  assert.strictEqual(res.badgeLabel, 'Дронова загроза');
  assert.strictEqual(res.iconType, 'drone');
  assert.strictEqual(res.tooltipSuffix, 'Дронова загроза');
  assert.strictEqual(res.notificationText, 'Дронова загроза. Загроза ударних БПЛА. Оцініть безпекову ситуацію.');
  console.log('✔ Тест 1 пройдено (Дронова загроза жовтий рівень)');
}

// Тест 2: Ракетна небезпека (червоний рівень)
{
  const threats = [{ source_message: 'Ракетна небезпека (червоний рівень)' }];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.badgeLabel, 'Ракетна загроза');
  assert.strictEqual(res.iconType, 'missile');
  assert.strictEqual(res.tooltipSuffix, 'Ракетна загроза');
  assert.strictEqual(res.notificationText, 'Ракетна загроза. Загроза ракетного удару. Негайно прямуйте в укриття!');
  console.log('✔ Тест 2 пройдено (Ракетна небезпека червоний рівень)');
}

// Тест 3: Загроза балістичного озброєння
{
  const threats = [{ source_message: 'Загроза застосування балістичного озброєння з півдня' }];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.badgeLabel, 'Загроза балістики');
  assert.strictEqual(res.iconType, 'ballistic');
  assert.strictEqual(res.tooltipSuffix, 'Загроза балістики');
  assert.strictEqual(res.notificationText, 'Загроза балістики. Загроза застосування балістичного озброєння!');
  console.log('✔ Тест 3 пройдено (Балістичне озброєння)');
}

// Тест 4: КАБ / Тактична авіація
{
  const threats = [{ source_message: 'Пуски керованих авіаційних бомб тактичною авіацією' }];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.badgeLabel, 'Загроза пусків КАБ');
  assert.strictEqual(res.iconType, 'aviation');
  assert.strictEqual(res.tooltipSuffix, 'Загроза пусків КАБ');
  console.log('✔ Тест 4 пройдено (Пуски КАБ)');
}

// Тест 5: Кілька загроз одночасно (дрони + ракети)
{
  const threats = [
    { source_message: 'Дронова загроза (жовтий рівень)' },
    { source_message: 'Ракетна загроза' }
  ];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.badgeLabel, 'Ракетна та дронова загроза');
  assert.strictEqual(res.tooltipSuffix, 'Ракетна та дронова загроза');
  assert.strictEqual(res.iconType, 'combo_missile_drone');
  assert.strictEqual(res.isCombined, true);
  assert.deepStrictEqual(res.iconTypes, ['missile', 'drone']);

  // Перевірка симетрії: якщо першою прийшла ракета, результат має бути ідентичним
  const threatsReverse = [
    { source_message: 'Ракетна загроза' },
    { source_message: 'Дронова загроза (жовтий рівень)' }
  ];
  const resReverse = formatThreatInfo(threatsReverse, 'air_raid', 'red');
  assert.strictEqual(resReverse.badgeLabel, 'Ракетна та дронова загроза');
  assert.strictEqual(resReverse.iconType, 'combo_missile_drone');
  assert.strictEqual(resReverse.isCombined, true);
  assert.deepStrictEqual(resReverse.iconTypes, ['missile', 'drone']);
  console.log('✔ Тест 5 пройдено (Декілька загроз: combo_missile_drone та симетрія черговості)');
}

// Тест 6: Артобстріл
{
  const threats = [];
  const res = formatThreatInfo(threats, 'artillery_shelling', 'red');
  assert.strictEqual(res.badgeLabel, 'Загроза артобстрілу');
  assert.strictEqual(res.iconType, 'artillery');
  assert.strictEqual(res.tooltipSuffix, 'Загроза артобстрілу');
  assert.strictEqual(res.notificationText, 'Загроза артилерійського обстрілу. Перебувайте в укриттях!');
  console.log('✔ Тест 6 пройдено (Артобстріл)');
}

// Тест 7: Звичайна тривога без деталізації
{
  const threats = [];
  const res = formatThreatInfo(threats, 'air_raid', 'red');
  assert.strictEqual(res.hasThreats, false);
  assert.strictEqual(res.badgeLabel, 'Повітряна тривога');
  assert.strictEqual(res.tooltipSuffix, 'Повітряна тривога');
  assert.strictEqual(res.notificationText, 'Повітряна тривога. Негайно пройдіть в найближче укриття!');
  console.log('✔ Тест 7 пройдено (Звичайна тривога без додаткових загроз)');
}

console.log('All threat-utils unit tests passed successfully!');
