const { BrowserWindow, WebContentsView, BrowserView, shell, nativeTheme } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.mapView = null;
    this.headerHeight = 56;
    this.isQuitting = false;

    // Слідкуємо за системною зміною теми Windows (light/dark)
    nativeTheme.on('updated', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const themeBg = nativeTheme.shouldUseDarkColors ? '#232529' : '#eff0f2';
        this.mainWindow.setBackgroundColor(themeBg);
      }
    });
  }

  createMainWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icons', 'app-icon.png');
    const initialBgColor = nativeTheme.shouldUseDarkColors ? '#232529' : '#eff0f2';

    this.mainWindow = new BrowserWindow({
      width: 1060,
      height: 760,
      minWidth: 700,
      minHeight: 500,
      title: 'Повітряні тривоги',
      icon: iconPath,
      show: false,
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

    this.mainWindow.once('ready-to-show', () => {
      this.updateViewBounds();
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

    mapWebContents.on('dom-ready', () => {
      mapWebContents.executeJavaScript(disablePipScript).catch(() => {});
    });

    mapWebContents.on('did-finish-load', () => {
      mapWebContents.executeJavaScript(disablePipScript).catch(() => {});
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

  updateViewBounds() {
    if (!this.mainWindow || !this.mapView) return;

    const [width, height] = this.mainWindow.getContentSize();
    const bounds = {
      x: 0,
      y: this.headerHeight,
      width: width,
      height: Math.max(0, height - this.headerHeight)
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

  playAudioInWindow(soundType, volume) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('play-audio', { soundType, volume });
    }
  }

  setQuitting() {
    this.isQuitting = true;
  }
}

module.exports = new WindowManager();
