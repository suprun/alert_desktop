const { BrowserWindow, nativeTheme, shell, ipcMain } = require('electron');
const path = require('path');

class SettingsWindowManager {
  constructor() {
    this.settingsWindow = null;
    this.isDarkTheme = nativeTheme.shouldUseDarkColors;
    this.hasMapThemeOverride = false;

    // Слідкуємо за системною зміною теми Windows (light/dark) як фолбек
    nativeTheme.on('updated', () => {
      if (!this.hasMapThemeOverride) {
        this.setTheme(nativeTheme.shouldUseDarkColors, false);
      }
    });
  }

  setTheme(isDark, fromMap = true) {
    this.isDarkTheme = Boolean(isDark);
    if (fromMap) {
      this.hasMapThemeOverride = true;
    }
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      const themeBg = this.isDarkTheme ? '#18191c' : '#eff0f2';
      this.settingsWindow.setBackgroundColor(themeBg);
      this.settingsWindow.webContents.send('theme-updated', { isDark: this.isDarkTheme });
    }
  }

  showSettingsWindow(parentWindow = null, options = null) {
    const targetScroll = options && options.scrollTo ? options.scrollTo : null;

    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      if (this.settingsWindow.isMinimized()) this.settingsWindow.restore();
      this.settingsWindow.show();
      this.settingsWindow.focus();
      if (targetScroll) {
        this.settingsWindow.webContents.send('scroll-to-section', targetScroll);
      }
      return this.settingsWindow;
    }

    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icons', 'app-icon.png');
    const initialBgColor = this.isDarkTheme ? '#18191c' : '#eff0f2';

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

    this.settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    this.settingsWindow.webContents.on('did-finish-load', () => {
      this.settingsWindow.webContents.send('theme-updated', { isDark: this.isDarkTheme });
    });

    let isShown = false;
    const showWindow = () => {
      if (isShown) return;
      isShown = true;
      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        this.settingsWindow.show();
        this.settingsWindow.focus();
        if (targetScroll) {
          setTimeout(() => {
            if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
              this.settingsWindow.webContents.send('scroll-to-section', targetScroll);
            }
          }, 80);
        }
      }
    };

    const onSettingsReady = () => showWindow();
    ipcMain.once('settings-window-ready', onSettingsReady);

    this.settingsWindow.once('ready-to-show', () => {
      this.settingsWindow.webContents.send('theme-updated', { isDark: this.isDarkTheme });
      // Запобіжний фолбек, якщо рендерер затримався
      setTimeout(showWindow, 300);
    });

    this.settingsWindow.on('close', () => {
      if (parentWindow && !parentWindow.isDestroyed() && parentWindow.isVisible()) {
        if (parentWindow.isMinimized()) {
          parentWindow.restore();
        }
        parentWindow.focus();
      }
    });

    this.settingsWindow.on('closed', () => {
      ipcMain.removeListener('settings-window-ready', onSettingsReady);
      this.settingsWindow = null;
      if (parentWindow && !parentWindow.isDestroyed() && parentWindow.isVisible()) {
        parentWindow.focus();
      }
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
