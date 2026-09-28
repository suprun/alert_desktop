const { BrowserWindow, WebContentsView, BrowserView, shell, app } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.mapView = null;
    this.headerHeight = 56;
    this.isQuitting = false;
  }

  createMainWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icons', 'app-icon.png');

    this.mainWindow = new BrowserWindow({
      width: 1060,
      height: 760,
      minWidth: 700,
      minHeight: 500,
      title: 'Повітряні тривоги',
      icon: iconPath,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#0f172a',
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
    
    // Перевірка підтримки сучасного WebContentsView (Electron 30+)
    if (WebContentsView && this.mainWindow.contentView && this.mainWindow.contentView.addChildView) {
      this.mapView = new WebContentsView({
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
      });
      this.mainWindow.contentView.addChildView(this.mapView);
      this.configureMapWebContents(this.mapView.webContents, mapUrl);
    } else if (BrowserView) {
      // Сумісність для старіших версій Electron
      this.mapView = new BrowserView({
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
      });
      this.mainWindow.setBrowserView(this.mapView);
      this.configureMapWebContents(this.mapView.webContents, mapUrl);
    }
  }

  configureMapWebContents(mapWebContents, mapUrl) {
    mapWebContents.loadURL(mapUrl);

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
