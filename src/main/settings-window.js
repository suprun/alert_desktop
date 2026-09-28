const { BrowserWindow, nativeTheme } = require('electron');
const path = require('path');

class SettingsWindowManager {
  constructor() {
    this.settingsWindow = null;

    // Слідкуємо за системною зміною теми Windows (light/dark)
    nativeTheme.on('updated', () => {
      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        const themeBg = nativeTheme.shouldUseDarkColors ? '#232529' : '#eff0f2';
        this.settingsWindow.setBackgroundColor(themeBg);
      }
    });
  }

  showSettingsWindow(parentWindow = null) {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      if (this.settingsWindow.isMinimized()) this.settingsWindow.restore();
      this.settingsWindow.show();
      this.settingsWindow.focus();
      return this.settingsWindow;
    }

    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icons', 'app-icon.png');
    const initialBgColor = nativeTheme.shouldUseDarkColors ? '#232529' : '#eff0f2';

    this.settingsWindow = new BrowserWindow({
      width: 480,
      height: 620,
      resizable: false,
      maximizable: false,
      minimizable: false,
      title: 'Налаштування — Повітряні тривоги',
      icon: iconPath,
      parent: parentWindow || undefined,
      modal: false,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: initialBgColor,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'preload-settings.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    // Повністю видаляємо меню вікна
    this.settingsWindow.removeMenu();
    this.settingsWindow.setMenuBarVisibility(false);

    const settingsHtmlPath = path.join(__dirname, '..', 'renderer', 'settings', 'settings.html');
    this.settingsWindow.loadFile(settingsHtmlPath);

    this.settingsWindow.once('ready-to-show', () => {
      this.settingsWindow.show();
      this.settingsWindow.focus();
    });

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    return this.settingsWindow;
  }

  close() {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.close();
    }
  }
}

module.exports = new SettingsWindowManager();
