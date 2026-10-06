const assert = require('assert');
const api = require('../src/main/api');

console.log('🧪 Запуск тестів перевірки API-токенів...');

const originalFetch = global.fetch;

function jsonResponse(status, data = []) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  };
}

async function run() {
  let capturedRequest = null;

  global.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return jsonResponse(200);
  };

  const ukraineAlarmResult = await api.verifyApiToken('ukrainealarm', 'ua-test-token');
  assert.strictEqual(ukraineAlarmResult.success, true);
  assert.strictEqual(capturedRequest.url, 'https://api.ukrainealarm.com/api/v3/alerts');
  assert.strictEqual(capturedRequest.options.headers.Authorization, 'ua-test-token');
  assert.strictEqual(
    api.isApiTokenTrusted({ devMode: true, apiProvider: 'ukrainealarm', apiKey: 'ua-test-token' }),
    true,
    'Успішно перевірений токен UkraineAlarm має дозволяти збереження'
  );

  const alertsInUaResult = await api.verifyApiToken('alertsinua', 'alerts-test-token');
  assert.strictEqual(alertsInUaResult.success, true);
  assert.strictEqual(capturedRequest.url, 'https://api.alerts.in.ua/v1/alerts/active.json');
  assert.strictEqual(capturedRequest.options.headers.Authorization, 'Bearer alerts-test-token');

  global.fetch = async () => jsonResponse(401);
  const invalidResult = await api.verifyApiToken('ukrainealarm', 'invalid-token');
  assert.deepStrictEqual(
    { success: invalidResult.success, reason: invalidResult.reason },
    { success: false, reason: 'invalid_token' }
  );
  assert.strictEqual(
    api.isApiTokenTrusted({ devMode: true, apiProvider: 'ukrainealarm', apiKey: 'invalid-token' }),
    false,
    'Неперевірений токен не повинен дозволяти збереження'
  );

  global.fetch = async () => jsonResponse(503);
  const serverResult = await api.verifyApiToken('alertsinua', 'server-test-token');
  assert.strictEqual(serverResult.reason, 'server_error');

  global.fetch = async () => {
    throw new TypeError('network unavailable');
  };
  const networkResult = await api.verifyApiToken('alertsinua', 'network-test-token');
  assert.strictEqual(networkResult.reason, 'network_error');

  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });
  const timeoutResult = await api.verifyApiToken('ukrainealarm', 'timeout-test-token', 5);
  assert.strictEqual(timeoutResult.reason, 'timeout');

  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('bad json');
    }
  });
  const invalidResponseResult = await api.verifyApiToken('ukrainealarm', 'json-test-token');
  assert.strictEqual(invalidResponseResult.reason, 'invalid_response');

  assert.strictEqual(
    api.isApiTokenTrusted({ devMode: true, apiProvider: 'gateway', apiKey: '' }),
    true,
    'Безтокенний API не повинен блокувати збереження'
  );

  console.log('✔ Заголовки авторизації, помилки та захист збереження перевірено');
  console.log('🎉 Усі тести API-токенів успішно виконано!');
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = originalFetch;
  });
