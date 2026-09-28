const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const api = require('./api');
const tray = require('./tray');
const windowManager = require('./window');
const settingsWindowManager = require('./settings-window');
const notifier = require('./notifier');

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
  notifier.setAudioCallback((soundType, volume) => {
    windowManager.playAudioInWindow(soundType, volume);
  });

  // Підписка на оновлення стану тривог
  api.on('status-updated', (status) => {
    tray.updateStatus(status);
    windowManager.sendStatusUpdate(status);
  });

  api.on('status-changed', (status) => {
    notifier.notifyStatusChange(status);
  });

  // Налаштування IPC-хендлерів
  ipcMain.handle('get-current-status', () => {
    return api.getCurrentState();
  });

  ipcMain.handle('get-config', () => {
    return config.getAll();
  });

  ipcMain.handle('save-config', (_event, newConfig) => {
    const result = config.saveConfig(newConfig);
    return result;
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

  ipcMain.on('open-settings', () => {
    settingsWindowManager.showSettingsWindow(windowManager.mainWindow);
  });

  ipcMain.on('close-settings', () => {
    settingsWindowManager.close();
  });

  app.whenReady().then(() => {
    // Ініціалізація системного трею
    tray.init({
      onShowMap: () => windowManager.show(),
      onShowSettings: () => settingsWindowManager.showSettingsWindow(windowManager.mainWindow),
      onToggleWindow: () => windowManager.toggle()
    });

    // Створюємо головне вікно у фоні
    windowManager.createMainWindow();

    // Запускаємо фонове опитування сервера тривог
    api.startPolling();

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
  });

  app.on('window-all-closed', (event) => {
    // Не виходимо із застосунку при закритті вікон — він продовжує жити в системному треї
    event.preventDefault();
  });
}
