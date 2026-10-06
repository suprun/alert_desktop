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
  assert.strictEqual(historyService._formatDuration(0), '0 хв');
  assert.strictEqual(historyService._formatDuration(0.5), '< 1 хв');
  assert.strictEqual(historyService._formatDuration(15), '15 хв');
  assert.strictEqual(historyService._formatDuration(60), '1 год');
  assert.strictEqual(historyService._formatDuration(75), '1 год 15 хв');
  assert.strictEqual(historyService._formatDuration(130), '2 год 10 хв');

  // Тривалість понад добу з відмінками (дні, місяці, роки)
  assert.strictEqual(historyService._formatDuration(1440), '1 день');
  assert.strictEqual(historyService._formatDuration(1500), '1 день 1 година');
  assert.strictEqual(historyService._formatDuration(2880), '2 дні');
  assert.strictEqual(historyService._formatDuration(1440 * 5), '5 днів');
  assert.strictEqual(historyService._formatDuration(1440 * 21), '21 день');
  assert.strictEqual(historyService._formatDuration(1440 * 22), '22 дні');
  assert.strictEqual(historyService._formatDuration(1440 * 30), '1 місяць');
  assert.strictEqual(historyService._formatDuration(1440 * 45), '1 місяць 15 днів');
  assert.strictEqual(historyService._formatDuration(1440 * 62), '2 місяці 2 дні');
  assert.strictEqual(historyService._formatDuration(1440 * 365), '1 рік');
  assert.strictEqual(historyService._formatDuration(1440 * 365 * 2 + 1440 * 30 * 3 + 1440 * 4), '2 роки 3 місяці 4 дні');
  assert.strictEqual(historyService._formatDuration(39479 * 60 + 25), '4 роки 6 місяців 4 дні');
  console.log("✔ Тест 1 пройдено (форматування тривалості українською: хвилини, години, дні, місяці та роки з відмінками)");

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

  // Тест 6: Сувора дедуплікація та виключення дублів між alerts та alert_events
  historyService._fallbackStats = [{ luid: 120, ac: 1, d: 600000, a: false }];
  historyService._fallbackActiveAlerts = [];
  historyService._fallbackAlerts = [
    { i: 201, luid: 120, s: 151200000, at: 1, loi: 2 } // Алерт
  ];
  historyService._fallbackEvents = [
    { i: 901, luid: 120, s: 151200000, at: 1, loi: 2 }, // Дублікат події з тим самим luid і s
    { i: 902, luid: 120, f: 151201000, loi: 2 }          // Подія відбою без s (не повинна створювати окрему картку!)
  ];

  const dedupRes = historyService._buildFallbackResponse('120', '2');
  assert.strictEqual(dedupRes.recentAlerts.length, 1, 'Повинна бути рівно одна картка тривоги після дедуплікації');
  assert.strictEqual(dedupRes.recentAlerts[0].finishedAt, 1640000000 + 151201000, 'Відбій має оновити тривогу');
  assert.strictEqual(dedupRes.recentAlerts[0].durationMin, 17, 'Тривалість має розрахуватися коректно');
  console.log("✔ Тест 6 пройдено (сувора дедуплікація та відсутність дублікатів карток)");

  // Тест 7: Ізоляція обраного району від сусідніх районів тієї ж області (захист від хибного loi-збігу)
  historyService._fallbackAlerts = [
    { i: 201, luid: 120, s: 151200000, f: 151201000, t: 'r', loi: 2 }, // Жмеринський район (наш)
    { i: 202, luid: 121, s: 151200050, f: 151201000, t: 'r', loi: 2 }, // Могилів-Подільський район (чужий)
    { i: 203, luid: 2,   s: 151250000, f: 151251000, t: 's', loi: 2 }  // Загальнообласна тривога Вінницької обл (має включитися)
  ];
  historyService._fallbackEvents = [];
  historyService._fallbackActiveAlerts = [];

  const isolateRes = historyService._buildFallbackResponse('120', '2');
  assert.strictEqual(isolateRes.recentAlerts.length, 2, 'Має включити тільки тривогу свого району та загальнообласну');
  assert(isolateRes.recentAlerts.some(a => a.id === 201), 'Має бути свій район (201)');
  assert(isolateRes.recentAlerts.some(a => a.id === 203), 'Має бути область (203)');
  assert(!isolateRes.recentAlerts.some(a => a.id === 202), 'Не має бути чужого району 202');
  console.log("✔ Тест 7 пройдено (ізоляція обраного району від сусідніх районів області)");

  // Тест 8: Включення тривог громад обраного району (ієрархічний збіг hromadasByRaionUid)
  historyService._fallbackAlerts = [
    { i: 301, luid: 711, s: 151210000, t: 'c', loi: 14 }, // Білоцерківська громада (входить до Білоцерківського р-ну 73)
    { i: 302, luid: 712, s: 151210100, t: 'c', loi: 14 }, // Володарська громада (входить до Білоцерківського р-ну 73)
    { i: 303, luid: 724, s: 151210200, t: 'c', loi: 14 }  // Громада іншого району Київської обл (чужа)
  ];
  historyService._fallbackEvents = [];
  historyService._fallbackActiveAlerts = [];
  historyService._observedAlerts.clear();

  const raionRes = historyService._buildFallbackResponse('73', '14');
  assert.strictEqual(raionRes.recentAlerts.length, 2, 'Має включити тривоги 2 громад, що належать до Білоцерківського р-ну');
  assert(raionRes.recentAlerts.some(a => a.id === 301), 'Має бути громада 711');
  assert(raionRes.recentAlerts.some(a => a.id === 302), 'Має бути громада 712');
  assert(!raionRes.recentAlerts.some(a => a.id === 303), 'Не має бути громади чужого району 724');
  console.log("✔ Тест 8 пройдено (ієрархічне включення тривог дочірніх громад обраного району)");

  // Тест 9: Перевірка коректного порожнього durationFormatted при 0 тривог (без безглуздого '0 хв')
  historyService._fallbackAlerts = [];
  historyService._fallbackActiveAlerts = [];
  historyService._fallbackEvents = [];
  historyService._fallbackStats = [{ luid: 73, ac: 0, d: 0, a: false }];
  historyService._observedAlerts.clear();

  const zeroStatsRes = historyService._buildFallbackResponse('73', '14');
  assert.strictEqual(zeroStatsRes.todayStats.alertCount, 0);
  assert.strictEqual(zeroStatsRes.todayStats.durationFormatted, '', 'durationFormatted має бути порожнім рядком коли 0 тривог');
  assert.strictEqual(zeroStatsRes.recentAlerts.length, 0);
  console.log("✔ Тест 9 пройдено (при 0 тривог durationFormatted порожній, що дозволяє показати «Сьогодні тривог не зафіксовано»)");

  // Тест 10: Накопичувальний буфер спостережуваних тривог (ліміт: 500) та видача до 20 тривог
  historyService._observedAlerts.clear();
  historyService._fallbackActiveAlerts = [];
  for (let i = 1; i <= 550; i++) {
    historyService._recordAlert({
      i: 1000 + i,
      luid: 73,
      s: 151000000 + i * 3600,
      f: 151000000 + i * 3600 + 600,
      at: 1
    });
  }
  assert.strictEqual(historyService._observedAlerts.size, 500, 'Розмір буфера має бути обмежений рівно 500 записами');
  const bufferSliceRes = historyService._buildFallbackResponse('73', '14');
  assert.strictEqual(bufferSliceRes.recentAlerts.length, 20, 'recentAlerts має повертати до 20 останніх тривог');
  assert.strictEqual(bufferSliceRes.recentAlerts[0].id, 1550, 'Першою має бути найновіша тривога');
  console.log("✔ Тест 10 пройдено (буфер тривог обмежений 500 елементами, recentAlerts повертає 20 найновіших тривог)");

  // Тест 11: Консолідація одночасних записів («тривога —> загроза») без подвоєння у статистиці
  historyService._observedAlerts.clear();
  historyService._fallbackActiveAlerts = [];
  historyService._fallbackStats = [{ luid: 400, ac: 2, d: 3240000, a: true }]; // Сирий статус міг містити подвійний запис
  const sCommon = Math.floor(Date.now() / 1000) - 1640000000 - 1620; // 27 хвилин тому
  historyService._fallbackAlerts = [
    { i: 881, luid: 400, s: sCommon, at: 4, loi: 10 }, // Район: Дронова загроза (at: 4)
    { i: 882, luid: 10, s: sCommon, at: 1, loi: 10, t: 's' } // Область: Повітряна тривога (at: 1)
  ];
  historyService._fallbackEvents = [];

  const consolidatedRes = historyService._buildFallbackResponse('400', '10');
  assert.strictEqual(consolidatedRes.recentAlerts.length, 1, 'Повинна бути рівно одна об\'єднана картка тривоги');
  assert.strictEqual(consolidatedRes.recentAlerts[0].threatType, 4, 'Пріоритет загрози має бути за конкретною загрозою (Дрони = 4)');
  assert.strictEqual(consolidatedRes.recentAlerts[0].threatLabel, 'Дронова загроза');
  assert.strictEqual(consolidatedRes.recentAlerts[0].isActive, true);
  assert.strictEqual(consolidatedRes.todayStats.alertCount, 1, 'Кількість тривог сьогодні має бути 1, а не 2');
  assert.strictEqual(consolidatedRes.todayStats.totalDurationMin, 27, 'Тривалість має бути 27 хв, а не подвоєні 54 хв');
  console.log("✔ Тест 11 пройдено (інтелектуальне об'єднання «тривога —> загроза» без дублювання карток і подвоєння часу)");

  // Тест 12: Підтримка active.json, lruid (громади району) та типу області t: 'o'
  historyService._observedAlerts.clear();
  historyService._fallbackAlerts = [];
  historyService._fallbackEvents = [];
  historyService._fallbackStats = [];
  historyService._fallbackActiveAlerts = [
    {
      i: 991,
      luid: 1313, // Вовчанська громада
      lruid: 122,  // Чугуївський район
      loi: 20,    // Харківська область
      s: sCommon,
      at: 1,
      t: 'c'
    },
    {
      i: 992,
      luid: 20,   // Харківська область
      loi: 20,
      s: sCommon,
      at: 1,
      t: 'o'      // Загальнообласна тривога з типом 'o'
    }
  ];

  const activeRaionRes = historyService._buildFallbackResponse('122', '20');
  assert.ok(activeRaionRes.recentAlerts.length > 0, 'Для району мають знаходитися активні тривоги його громад через lruid або область');
  assert.strictEqual(activeRaionRes.todayStats.isActive, true, 'Район має бути позначений як активний');
  assert.strictEqual(activeRaionRes.recentAlerts[0].isActive, true);
  console.log("✔ Тест 12 пройдено (підтримка active.json, пошук за lruid громад для районів та обробка t: 'o')");

  console.log("🎉 Усі тести сервісу історії успішно пройдено!\n");
}

runTests().catch((err) => {
  console.error("❌ Помилка в тестах HistoryService:", err);
  process.exit(1);
});
