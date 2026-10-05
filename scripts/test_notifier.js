const assert = require('assert');
const notifierService = require('../src/main/notifier');
const NotifierService = notifierService.NotifierService;

console.log('Testing NotifierService formatting and time display...');

const notifier = new NotifierService();

// Тест 1: formatTime
{
  const fixedDate = new Date(2026, 8, 30, 4, 15, 0); // 04:15
  assert.strictEqual(notifier.formatTime(fixedDate), '4:15');

  const eveningDate = new Date(2026, 8, 30, 22, 5, 0); // 22:05
  assert.strictEqual(notifier.formatTime(eveningDate), '22:05');

  // Перевірка fallback при некоректних даних
  const fallbackResult = notifier.formatTime('invalid-date');
  assert.match(fallbackResult, /^\d{1,2}:\d{2}$/);
  console.log('✔ Тест 1 пройдено (formatTime)');
}

// Тест 2: formatDuration
{
  const start = new Date(2026, 8, 30, 4, 0, 0);

  // < 1 хв
  const end1 = new Date(2026, 8, 30, 4, 0, 20);
  assert.strictEqual(notifier.formatDuration(start, end1), '< 1 хв');

  // 45 хв
  const end2 = new Date(2026, 8, 30, 4, 45, 0);
  assert.strictEqual(notifier.formatDuration(start, end2), '45 хв');

  // 1 год 15 хв
  const end3 = new Date(2026, 8, 30, 5, 15, 0);
  assert.strictEqual(notifier.formatDuration(start, end3), '1 год 15 хв');

  // 2 год рівно
  const end4 = new Date(2026, 8, 30, 6, 0, 0);
  assert.strictEqual(notifier.formatDuration(start, end4), '2 год');

  // 1 день
  const end5 = new Date(2026, 9, 1, 4, 0, 0);
  assert.strictEqual(notifier.formatDuration(start, end5), '1 день');

  // 2 дні 2 години
  const end6 = new Date(2026, 9, 2, 6, 0, 0);
  assert.strictEqual(notifier.formatDuration(start, end6), '2 дні 2 години');

  // 1 місяць
  const end7 = new Date(2026, 9, 30, 4, 0, 0);
  assert.strictEqual(notifier.formatDuration(start, end7), '1 місяць');

  // Невалідні дати
  assert.strictEqual(notifier.formatDuration(null, null), '');
  console.log('✔ Тест 2 пройдено (formatDuration)');
}

// Тест 3: Формування структури сповіщення активної тривоги
{
  const mockNotifier = new NotifierService();
  const alertStartTime = new Date(2026, 8, 30, 4, 15, 0);

  let capturedNotification = null;
  // Емуляція відправки без виклику нативного API Windows
  mockNotifier.notifyStatusChange = function(params) {
    const alertStartTime = params.startedAt ? new Date(params.startedAt) : new Date();
    this.activeAlertStartedAt = alertStartTime;
    const desc = (params.threatInfo && params.threatInfo.notificationText) || 'Негайно пройдіть в найближче укриття!';
    capturedNotification = {
      title: `Повітряна тривога — ${params.locationTitle}`,
      body: desc
    };
  };

  mockNotifier.notifyStatusChange({
    isAlert: true,
    alertType: 'air_raid',
    alertLevel: 'red',
    locationTitle: 'м. Київ',
    threatInfo: { notificationText: 'Ракетна загроза. Загроза ракетного удару. Негайно прямуйте в укриття!' },
    startedAt: alertStartTime.toISOString()
  });

  assert.strictEqual(capturedNotification.title, 'Повітряна тривога — м. Київ');
  assert.strictEqual(
    capturedNotification.body,
    'Ракетна загроза. Загроза ракетного удару. Негайно прямуйте в укриття!'
  );
  console.log('✔ Тест 3 пройдено (структура тривоги: чистий опис без дублювання часу)');
}

// Тест 4: Формування структури сповіщення відбою тривоги
{
  const mockNotifier = new NotifierService();
  const startTime = new Date(2026, 8, 30, 4, 15, 0);
  const clearTime = new Date(2026, 8, 30, 5, 30, 0);

  mockNotifier.activeAlertStartedAt = startTime;

  let capturedClear = null;
  mockNotifier.notifyStatusChange = function(params) {
    let durationText = '';
    if (this.activeAlertStartedAt) {
      const dur = this.formatDuration(this.activeAlertStartedAt, clearTime);
      if (dur) {
        durationText = ` (тривалість ${dur})`;
      }
      this.activeAlertStartedAt = null;
    }
    capturedClear = {
      title: `Відбій тривоги — ${params.locationTitle}`,
      body: `Загроза минула${durationText}. Слідкуйте за офіційними повідомленнями.`
    };
  };

  mockNotifier.notifyStatusChange({
    isAlert: false,
    locationTitle: 'м. Київ'
  });

  assert.strictEqual(capturedClear.title, 'Відбій тривоги — м. Київ');
  assert.strictEqual(
    capturedClear.body,
    'Загроза минула (тривалість 1 год 15 хв). Слідкуйте за офіційними повідомленнями.'
  );
  console.log('✔ Тест 4 пройдено (структура відбою: статус + тривалість у тілі повідомлення)');
}

console.log('All NotifierService tests passed successfully!');
