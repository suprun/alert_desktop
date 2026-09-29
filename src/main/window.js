const { BrowserWindow, WebContentsView, BrowserView, shell, nativeTheme } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.mapView = null;
    this.headerHeight = 56;
    this.isQuitting = false;
    this.isMapReady = false;
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
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const themeBg = this.isDarkTheme ? '#232529' : '#eff0f2';
      this.mainWindow.setBackgroundColor(themeBg);
      this.mainWindow.webContents.send('theme-updated', { isDark: this.isDarkTheme });
    }
  }

  createMainWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icons', 'app-icon.png');
    const initialBgColor = this.isDarkTheme ? '#232529' : '#eff0f2';

    this.mainWindow = new BrowserWindow({
      width: 1060,
      height: 760,
      minWidth: 700,
      minHeight: 500,
      title: 'Повітряні тривоги',
      icon: iconPath,
      show: !process.argv.includes('--hidden'),
      autoHideMenuBar: true,
      backgroundColor: initialBgColor,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'preload-main.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    // Видаляємо стандартне меню (File, Edit...)
    this.mainWindow.removeMenu();
    this.mainWindow.setMenuBarVisibility(false);

    // Завантажуємо локальну шапку зі статусом та кнопкою налаштувань
    const mainHtmlPath = path.join(__dirname, '..', 'renderer', 'main', 'index.html');
    this.mainWindow.loadFile(mainHtmlPath);

    // Створюємо та додаємо перегляд карти alerts.in.ua у нижню частину вікна
    this.attachMapView();

    // Перехоплюємо закриття вікна (кнопка X ховає застосунок у трей)
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    this.mainWindow.on('resize', () => {
      this.updateViewBounds();
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      this.mainWindow.webContents.send('theme-updated', { isDark: this.isDarkTheme });
    });

    this.mainWindow.once('ready-to-show', () => {
      this.updateViewBounds();
      this.mainWindow.webContents.send('theme-updated', { isDark: this.isDarkTheme });
      if (!process.argv.includes('--hidden')) {
        this.show();
      }
    });

    return this.mainWindow;
  }

  attachMapView() {
    const mapUrl = 'https://alerts.in.ua/';
    const mapPreloadPath = path.join(__dirname, '..', 'preload', 'preload-map.js');
    
    // Перевірка підтримки сучасного WebContentsView (Electron 30+)
    if (WebContentsView && this.mainWindow.contentView && this.mainWindow.contentView.addChildView) {
      this.mapView = new WebContentsView({
        webPreferences: {
          partition: 'persist:alerts_map',
          contextIsolation: true,
          nodeIntegration: false,
          preload: mapPreloadPath
        }
      });
      this.mainWindow.contentView.addChildView(this.mapView);
      this.configureMapWebContents(this.mapView.webContents, mapUrl);
    } else if (BrowserView) {
      // Сумісність для старіших версій Electron
      this.mapView = new BrowserView({
        webPreferences: {
          partition: 'persist:alerts_map',
          contextIsolation: true,
          nodeIntegration: false,
          preload: mapPreloadPath
        }
      });
      this.mainWindow.setBrowserView(this.mapView);
      this.configureMapWebContents(this.mapView.webContents, mapUrl);
    }
  }

  configureMapWebContents(mapWebContents, mapUrl) {
    this.sendMapLoadingState('loading');
    mapWebContents.loadURL(mapUrl);

    // Скрипт блокування Picture-in-Picture та приховування кнопок запуску міні-мапи
    const disablePipScript = `
      try {
        Object.defineProperty(document, 'pictureInPictureEnabled', {
          get: () => false,
          configurable: false
        });
        if (typeof HTMLVideoElement !== 'undefined' && HTMLVideoElement.prototype) {
          HTMLVideoElement.prototype.requestPictureInPicture = function() {
            return Promise.reject(new DOMException('Picture-in-Picture is disabled in desktop client', 'NotSupportedError'));
          };
        }
        if (typeof document.exitPictureInPicture === 'function') {
          document.exitPictureInPicture = function() {
            return Promise.reject(new DOMException('Picture-in-Picture is disabled in desktop client', 'NotSupportedError'));
          };
        }
        const hidePip = () => {
          const selectors = [
            'button[title*="Picture-in-picture" i]',
            'button[title*="міні-мап" i]',
            'button[title*="мини-карт" i]',
            'button[title*="pip" i]',
            'button[aria-label*="Picture-in-picture" i]',
            'button[aria-label*="міні-мап" i]',
            'button[aria-label*="мини-карт" i]',
            'button[aria-label*="pip" i]',
            '[data-action*="pip" i]',
            '[data-action*="mini-map" i]',
            '.pip-button',
            '.mini-map-button'
          ];
          document.querySelectorAll(selectors.join(',')).forEach(el => {
            el.style.display = 'none';
          });
        };
        hidePip();
      } catch (e) {}
    `;

    mapWebContents.on('did-start-loading', () => {
      this.sendMapLoadingState('loading');
    });

    mapWebContents.on('dom-ready', () => {
      mapWebContents.executeJavaScript(disablePipScript).catch(() => {});
      this.isMapReady = true;
      this.updateViewBounds();
      this.sendMapLoadingState('ready');
    });

    mapWebContents.on('did-finish-load', () => {
      mapWebContents.executeJavaScript(disablePipScript).catch(() => {});
      this.isMapReady = true;
      this.updateViewBounds();
      this.sendMapLoadingState('ready');
    });

    mapWebContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) {
        this.isMapReady = false;
        this.updateViewBounds();
        this.sendMapLoadingState('failed', errorDescription || 'Помилка підключення до сервера карти');
      }
    });

    // Відкриття сторонніх посилань у системному браузері
    mapWebContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    mapWebContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('https://alerts.in.ua')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
  }

  reloadMap() {
    if (this.mapView && this.mapView.webContents) {
      this.isMapReady = false;
      this.updateViewBounds();
      this.sendMapLoadingState('loading');
      this.mapView.webContents.loadURL('https://alerts.in.ua/');
    }
  }

  sendMapLoadingState(state, errorMsg = '') {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('map-loading-state', { state, errorMsg });
    }
  }

  updateViewBounds() {
    if (!this.mainWindow || !this.mapView) return;

    const [width, height] = this.mainWindow.getContentSize();
    if (this.mapView.setVisible) {
      this.mapView.setVisible(this.isMapReady);
    }

    const bounds = this.isMapReady
      ? {
          x: 0,
          y: this.headerHeight,
          width: width,
          height: Math.max(0, height - this.headerHeight)
        }
      : {
          x: 0,
          y: this.headerHeight,
          width: 0,
          height: 0
        };

    if (this.mapView.setBounds) {
      this.mapView.setBounds(bounds);
    }
  }

  show() {
    if (!this.mainWindow) {
      this.createMainWindow();
    }
    if (this.mainWindow.isMinimized()) this.mainWindow.restore();
    this.mainWindow.show();
    this.mainWindow.focus();
    this.updateViewBounds();
  }

  hide() {
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  toggle() {
    if (!this.mainWindow || !this.mainWindow.isVisible()) {
      this.show();
    } else {
      this.hide();
    }
  }

  sendStatusUpdate(status) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('status-update', status);
    }
  }

  playAudioInWindow(soundType, soundId, volume) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('play-audio', { soundType, soundId, volume });
    }
  }

  setQuitting() {
    this.isQuitting = true;
  }
}

module.exports = new WindowManager();
