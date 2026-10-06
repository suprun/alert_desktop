const assert = require('assert');
const updater = require('../src/main/updater');

console.log('Testing updater service...');

// Тест 1: Перевірка інтерфейсу UpdaterService
assert.strictEqual(typeof updater.init, 'function', 'updater.init має бути функцією');
assert.strictEqual(typeof updater.checkForUpdates, 'function', 'updater.checkForUpdates має бути функцією');
assert.strictEqual(typeof updater.downloadUpdate, 'function', 'updater.downloadUpdate має бути функцією');
assert.strictEqual(typeof updater.quitAndInstall, 'function', 'updater.quitAndInstall має бути функцією');
assert.strictEqual(typeof updater.getStatus, 'function', 'updater.getStatus має бути функцією');
assert.strictEqual(typeof updater.destroy, 'function', 'updater.destroy має бути функцією');
console.log('✔ Тест 1 пройдено (перевірка методів UpdaterService)');

// Тест 2: Початковий стан UpdaterService
const initialStatus = updater.getStatus();
assert.strictEqual(initialStatus.updateAvailable, false);
assert.strictEqual(initialStatus.updateDownloaded, false);
assert.strictEqual(initialStatus.downloadedVersion, null);
assert.strictEqual(initialStatus.isChecking, false);
assert.strictEqual(initialStatus.isDownloading, false);
assert.strictEqual(initialStatus.needsManualDownload, false);
assert.strictEqual(typeof initialStatus.autoDownloadMetered, 'boolean');
console.log('✔ Тест 2 пройдено (початковий стан getStatus)');

// Тест 3: Перевірка безпечного виклику checkForUpdates у режимі розробки
updater.checkForUpdates(false);
const statusAfterCheck = updater.getStatus();
assert.strictEqual(statusAfterCheck.updateDownloaded, false);
console.log('✔ Тест 3 пройдено (безпечний виклик у dev-режимі)');

// Тест 4: Перевірка безпечного виклику downloadUpdate без помилок
updater.downloadUpdate();
console.log('✔ Тест 4 пройдено (безпечний виклик downloadUpdate)');

// Тест 5: Перевірка емуляції лімітованого з'єднання (MOCK_METERED)
(async () => {
  process.env.MOCK_METERED = '1';
  try {
    await updater.checkForUpdates(true);
    const mockStatus = updater.getStatus();
    assert.strictEqual(mockStatus.updateAvailable, true, 'updateAvailable має бути true при MOCK_METERED');
    assert.strictEqual(mockStatus.needsManualDownload, true, 'needsManualDownload має бути true при autoDownloadMetered=false');
    assert.strictEqual(mockStatus.availableVersion, '1.0.99', 'availableVersion має бути 1.0.99');

    updater.downloadUpdate();
    const downloadingStatus = updater.getStatus();
    assert.strictEqual(downloadingStatus.isDownloading, true, 'isDownloading має стати true після запуску завантаження');
    console.log('✔ Тест 5 пройдено (емуляція mock-metered та запуск завантаження)');
  } finally {
    delete process.env.MOCK_METERED;
    updater.destroy();
  }

  console.log('All updater tests passed successfully!');
})();
