const assert = require('assert');
const { checkInternetConnectivity, probeSocket } = require('../src/main/net-check');

console.log('🧪 Запуск тестів модуля перевірки зв\'язку (net-check)...');

async function runTests() {
  // Тест 1: Перевірка зв'язку з дійсними Anycast IP Google та Cloudflare
  const result = await checkInternetConnectivity({ timeout: 2500, force: true });
  assert.strictEqual(typeof result.connected, 'boolean', 'connected має бути булевим значенням');
  assert.strictEqual(result.connected, true, 'Інтернет має бути доступний');
  assert.ok(result.host === '1.1.1.1' || result.host === '8.8.8.8' || result.host === '1.0.0.1' || result.host === '8.8.4.4', 'Host має бути Anycast IP Google або Cloudflare');
  assert.ok(result.provider === 'Cloudflare' || result.provider === 'Google', 'Provider має бути Cloudflare або Google');
  assert.ok(result.latencyMs >= 0, 'Затримка latencyMs має бути невід\'ємною');
  console.log(`✔ Тест 1 пройдено (успішне з'єднання з ${result.provider} ${result.host} за ${result.latencyMs} мс)`);

  // Тест 2: Кешування результату
  const cachedResult = await checkInternetConnectivity();
  assert.strictEqual(cachedResult.cached, true, 'Повторний швидкий виклик має повертати кешований результат');
  assert.strictEqual(cachedResult.connected, true);
  console.log('✔ Тест 2 пройдено (кешування результату перевірки)');

  // Тест 3: Обробка недоступного порту/хоста
  // 192.0.2.1 — тестовий блок документації TEST-NET-1 (RFC 5737), що гарантовано не маршрутизується
  let failed = false;
  try {
    await probeSocket({ host: '192.0.2.1', port: 81, provider: 'TestDummy' }, 300);
  } catch (err) {
    failed = true;
  }
  assert.strictEqual(failed, true, 'Недоступний хост має викликати виняток (reject)');
  console.log('✔ Тест 3 пройдено (коректна обробка таймауту/помилки для недоступного хоста)');

  console.log('🎉 Усі тести модуля net-check успішно пройдено!');
}

runTests().catch(err => {
  console.error('❌ Помилка тестування net-check:', err);
  process.exit(1);
});
