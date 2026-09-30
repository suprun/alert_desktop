let electron;
try {
  electron = require('electron');
} catch (_) {
  electron = null;
}

const app = (electron && typeof electron === 'object' && electron.app) ? electron.app : null;
const Notification = (electron && typeof electron === 'object' && electron.Notification) ? electron.Notification : null;
const path = require('path');

class UpdaterService {
  constructor() {
    this.trayManager = null;
    this.notifier = null;
    this.autoUpdater = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.downloadedVersion = null;
    this.checkTimer = null;
    this.isChecking = false;
  }

  getAutoUpdater() {
    if (this.autoUpdater) {
      return this.autoUpdater;
    }
    // electron-updater вимагає середовища Electron Main (наявність app.getVersion)
    if (!app || typeof app.getVersion !== 'function') {
      return null;
    }
    try {
      const { autoUpdater } = require('electron-updater');
      this.autoUpdater = autoUpdater;
      return this.autoUpdater;
    } catch (err) {
      console.warn('[Updater] Не вдалося ініціалізувати electron-updater:', err.message);
      return null;
    }
  }

  init({ trayManager, notifier } = {}) {
    this.trayManager = trayManager || null;
    this.notifier = notifier || null;

    const updater = this.getAutoUpdater();
    if (!updater) {
      console.log('[Updater] Середовище Electron відсутнє або не підтримує autoUpdater');
      return;
    }

    // Налаштовуємо поведінку autoUpdater
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.allowPrerelease = false;

    // Власні обробники подій autoUpdater
    updater.on('checking-for-update', () => {
      console.log('[Updater] Перевірка наявності оновлень...');
      this.isChecking = true;
    });

    updater.on('update-available', (info) => {
      this.isChecking = false;
      this.updateAvailable = true;
      console.log(`[Updater] Доступне оновлення v${info.version}. Початок завантаження...`);
    });

    updater.on('update-not-available', (info) => {
      this.isChecking = false;
      const currentVersion = app && app.getVersion ? app.getVersion() : '1.0.0';
      console.log(`[Updater] Встановлено останню версію (v${currentVersion}).`);
    });

    updater.on('error', (err) => {
      this.isChecking = false;
      console.warn('[Updater] Помилка перевірки оновлення:', err && err.message ? err.message : err);
    });

    updater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent || 0);
      console.log(`[Updater] Завантаження оновлення: ${percent}%`);
    });

    updater.on('update-downloaded', (info) => {
      this.updateDownloaded = true;
      this.downloadedVersion = info.version;
      console.log(`[Updater] Оновлення v${info.version} успішно завантажено!`);

      // Оновлюємо контекстне меню трею (додаємо кнопку перезапуску)
      if (this.trayManager && typeof this.trayManager.setUpdateInfo === 'function') {
        this.trayManager.setUpdateInfo({
          downloaded: true,
          version: info.version
        });
      }

      // Нативне системне сповіщення Windows
      if (Notification && typeof Notification.isSupported === 'function' && Notification.isSupported()) {
        try {
          const iconPath = path.join(__dirname, '..', '..', 'assets', 'icons', 'app-icon.png');
          const notification = new Notification({
            title: `Оновлення AlertDesktop v${info.version}`,
            body: 'Оновлення завантажено. Натисніть тут для перезапуску та встановлення.',
            icon: iconPath
          });
          notification.on('click', () => {
            this.quitAndInstall();
          });
          notification.show();
        } catch (e) {
          console.warn('[Updater] Не вдалося показати сповіщення:', e.message);
        }
      }
    });

    // Запускаємо перевірку через 15 секунд після старту, якщо додаток запакований
    if (app && app.isPackaged) {
      setTimeout(() => {
        this.checkForUpdates(false);
      }, 15000);

      // Періодична фонова перевірка кожні 4 години
      this.checkTimer = setInterval(() => {
        this.checkForUpdates(false);
      }, 4 * 60 * 60 * 1000);
    }
  }

  checkForUpdates(isManual = false) {
    if (!app || !app.isPackaged) {
      console.log('[Updater] Режим розробки (unpackaged): перевірка оновлень пропущена.');
      if (isManual && Notification && typeof Notification.isSupported === 'function' && Notification.isSupported()) {
        try {
          const currentVersion = app && app.getVersion ? app.getVersion() : '1.0.0';
          const notif = new Notification({
            title: 'AlertDesktop (Режим розробки)',
            body: `Поточна версія: v${currentVersion}. У режимі розробки перевірка релізів вимкнена.`
          });
          notif.show();
        } catch (_) {}
      }
      return;
    }

    const updater = this.getAutoUpdater();
    if (!updater) return;

    try {
      updater.checkForUpdates().catch((err) => {
        console.warn('[Updater] Помилка під час виклику checkForUpdates:', err.message);
      });
    } catch (err) {
      console.warn('[Updater] Виняток checkForUpdates:', err.message);
    }
  }

  quitAndInstall() {
    if (this.updateDownloaded) {
      const updater = this.getAutoUpdater();
      if (updater) {
        console.log('[Updater] Перезапуск додатку для встановлення оновлення...');
        updater.quitAndInstall(false, true);
      }
    }
  }

  getStatus() {
    return {
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      downloadedVersion: this.downloadedVersion,
      isChecking: this.isChecking
    };
  }

  destroy() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }
}

module.exports = new UpdaterService();
