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

console.log('All updater tests passed successfully!');
