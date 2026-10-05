const assert = require('assert');
const config = require('../src/main/config');
const apiService = require('../src/main/api');
const netCheck = require('../src/main/net-check');

console.log('🧪 Запуск тестів стійкості Fallback API та перевірки зв\'язку...');

async function runTests() {
  const originalFetch = apiService._fetchFromProvider.bind(apiService);
  const originalNetCheck = netCheck.checkInternetConnectivity;

  async function waitIdle() {
    while (apiService.isChecking) {
      await new Promise(r => setTimeout(r, 20));
    }
  }

  try {
    // Зупиняємо фоновий полінг на час тестів
    apiService.stopPolling();
    await waitIdle();

    // -------------------------------------------------------------
    // Тест 1: Штатна робота — основний провайдер відповідає успішно
    // -------------------------------------------------------------
    apiService._fetchFromProvider = async (provider) => {
      if (provider === 'neptun') {
        return [
          {
            location_uid: '31',
            location_title: 'м. Київ',
            location_type: 'city',
            alert_type: 'air_raid',
            alert_level: 'red',
            threats: [],
            started_at: new Date().toISOString()
          }
        ];
      }
      throw new Error(`Should not be called: ${provider}`);
    };

    config.set('apiProvider', 'neptun');
    config.set('enableFallback', true);
    await waitIdle();

    await apiService.checkNow({ suppressNotification: true });
    let state = apiService.getStatus();
    assert.strictEqual(state.isOffline, false, 'Штатний режим: isOffline === false');
    assert.strictEqual(state.fallbackActive, false, 'Штатний режим: fallbackActive === false');
    assert.strictEqual(state.activeProvider, 'neptun', 'activeProvider має бути neptun');
    assert.strictEqual(state.offlineReason, null);
    console.log('✔ Тест 1 пройдено (штатна робота основного провайдера без fallback)');

    // -------------------------------------------------------------
    // Тест 2: Основний провайдер падає, інтернет Є -> успішний перехід на Fallback
    // За порядком якості: gateway, Alerts.in.ua (з токеном), UkraineAlarm (з токеном), neptun, ubilling, jaam
    // При primary = 'neptun' та відсутності токенів першим резервним є 'gateway'
    // -------------------------------------------------------------
    const callLog = [];
    apiService._fetchFromProvider = async (provider) => {
      callLog.push(provider);
      if (provider === 'neptun') {
        throw new Error('502 Bad Gateway from Neptun');
      }
      if (provider === 'gateway') {
        return [
          {
            location_uid: '31',
            location_title: 'м. Київ',
            location_type: 'city',
            alert_type: 'air_raid',
            alert_level: 'red',
            threats: [],
            started_at: new Date().toISOString()
          }
        ];
      }
      throw new Error(`Unexpected provider call: ${provider}`);
    };

    config.set('apiProvider', 'neptun');
    config.set('apiKey', '');
    config.set('enableFallback', true);
    await waitIdle();
    callLog.length = 0; // очищаємо можливі виклики від listener

    await apiService.checkNow({ suppressNotification: true });
    state = apiService.getStatus();
    assert.strictEqual(state.isOffline, false, 'При успішному fallback стан не повинен бути offline');
    assert.strictEqual(state.fallbackActive, true, 'Має бути активовано fallbackActive === true');
    assert.strictEqual(state.activeProvider, 'gateway', 'Резервним активним провайдером має бути gateway');
    assert.deepStrictEqual(callLog, ['neptun', 'gateway'], 'Порядок викликів: спочатку primary neptun, потім fallback gateway');
    console.log('✔ Тест 2 пройдено (автоматичний перехід на резервний gateway при збої neptun)');

    // -------------------------------------------------------------
    // Тест 3: Основний провайдер падає, і інтернету НЕМАЄ
    // Резервні API НЕ повинні опитуватися!
    // -------------------------------------------------------------
    callLog.length = 0;
    netCheck.checkInternetConnectivity = async () => ({ connected: false, host: null });

    apiService._fetchFromProvider = async (provider) => {
      callLog.push(provider);
      throw new Error('Connection refused');
    };
    await waitIdle();
    callLog.length = 0;

    await apiService.checkNow({ suppressNotification: true });
    state = apiService.getStatus();
    assert.strictEqual(state.isOffline, true, 'При відсутності інтернету isOffline === true');
    assert.strictEqual(state.offlineReason, 'no_internet', 'offlineReason має бути no_internet');
    assert.strictEqual(state.fallbackActive, false);
    assert.deepStrictEqual(callLog, ['neptun'], 'Fallback API не повинні викликатися при відсутності інтернету!');
    console.log('✔ Тест 3 пройдено (при відсутності інтернету фіксується офлайн без марних fallback-запитів)');

    // Відновлюємо netCheck
    netCheck.checkInternetConnectivity = originalNetCheck;

    // -------------------------------------------------------------
    // Тест 4: Основний провайдер падає, інтернет Є, але enableFallback === false (суворий режим)
    // Fallback НЕ повинен викликатися!
    // -------------------------------------------------------------
    config.set('enableFallback', false);
    await waitIdle();
    callLog.length = 0;

    apiService._fetchFromProvider = async (provider) => {
      callLog.push(provider);
      throw new Error('Neptun timeout');
    };

    await apiService.checkNow({ suppressNotification: true });
    state = apiService.getStatus();
    assert.strictEqual(state.isOffline, true, 'При вимкненому fallback статус стає офлайн');
    assert.strictEqual(state.offlineReason, 'primary_down', 'offlineReason має бути primary_down');
    assert.strictEqual(state.fallbackActive, false);
    assert.deepStrictEqual(callLog, ['neptun'], 'При enableFallback: false резервні джерела не опитуються');
    console.log('✔ Тест 4 пройдено (суворий режим: enableFallback: false блокує перехід на сторонні API)');

    // -------------------------------------------------------------
    // Тест 5: Включення токенних API (Alerts.in.ua та UkraineAlarm) до fallback
    // -------------------------------------------------------------
    apiService._fetchFromProvider = async (provider) => {
      callLog.push(provider);
      if (provider === 'gateway') throw new Error('Gateway 500 Error');
      if (provider === 'alertsinua') {
        // Успішна відповідь від alerts.in.ua
        return [
          {
            location_uid: '31',
            location_title: 'м. Київ',
            location_type: 'city',
            alert_type: 'air_raid',
            alert_level: 'red',
            threats: [],
            started_at: new Date().toISOString()
          }
        ];
      }
      throw new Error(`Unexpected: ${provider}`);
    };

    config.set('apiProvider', 'gateway');
    config.set('apiKey', 'dummy-token-12345');
    config.set('enableFallback', true);
    await waitIdle();
    callLog.length = 0;

    await apiService.checkNow({ suppressNotification: true });
    state = apiService.getStatus();
    assert.strictEqual(state.isOffline, false);
    assert.strictEqual(state.fallbackActive, true);
    assert.strictEqual(state.activeProvider, 'alertsinua');
    assert.deepStrictEqual(callLog, ['gateway', 'alertsinua'], 'При наявності токена alertsinua викликається другим за черговістю');
    console.log('✔ Тест 5 пройдено (токенні API коректно залучаються до fallback-ланцюжка)');

    // -------------------------------------------------------------
    // Тест 6: Автоматичне повернення на основний провайдер після відновлення
    // -------------------------------------------------------------
    apiService._fetchFromProvider = async (provider) => {
      callLog.push(provider);
      if (provider === 'gateway') {
        return [
          {
            location_uid: '31',
            location_title: 'м. Київ',
            location_type: 'city',
            alert_type: 'air_raid',
            alert_level: 'red',
            threats: [],
            started_at: new Date().toISOString()
          }
        ];
      }
      throw new Error(`Unexpected: ${provider}`);
    };

    config.set('apiKey', '');
    await waitIdle();
    callLog.length = 0;

    await apiService.checkNow({ suppressNotification: true });
    state = apiService.getStatus();
    assert.strictEqual(state.isOffline, false);
    assert.strictEqual(state.fallbackActive, false, 'Після оживлення основного API fallbackActive скидається на false');
    assert.strictEqual(state.activeProvider, 'gateway', 'Активне джерело повернулося на primary gateway');
    assert.strictEqual(state.offlineReason, null);
    assert.deepStrictEqual(callLog, ['gateway'], 'Після відновлення опитується виключно primary');
    console.log('✔ Тест 6 пройдено (автоматичне повернення на primary при відновленні роботи)');

    // Відновлення початкового стану
    config.set('apiProvider', 'gateway');
    config.set('apiKey', '');
    config.set('enableFallback', true);
    config.set('locationUid', '31');
    config.set('locationTitle', 'м. Київ');
    apiService._fetchFromProvider = originalFetch;

    console.log('🎉 Усі тести стійкості Fallback API успішно пройдено!');
  } finally {
    apiService._fetchFromProvider = originalFetch;
    netCheck.checkInternetConnectivity = originalNetCheck;
  }
}

runTests().catch(err => {
  console.error('❌ Помилка тестування fallback resilience:', err);
  process.exit(1);
});
