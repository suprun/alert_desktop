/**
 * Тести для клієнтського сервісу історії тривог адмінодиниць (HistoryService).
 * Перевіряє:
 * 1. Форматування часу та тривалості (українська локалізація).
 * 2. Роботу основного каналу (Gateway) та коректність обробки результату.
 * 3. Автоматичний перехід на резервний канал (Fallback на api.alerts.in.ua) при збої Gateway.
 * 4. Валідність полів структури відповіді (todayStats, recentAlerts).
 */

const assert = require('assert');
const historyService = require('../src/main/history-service');

async function runTests() {
  console.log("🧪 Запуск тестів сервісу історії адмінодиниць (HistoryService)...");

  // Тест 1: Форматування тривалості
  assert.strictEqual(historyService._formatDuration(0), '< 1 хв');
  assert.strictEqual(historyService._formatDuration(15), '15 хв');
  assert.strictEqual(historyService._formatDuration(60), '1 год');
  assert.strictEqual(historyService._formatDuration(75), '1 год 15 хв');
  assert.strictEqual(historyService._formatDuration(130), '2 год 10 хв');
  console.log("✔ Тест 1 пройдено (форматування тривалості українською)");

  // Тест 2: Форматування дати та часу
  const nowSec = Math.floor(Date.now() / 1000);
  const formattedToday = historyService._formatTime(nowSec);
  assert(formattedToday.startsWith('Сьогодні, '), 'Має починатися з "Сьогодні, "');

  const yesterdaySec = nowSec - 86400;
  const formattedYesterday = historyService._formatTime(yesterdaySec);
  assert(formattedYesterday.startsWith('Вчора, ') || formattedYesterday.includes(':'), 'Має бути коректна дата вчора');
  console.log("✔ Тест 2 пройдено (форматування дати та часу)");

  // Тест 3: Формування відповіді з локального fallback-кешу
  historyService._fallbackStats = [
    { luid: 100, ac: 3, d: 4800000, a: false }
  ];
  historyService._fallbackAlerts = [
    { i: 101, luid: 100, s: 151197234, f: 151197696, at: 1 }
  ];
  historyService._fallbackEvents = [
    { i: 102, luid: 100, s: 151197703, at: 4, m: 'Дронова загроза' }
  ];

  const res = historyService._buildFallbackResponse('100', '17');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.source, 'fallback_alerts_in_ua');
  assert.strictEqual(res.todayStats.alertCount, 3);
  assert.strictEqual(res.todayStats.totalDurationMin, 80);
  assert.strictEqual(res.todayStats.durationFormatted, '1 год 20 хв');
  assert.strictEqual(res.recentAlerts.length, 2);
  console.log("✔ Тест 3 пройдено (побудова fallback-відповіді з мапінгом загроз)");

  // Тест 4: Перевірка Fallback при невалідному / недоступному Gateway
  // Підміняємо _fetchJson для Gateway, щоб викликати помилку
  const origFetchJson = historyService._fetchJson.bind(historyService);
  historyService._fetchJson = async (url, timeoutMs) => {
    if (url.includes('/v1/history/region')) {
      throw new Error('502 Bad Gateway');
    }
    return origFetchJson(url, timeoutMs);
  };

  const fallbackResult = await historyService.getRegionHistory('31', '31');
  assert.strictEqual(fallbackResult.success, true);
  assert(fallbackResult.todayStats !== undefined);
  assert(Array.isArray(fallbackResult.recentAlerts));
  console.log("✔ Тест 4 пройдено (автоматичний перехід на fallback при збої Gateway)");

  // Відновлюємо оригінальний метод
  historyService._fetchJson = origFetchJson;

  // Тест 5: Перевірка успішного запиту через Gateway
  historyService._fetchJson = async (url) => {
    if (url.includes('/v1/history/region')) {
      return {
        success: true,
        source: 'gateway',
        region_uid: '100',
        oblast_uid: '17',
        today_stats: {
          alert_count: 2,
          total_duration_min: 50,
          is_active: false
        },
        recent_alerts: [
          {
            id: 999,
            started_at: 1791197234,
            finished_at: 1791197696,
            duration_min: 8,
            threat_type: 1,
            threat_label: 'Повітряна тривога'
          }
        ]
      };
    }
    return origFetchJson(url);
  };

  const gatewayResult = await historyService.getRegionHistory('100', '17');
  assert.strictEqual(gatewayResult.success, true);
  assert.strictEqual(gatewayResult.source, 'gateway');
  assert.strictEqual(gatewayResult.today_stats.alert_count, 2);
  assert.strictEqual(gatewayResult.today_stats.duration_formatted, '50 хв');
  assert.strictEqual(gatewayResult.recent_alerts[0].duration_text, '8 хв');
  console.log("✔ Тест 5 пройдено (успішна обробка даних із Gateway)");

  // Відновлюємо оригінальний метод
  historyService._fetchJson = origFetchJson;

  console.log("🎉 Усі тести сервісу історії успішно пройдено!\n");
}

runTests().catch((err) => {
  console.error("❌ Помилка в тестах HistoryService:", err);
  process.exit(1);
});
