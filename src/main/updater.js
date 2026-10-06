let electron;
try {
  electron = require('electron');
} catch (_) {
  electron = null;
}

const app = (electron && typeof electron === 'object' && electron.app) ? electron.app : null;
const Notification = (electron && typeof electron === 'object' && electron.Notification) ? electron.Notification : null;
const path = require('path');
const { exec } = require('child_process');

let lastMeteredCheckTime = 0;
let lastMeteredResult = false;
const METERED_CACHE_TTL_MS = 60000; // 60 секунд кешування для зменшення навантаження

/**
 * Перевірка, чи поточне активне з'єднання Windows є лімітованим (Metered Connection)
 * через WinRT GetConnectionCost()
 */
function isWindowsMeteredConnection() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve(false);
    }
    const now = Date.now();
    if (now - lastMeteredCheckTime < METERED_CACHE_TTL_MS) {
      return resolve(lastMeteredResult);
    }

    const psCmd = `powershell -NoProfile -NonInteractive -Command "$ErrorActionPreference='SilentlyContinue'; [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType=WindowsRuntime] | Out-Null; $c = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile(); if ($c) { $cost = $c.GetConnectionCost(); if ($cost.NetworkCostType -eq 'Fixed' -or $cost.NetworkCostType -eq 'Variable' -or $cost.OverDataLimit -or $cost.Roaming) { Write-Output 'METERED' } else { Write-Output 'UNMETERED' } } else { Write-Output 'UNKNOWN' }"`;

    exec(psCmd, { timeout: 3500 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve(false);
      }
      const out = stdout.trim();
      lastMeteredResult = (out === 'METERED');
      lastMeteredCheckTime = Date.now();
      resolve(lastMeteredResult);
    });
  });
}

class UpdaterService {
  constructor() {
    this.trayManager = null;
    this.notifier = null;
    this.configManager = null;
    this.autoUpdater = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.downloadedVersion = null;
    this.availableVersion = null;
    this.checkTimer = null;
    this.isChecking = false;
    this.isDownloading = false;
    this.downloadPercent = 0;
    this.needsManualDownload = false;
    this.isMetered = false;
    this.lastError = null;
    this.statusListeners = new Set();
    this.progressListeners = new Set();
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

  notifyStatusChange() {
    const status = this.getStatus();
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (err) {
        console.warn('[Updater] Помилка у listener статусу:', err.message);
      }
    }
  }

  notifyProgress(progressObj) {
    for (const listener of this.progressListeners) {
      try {
        listener(progressObj);
      } catch (err) {
        console.warn('[Updater] Помилка у listener прогресу:', err.message);
      }
    }
  }

  init({ trayManager, notifier, configManager, onStatusChange, onProgress } = {}) {
    this.trayManager = trayManager || null;
    this.notifier = notifier || null;
    this.configManager = configManager || null;

    if (typeof onStatusChange === 'function') {
      this.statusListeners.add(onStatusChange);
    }
    if (typeof onProgress === 'function') {
      this.progressListeners.add(onProgress);
    }

    const updater = this.getAutoUpdater();
    if (!updater) {
      console.log('[Updater] Середовище Electron відсутнє або не підтримує autoUpdater');
      return;
    }

    // Налаштовуємо поведінку autoUpdater
    updater.autoDownload = false; // Керуємо завантаженням вручну на основі типу з'єднання
    updater.autoInstallOnAppQuit = true;
    updater.allowPrerelease = false;

    // Власні обробники подій autoUpdater
    updater.on('checking-for-update', () => {
      console.log('[Updater] Перевірка наявності оновлень...');
      this.isChecking = true;
      this.lastError = null;
      this.notifyStatusChange();
    });

    updater.on('update-available', async (info) => {
      this.isChecking = false;
      this.updateAvailable = true;
      this.availableVersion = info.version;
      this.lastError = null;

      // Перевіряємо вартість підключення до мережі
      const metered = await isWindowsMeteredConnection();
      this.isMetered = metered;
      const allowMetered = this.configManager ? Boolean(this.configManager.get('autoDownloadMetered')) : false;

      if (metered && !allowMetered) {
        console.log(`[Updater] Доступне оновлення v${info.version}, але з'єднання лімітоване. Очікування команди користувача.`);
        this.needsManualDownload = true;
        this.isDownloading = false;
        this.notifyStatusChange();

        // Системний toast про доступне оновлення на лімітованому зв'язку
        this.showSystemNotification(
          `Оновлення AlertDesktop v${info.version}`,
          `Доступна нова версія. Завантаження призупинено через лімітоване з'єднання. Натисніть, щоб завантажити.`,
          () => {
            this.downloadUpdate();
          }
        );
      } else {
        console.log(`[Updater] Доступне оновлення v${info.version}. Початок завантаження...`);
        this.needsManualDownload = false;
        this.isDownloading = true;
        this.downloadPercent = 0;
        this.notifyStatusChange();

        try {
          updater.downloadUpdate().catch((err) => {
            console.warn('[Updater] Помилка завантаження оновлення:', err.message);
            this.isDownloading = false;
            this.lastError = err.message;
            this.notifyStatusChange();
          });
        } catch (err) {
          console.warn('[Updater] Виняток під час виклику downloadUpdate:', err.message);
          this.isDownloading = false;
          this.lastError = err.message;
          this.notifyStatusChange();
        }
      }
    });

    updater.on('update-not-available', (info) => {
      this.isChecking = false;
      this.updateAvailable = false;
      this.needsManualDownload = false;
      this.isDownloading = false;
      this.lastError = null;
      const currentVersion = app && app.getVersion ? app.getVersion() : '1.0.0';
      console.log(`[Updater] Встановлено останню версію (v${currentVersion}).`);
      this.notifyStatusChange();
    });

    updater.on('error', (err) => {
      this.isChecking = false;
      this.isDownloading = false;
      this.lastError = err && err.message ? err.message : String(err);
      console.warn('[Updater] Помилка перевірки/завантаження оновлення:', this.lastError);
      this.notifyStatusChange();
    });

    updater.on('download-progress', (progressObj) => {
      this.isDownloading = true;
      this.downloadPercent = Math.round(progressObj.percent || 0);
      this.notifyProgress({ percent: this.downloadPercent, transferred: progressObj.transferred, total: progressObj.total });
    });

    updater.on('update-downloaded', (info) => {
      this.isDownloading = false;
      this.updateDownloaded = true;
      this.needsManualDownload = false;
      this.downloadedVersion = info.version;
      console.log(`[Updater] Оновлення v${info.version} успішно завантажено!`);

      // Оновлюємо контекстне меню трею (додаємо кнопку перезапуску)
      if (this.trayManager && typeof this.trayManager.setUpdateInfo === 'function') {
        this.trayManager.setUpdateInfo({
          downloaded: true,
          version: info.version
        });
      }

      this.notifyStatusChange();

      // Нативне системне сповіщення Windows
      this.showSystemNotification(
        `Оновлення AlertDesktop v${info.version}`,
        'Оновлення завантажено. Натисніть тут для перезапуску та встановлення.',
        () => {
          this.quitAndInstall();
        }
      );
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

  showSystemNotification(title, body, onClick) {
    if (Notification && typeof Notification.isSupported === 'function' && Notification.isSupported()) {
      try {
        const iconPath = path.join(__dirname, '..', '..', 'assets', 'icons', 'app-icon.png');
        const notification = new Notification({
          title,
          body,
          icon: iconPath
        });
        if (typeof onClick === 'function') {
          notification.on('click', onClick);
        }
        notification.show();
      } catch (e) {
        console.warn('[Updater] Не вдалося показати системне сповіщення:', e.message);
      }
    }
  }

  async checkForUpdates(isManual = false) {
    if (!app || !app.isPackaged) {
      console.log('[Updater] Режим розробки (unpackaged): перевірка оновлень пропущена.');
      if (isManual) {
        const currentVersion = app && app.getVersion ? app.getVersion() : '1.0.0';
        this.showSystemNotification(
          'AlertDesktop (Режим розробки)',
          `Поточна версія: v${currentVersion}. У режимі розробки перевірка релізів вимкнена.`
        );
      }
      return this.getStatus();
    }

    const updater = this.getAutoUpdater();
    if (!updater) return this.getStatus();

    this.isChecking = true;
    this.lastError = null;
    this.notifyStatusChange();

    try {
      // Оновлюємо стан лімітованого підключення
      this.isMetered = await isWindowsMeteredConnection();
      updater.checkForUpdates().catch((err) => {
        console.warn('[Updater] Помилка під час виклику checkForUpdates:', err.message);
        this.isChecking = false;
        this.lastError = err.message;
        this.notifyStatusChange();
      });
    } catch (err) {
      console.warn('[Updater] Виняток checkForUpdates:', err.message);
      this.isChecking = false;
      this.lastError = err.message;
      this.notifyStatusChange();
    }

    return this.getStatus();
  }

  downloadUpdate() {
    const updater = this.getAutoUpdater();
    if (!updater) return;

    console.log('[Updater] Запуск завантаження оновлення користувачем...');
    this.needsManualDownload = false;
    this.isDownloading = true;
    this.downloadPercent = 0;
    this.lastError = null;
    this.notifyStatusChange();

    // Системний toast про початок завантаження
    if (this.availableVersion) {
      this.showSystemNotification(
        `Завантаження AlertDesktop v${this.availableVersion}`,
        'Розпочато завантаження файлів оновлення...'
      );
    }

    try {
      updater.downloadUpdate().catch((err) => {
        console.warn('[Updater] Помилка завантаження:', err.message);
        this.isDownloading = false;
        this.lastError = err.message;
        this.notifyStatusChange();
      });
    } catch (err) {
      console.warn('[Updater] Виняток під час завантаження:', err.message);
      this.isDownloading = false;
      this.lastError = err.message;
      this.notifyStatusChange();
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
    const currentVersion = app && app.getVersion ? app.getVersion() : '1.0.0';
    return {
      currentVersion,
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      availableVersion: this.availableVersion,
      downloadedVersion: this.downloadedVersion,
      isChecking: this.isChecking,
      isDownloading: this.isDownloading,
      downloadPercent: this.downloadPercent,
      needsManualDownload: this.needsManualDownload,
      isMetered: this.isMetered,
      autoDownloadMetered: this.configManager ? Boolean(this.configManager.get('autoDownloadMetered')) : false,
      lastError: this.lastError
    };
  }

  destroy() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.statusListeners.clear();
    this.progressListeners.clear();
  }
}

module.exports = new UpdaterService();
