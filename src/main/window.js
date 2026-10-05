const { BrowserWindow, WebContentsView, BrowserView, shell, nativeTheme, session } = require('electron');
const path = require('path');
const config = require('./config');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.headerHeight = 56;
    this.footerHeight = 44;
    this.isQuitting = false;
    const savedTheme = config.get('theme');
    this.isDarkTheme = savedTheme ? savedTheme !== 'light' : ((nativeTheme && typeof nativeTheme.shouldUseDarkColors === 'boolean') ? nativeTheme.shouldUseDarkColors : true);
    this.hasMapThemeOverride = Boolean(savedTheme);
    this.activeTab = config.get('activeMapTab') || 'internal';

    // Конфігурація підтримуваних зовнішніх веб-карт
    this.webMapConfigs = {
      alertsinua: {
        url: 'https://alerts.in.ua/',
        partition: 'persist:alerts_map',
        domain: 'alerts.in.ua'
      },
      ukrainealarm: {
        url: 'https://map.ukrainealarm.com/',
        partition: 'persist:ukrainealarm_map',
        domain: 'map.ukrainealarm.com'
      },
      neptun: {
        url: 'https://neptun.in.ua/',
        partition: 'persist:neptun_map',
        domain: 'neptun.in.ua'
      }
    };

    // Пул створених переглядів: tabId -> { view, isReady, url }
    this.views = new Map();

    // Слідкуємо за системною зміною теми Windows як фолбек
    if (nativeTheme && typeof nativeTheme.on === 'function') {
      nativeTheme.on('updated', () => {
        if (!this.hasMapThemeOverride) {
          this.setTheme(nativeTheme.shouldUseDarkColors, false);
        }
      });
    }
  }

  getActiveMapTab() {
    return this.activeTab;
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

    // Трансляція теми в усі ініціалізовані перегляди карт
    this.broadcastThemeToViews(this.isDarkTheme);
  }

  broadcastThemeToViews(isDark) {
    for (const [, entry] of this.views.entries()) {
      if (entry.view && entry.view.webContents && !entry.view.webContents.isDestroyed()) {
        try {
          entry.view.webContents.send('set-view-theme', { isDark });
        } catch (e) {}
      }
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

    this.mainWindow.removeMenu();
    this.mainWindow.setMenuBarVisibility(false);

    // Якщо остання обрана карта зовнішня — негайно ініціалізуємо перегляд, щоб не показувати вбудовану
    if (this.activeTab !== 'internal') {
      this.getOrCreateWebView(this.activeTab);
    }

    const mainHtmlPath = path.join(__dirname, '..', 'renderer', 'main', 'index.html');
    this.mainWindow.loadFile(mainHtmlPath, { query: { initialTab: this.activeTab } });

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
      this.mainWindow.webContents.send('map-tab-changed', { activeTab: this.activeTab });
    });

    this.mainWindow.once('ready-to-show', () => {
      this.applyInitialTab();
      this.mainWindow.webContents.send('theme-updated', { isDark: this.isDarkTheme });
      if (!process.argv.includes('--hidden')) {
        this.show();
      }
    });

    return this.mainWindow;
  }

  applyInitialTab() {
    this.switchMapTab(this.activeTab);
  }

  getOrCreateWebView(tabId) {
    if (!this.webMapConfigs[tabId]) return null;

    if (this.views.has(tabId)) {
      return this.views.get(tabId);
    }

    const cfg = this.webMapConfigs[tabId];
    const mapPreloadPath = path.join(__dirname, '..', 'preload', 'preload-map.js');
    let viewInstance = null;

    const webPreferences = {
      partition: cfg.partition,
      contextIsolation: true,
      nodeIntegration: false,
      preload: mapPreloadPath
    };

    if (WebContentsView && this.mainWindow.contentView && this.mainWindow.contentView.addChildView) {
      viewInstance = new WebContentsView({ webPreferences });
      this.mainWindow.contentView.addChildView(viewInstance);
    } else if (BrowserView) {
      viewInstance = new BrowserView({ webPreferences });
      this.mainWindow.setBrowserView(viewInstance);
    }

    if (!viewInstance) return null;

    const entry = {
      view: viewInstance,
      isReady: false,
      url: cfg.url,
      tabId
    };

    this.views.set(tabId, entry);
    this.configureMapWebContents(entry, cfg);
    return entry;
  }

  configureMapWebContents(entry, cfg) {
    const { view } = entry;
    const mapWebContents = view.webContents;

    if (this.activeTab === entry.tabId) {
      this.sendMapLoadingState('loading');
    }

    // Мережевий фільтр блокування реклами та сторонніх трекерів для зовнішніх веб-карт
    if (mapWebContents.session && mapWebContents.session.webRequest) {
      const adFilter = [
        '*://*.doubleclick.net/*',
        '*://*.googleadservices.com/*',
        '*://*.googlesyndication.com/*',
        '*://pagead2.googlesyndication.com/*',
        '*://*.adservice.google.com/*'
      ];
      try {
        mapWebContents.session.webRequest.onBeforeRequest({ urls: adFilter }, (_details, callback) => {
          callback({ cancel: true });
        });
      } catch (e) {}
    }

    mapWebContents.loadURL(cfg.url);

    // Скрипт блокування Picture-in-Picture та приховування кнопок міні-мапи
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
      if (this.activeTab === entry.tabId) {
        this.sendMapLoadingState('loading');
      }
    });

    const onReady = () => {
      mapWebContents.executeJavaScript(disablePipScript).catch(() => {});
      if (entry.tabId === 'neptun') {
        const neptunAdCss = `
          [class*="BottomDock_dock"],
          [class*="BottomDock_"],
          [class*="SupportBanner_"],
          [class*="MapHeader_installSlot"],
          [class*="InstallPill_pill"],
          [class*="InstallChoice_"],
          ins.adsbygoogle,
          [id*="google_ads"],
          [class*="advertisement"],
          [class*="ad-banner"],
          iframe[src*="google"],
          iframe[src*="doubleclick"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            overflow: hidden !important;
          }
        `;
        mapWebContents.insertCSS(neptunAdCss).catch(() => {});
      }
      entry.isReady = true;
      try {
        mapWebContents.send('set-view-theme', { isDark: this.isDarkTheme });
      } catch (e) {}
      this.updateViewBounds();
      if (this.activeTab === entry.tabId) {
        this.sendMapLoadingState('ready');
      }
    };

    mapWebContents.on('dom-ready', onReady);
    mapWebContents.on('did-finish-load', onReady);

    mapWebContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) {
        entry.isReady = false;
        this.updateViewBounds();
        if (this.activeTab === entry.tabId) {
          this.sendMapLoadingState('failed', errorDescription || 'Помилка підключення до сервера карти');
        }
      }
    });

    // Відкриття сторонніх посилань у системному браузері
    mapWebContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    mapWebContents.on('will-navigate', (event, url) => {
      try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes(cfg.domain)) {
          event.preventDefault();
          shell.openExternal(url);
        }
      } catch (e) {
        event.preventDefault();
      }
    });
  }

  switchMapTab(tabId) {
    if (!['internal', 'alertsinua', 'ukrainealarm', 'neptun'].includes(tabId)) {
      tabId = 'internal';
    }

    this.activeTab = tabId;
    config.saveConfig({ activeMapTab: tabId });

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('map-tab-changed', { activeTab: tabId });
    }

    if (tabId === 'internal') {
      this.updateViewBounds();
      this.sendMapLoadingState('ready');
      return { success: true, tabId };
    }

    // Для зовнішньої веб-карти
    const entry = this.getOrCreateWebView(tabId);
    this.updateViewBounds();

    if (entry) {
      if (entry.isReady) {
        this.sendMapLoadingState('ready');
        try {
          entry.view.webContents.send('set-view-theme', { isDark: this.isDarkTheme });
        } catch (e) {}
      } else {
        this.sendMapLoadingState('loading');
      }
    }

    return { success: true, tabId };
  }

  setTheme(isDark, fromMap = false) {
    this.isDarkTheme = Boolean(isDark);
    if (fromMap) {
      this.hasMapThemeOverride = true;
    }
    config.saveConfig({ theme: this.isDarkTheme ? 'dark' : 'light' });

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const themeBg = this.isDarkTheme ? '#232529' : '#eff0f2';
      this.mainWindow.setBackgroundColor(themeBg);
      this.mainWindow.webContents.send('theme-updated', { isDark: this.isDarkTheme });
    }

    for (const entry of this.views.values()) {
      if (entry && entry.view && entry.view.webContents) {
        try {
          entry.view.webContents.send('set-view-theme', { isDark: this.isDarkTheme });
        } catch (e) {}
      }
    }
  }

  broadcastThemeToViews(isDark) {
    this.setTheme(isDark, false);
  }

  reloadMap() {
    if (this.activeTab === 'internal') {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('reload-internal-map');
      }
      return;
    }

    const entry = this.views.get(this.activeTab);
    if (entry && entry.view && entry.view.webContents) {
      entry.isReady = false;
      this.updateViewBounds();
      this.sendMapLoadingState('loading');
      entry.view.webContents.reload();
    }
  }

  sendMapLoadingState(state, errorMsg = '') {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('map-loading-state', { state, errorMsg });
    }
  }

  updateViewBounds() {
    if (!this.mainWindow) return;

    const [width, height] = this.mainWindow.getContentSize();
    const contentHeight = Math.max(0, height - this.headerHeight - this.footerHeight);

    for (const [key, entry] of this.views.entries()) {
      const isCurrentActive = this.activeTab === key;
      const shouldBeVisible = isCurrentActive && entry.isReady;

      if (entry.view.setVisible) {
        entry.view.setVisible(shouldBeVisible);
      }

      const bounds = shouldBeVisible
        ? {
            x: 0,
            y: this.headerHeight,
            width: width,
            height: contentHeight
          }
        : {
            x: 0,
            y: this.headerHeight,
            width: 0,
            height: 0
          };

      if (entry.view.setBounds) {
        entry.view.setBounds(bounds);
      }
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
    if (!this.mainWindow) {
      this.show();
      return;
    }
    // Якщо вікно приховане або згорнуте — показуємо та фокусуємо
    if (!this.mainWindow.isVisible() || this.mainWindow.isMinimized()) {
      this.show();
    } else if (!this.mainWindow.isFocused()) {
      // Якщо вікно вже видиме, але не у фокусі (позаду інших програм) — переводимо фокус на нього
      this.mainWindow.show();
      this.mainWindow.focus();
    } else {
      // Тільки якщо вікно вже у фокусі користувача — ховаємо в трей
      this.hide();
    }
  }

  sendStatusUpdate(status) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('status-update', status);
    }
  }

  sendAllAlertsUpdate(alerts) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('all-alerts-update', alerts);
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
