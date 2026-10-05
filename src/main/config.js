const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const autostart = require('./autostart');

const DEFAULT_PROXY_URL = 'https://api.applink.pp.ua/v1/alerts/active.json';
const DEFAULT_WS_URL = 'wss://api.applink.pp.ua/ws';

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.loadEnv();
    const userDir = (app && typeof app.getPath === 'function') ? app.getPath('userData') : process.cwd();
    this.configPath = path.join(userDir, 'config.json');
    this.defaults = {
      locationUid: '31', // За замовчуванням м. Київ
      locationTitle: 'м. Київ',
      soundEnabled: true, // Збережено для зворотної сумісності
      soundAlertEnabled: true,
      soundAllClearEnabled: true,
      alertSound: 'siren',
      allClearSound: 'chime',
      volume: 80,
      autoStart: false,
      devMode: false,
      apiProvider: 'gateway',
      serverUrl: process.env.ALERTS_API_URL || DEFAULT_PROXY_URL,
      wsUrl: process.env.ALERTS_WS_URL || DEFAULT_WS_URL,
      apiKey: process.env.ALERTS_API_KEY || '',
      pollingInterval: Number(process.env.ALERTS_POLL_INTERVAL) || 15000,
      isFirstLaunch: true
    };
    this.config = this.loadConfig();
  }

  loadEnv() {
    try {
      const envPath = path.join(__dirname, '..', '..', '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const key = trimmed.slice(0, eqIdx).trim();
              const val = trimmed.slice(eqIdx + 1).trim();
              if (process.env[key] === undefined) {
                process.env[key] = val;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Не вдалося завантажити .env файл:', err.message);
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(data);
        const config = { ...this.defaults, ...parsed };
        let needsSave = false;

        // Автоматична міграція параметрів звуку:
        // Якщо раніше було soundEnabled, але немає окремих прапорців
        if (parsed.soundAlertEnabled === undefined) {
          config.soundAlertEnabled = parsed.soundEnabled !== false;
          needsSave = true;
        }
        if (parsed.soundAllClearEnabled === undefined) {
          config.soundAllClearEnabled = parsed.soundEnabled !== false;
          needsSave = true;
        }
        if (!config.alertSound) {
          config.alertSound = 'siren';
          needsSave = true;
        }
        if (!config.allClearSound) {
          config.allClearSound = 'chime';
          needsSave = true;
        }

        // Автоматична міграція на роботу через проксі-ретранслятор:
        // Якщо devMode не було задано, вимикаємо його за замовчуванням
        if (parsed.devMode === undefined) {
          config.devMode = false;
          needsSave = true;
        }

        // Якщо режим розробника вимкнено — використовуємо актуальний URL ретранслятора
        if (!config.devMode) {
          const targetProxyUrl = process.env.ALERTS_API_URL || DEFAULT_PROXY_URL;
          if (config.serverUrl !== targetProxyUrl) {
            config.serverUrl = targetProxyUrl;
            needsSave = true;
          }
        }

        // Синхронізація автозапуску з ОС:
        // Якщо це перший запуск або параметр autoStart ще не був явно збережений —
        // синхронізуємо його з реальним станом у системі (наприклад, після вибору в інсталяторі)
        if (parsed.autoStart === undefined || parsed.isFirstLaunch !== false) {
          const isSystemAutoStart = autostart.isEnabled();
          if (config.autoStart !== isSystemAutoStart) {
            config.autoStart = isSystemAutoStart;
            needsSave = true;
          }
        }

        if (needsSave) {
          try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
          } catch (writeErr) {
            console.warn('Не вдалося зберегти мігрований config.json:', writeErr.message);
          }
        }

        return config;
      }
    } catch (err) {
      console.error('Помилка читання config.json, використання значень за замовчуванням:', err.message);
    }
    return {
      ...this.defaults,
      autoStart: autostart.isEnabled()
    };
  }

  saveConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      
      // Налаштування автозапуску в системі через спеціалізований менеджер
      if (typeof newConfig.autoStart === 'boolean') {
        autostart.setAutoStart(this.config.autoStart);
      }

      this.emit('changed', this.config);
      return { success: true };
    } catch (err) {
      console.error('Помилка збереження config.json:', err.message);
      return { success: false, error: err.message };
    }
  }

  getWsUrl() {
    if (this.config.apiProvider === 'ubilling') {
      return null;
    }
    if (this.config.devMode) {
      if (this.config.wsUrl && this.config.wsUrl !== DEFAULT_WS_URL) {
        return this.config.wsUrl;
      }
      if (this.config.serverUrl) {
        try {
          const u = new URL(this.config.serverUrl);
          u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
          u.pathname = '/ws';
          u.search = '';
          return u.toString();
        } catch (e) {
          // ignore error
        }
      }
    }
    return DEFAULT_WS_URL;
  }

  get(key) {
    if (key === 'autoStart') {
      const isSystemAutoStart = autostart.isEnabled();
      if (this.config.autoStart !== isSystemAutoStart) {
        this.config.autoStart = isSystemAutoStart;
      }
    }
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.emit('changed', this.config);
  }

  getAll() {
    // Гарантуємо, що autoStart завжди відображає реальний стан у системі
    const isSystemAutoStart = autostart.isEnabled();
    if (this.config.autoStart !== isSystemAutoStart) {
      this.config.autoStart = isSystemAutoStart;
    }
    return { ...this.config };
  }
}

module.exports = new ConfigManager();
