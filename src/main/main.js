const { app, ipcMain, Menu, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Повністю вимикаємо стандартне меню (File, Edit...) для всіх вікон
Menu.setApplicationMenu(null);

// Вимикаємо функціонал Picture-in-Picture на рівні рушія Chromium
app.commandLine.appendSwitch('disable-features', 'PictureInPicture,PictureInPictureAPI');

const config = require('./config');
const api = require('./api');
const tray = require('./tray');
const windowManager = require('./window');
const settingsWindowManager = require('./settings-window');
const notifier = require('./notifier');
const updater = require('./updater');
const historyService = require('./history-service');

// Запобігання повторному запуску (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    windowManager.show();
  });

  // Ідентифікатор додатку для нативних сповіщень Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('ua.alerts.desktop');
  }

  // Налаштування зв'язку нотифікатора та аудіо через головне вікно
  notifier.setAudioCallback((soundType, soundId, volume) => {
    windowManager.playAudioInWindow(soundType, soundId, volume);
  });

  // Підписка на оновлення стану тривог
  api.on('status-updated', (status) => {
    tray.updateStatus(status);
    windowManager.sendStatusUpdate(status);
    const allAlerts = api.getAllAlerts();
    windowManager.sendAllAlertsUpdate(allAlerts);
    if (Array.isArray(allAlerts) && allAlerts.length > 0) {
      historyService.recordActiveAlerts(allAlerts);
    }
  });

  api.on('status-changed', (status) => {
    notifier.notifyStatusChange(status);
  });

  api.on('status-synced', (status) => {
    notifier.resetAlertTracking(status.isAlert ? status.startedAt : null);
  });

  // Налаштування IPC-хендлерів
  ipcMain.handle('get-current-status', () => {
    return api.getCurrentState();
  });

  ipcMain.handle('get-config', () => {
    return config.getAll();
  });

  ipcMain.handle('save-config', (_event, newConfig) => {
    if (!api.isApiTokenTrusted(newConfig)) {
      return {
        success: false,
        error: 'token_not_verified',
        message: 'Щоб зберегти, спочатку перевірте токен API.'
      };
    }
    const result = config.saveConfig(newConfig);
    return result;
  });

  ipcMain.handle('verify-api-token', async (_event, providerName, token) => {
    return api.verifyApiToken(providerName, token);
  });

  ipcMain.handle('get-locations', () => {
    try {
      const locationsPath = path.join(__dirname, 'locations.json');
      const data = fs.readFileSync(locationsPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Помилка читання locations.json:', err.message);
      return [];
    }
  });

  ipcMain.on('open-settings', (_event, options) => {
    settingsWindowManager.showSettingsWindow(windowManager.mainWindow, options);
  });

  ipcMain.on('close-settings', () => {
    settingsWindowManager.close();
  });

  ipcMain.on('open-external', (_event, url) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
    }
  });

  ipcMain.on('reload-map', () => {
    windowManager.reloadMap();
  });

  ipcMain.handle('get-theme', () => {
    return { isDark: windowManager.isDarkTheme };
  });

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.on('map-theme-changed', (_event, { isDark }) => {
    windowManager.setTheme(isDark, true);
    settingsWindowManager.setTheme(isDark, true);
  });

  ipcMain.handle('check-for-updates', async () => {
    return updater.checkForUpdates(true);
  });

  ipcMain.handle('get-update-status', () => {
    return updater.getStatus();
  });

  ipcMain.handle('download-update', () => {
    updater.downloadUpdate();
    return updater.getStatus();
  });

  ipcMain.handle('install-update', () => {
    updater.quitAndInstall();
    return true;
  });

  ipcMain.handle('select-map-tab', (_event, tabId) => {
    return windowManager.switchMapTab(tabId);
  });

  ipcMain.handle('get-active-map-tab', () => {
    return windowManager.getActiveMapTab();
  });

  ipcMain.on('get-active-map-tab-sync', (event) => {
    event.returnValue = windowManager.getActiveMapTab();
  });

  ipcMain.on('toggle-app-theme', (_event, { isDark }) => {
    windowManager.setTheme(isDark, false);
    settingsWindowManager.setTheme(isDark, false);
  });

  ipcMain.handle('get-all-alerts', () => {
    return api.getAllAlerts();
  });

  ipcMain.handle('get-region-history', async (_event, params) => {
    const { regionUid, oblastUid } = params || {};
    return historyService.getRegionHistory(regionUid, oblastUid);
  });

  ipcMain.on('open-external-url', (_event, url) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
    }
  });

  app.whenReady().then(() => {
    // Блокуємо будь-які спроби запиту дозволу на Picture-in-Picture
    if (session && session.defaultSession) {
      session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
        if (permission === 'picture-in-picture') return false;
        return true;
      });
      session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
        if (permission === 'picture-in-picture') return callback(false);
        callback(true);
      });
    }

    // Ініціалізація системного трею
    tray.init({
      onShowMap: () => windowManager.show(),
      onShowSettings: () => settingsWindowManager.showSettingsWindow(windowManager.mainWindow),
      onToggleWindow: () => windowManager.toggle(),
      onCheckForUpdates: () => updater.checkForUpdates(true),
      onInstallUpdate: () => updater.quitAndInstall()
    });

    // Функції трансляції подій оновлення у вікна
    const broadcastUpdateStatus = (status) => {
      if (windowManager && windowManager.mainWindow && !windowManager.mainWindow.isDestroyed()) {
        windowManager.mainWindow.webContents.send('update-status-changed', status);
      }
      if (settingsWindowManager && settingsWindowManager.settingsWindow && !settingsWindowManager.settingsWindow.isDestroyed()) {
        settingsWindowManager.settingsWindow.webContents.send('update-status-changed', status);
      }
    };

    const broadcastUpdateProgress = (progress) => {
      if (windowManager && windowManager.mainWindow && !windowManager.mainWindow.isDestroyed()) {
        windowManager.mainWindow.webContents.send('update-download-progress', progress);
      }
      if (settingsWindowManager && settingsWindowManager.settingsWindow && !settingsWindowManager.settingsWindow.isDestroyed()) {
        settingsWindowManager.settingsWindow.webContents.send('update-download-progress', progress);
      }
    };

    // Ініціалізація сервісу автооновлень
    updater.init({
      trayManager: tray,
      notifier,
      configManager: config,
      onStatusChange: broadcastUpdateStatus,
      onProgress: broadcastUpdateProgress
    });

    // Встановлюємо актуальний початковий статус
    tray.updateStatus(api.getCurrentState());

    // Створюємо головне вікно та відображаємо його (якщо не передано --hidden)
    windowManager.createMainWindow();
    if (!process.argv.includes('--hidden')) {
      windowManager.show();
    }

    // Запускаємо фонове опитування сервера тривог
    api.startPolling();

    // Синхронізуємо автозапуск із системним станом реєстру
    const autostart = require('./autostart');
    const isSystemAutoStart = autostart.isEnabled();

    if (config.get('isFirstLaunch') || config.get('autoStart') === undefined) {
      // При першому запуску або відсутності збереженого значення орієнтуємось на вибір в інсталяторі
      config.set('autoStart', isSystemAutoStart);
    } else if (config.get('autoStart')) {
      // Якщо автозапуск увімкнено в налаштуваннях — оновлюємо актуальний шлях до EXE в реєстрі
      autostart.setAutoStart(true);
    } else if (isSystemAutoStart) {
      // Якщо в реєстрі є ключ (наприклад, увімкнено інсталятором або користувачем) — підтягуємо в конфіг
      config.set('autoStart', true);
    }

    // Перевірка першого запуску: якщо перший старт — відкриваємо вікно налаштувань для вибору місцевості
    const isFirstLaunch = config.get('isFirstLaunch');
    if (isFirstLaunch) {
      settingsWindowManager.showSettingsWindow(windowManager.mainWindow);
      config.saveConfig({ isFirstLaunch: false });
    }
  });

  app.on('before-quit', () => {
    windowManager.setQuitting();
    api.stopPolling();
    tray.destroy();
    updater.destroy();
  });

  app.on('window-all-closed', (event) => {
    // Не виходимо із застосунку при закритті вікон — він продовжує жити в системному треї
    event.preventDefault();
  });
}
