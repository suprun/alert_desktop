const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.loadEnv();
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.defaults = {
      locationUid: '31', // За замовчуванням м. Київ
      locationTitle: 'м. Київ',
      soundEnabled: true,
      volume: 80,
      autoStart: false,
      serverUrl: process.env.ALERTS_API_URL || 'https://api.alerts.in.ua/v1/alerts/active.json',
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

        // Автоматична міграція застарілих / некоректних URL API
        if (!config.serverUrl || config.serverUrl.includes('devs.alerts.in.ua') || config.serverUrl.includes('/api/v1/alerts/active.json')) {
          config.serverUrl = process.env.ALERTS_API_URL || 'https://api.alerts.in.ua/v1/alerts/active.json';
        }

        // Синхронізація ключа з .env якщо в конфізі порожній
        if (!config.apiKey && process.env.ALERTS_API_KEY) {
          config.apiKey = process.env.ALERTS_API_KEY;
        }

        return config;
      }
    } catch (err) {
      console.error('Помилка читання config.json, використання значень за замовчуванням:', err.message);
    }
    return { ...this.defaults };
  }

  saveConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      
      // Налаштування автозапуску в системі
      if (typeof newConfig.autoStart === 'boolean') {
        app.setLoginItemSettings({
          openAtLogin: this.config.autoStart,
          name: 'alert_desktop'
        });
      }

      this.emit('changed', this.config);
      return { success: true };
    } catch (err) {
      console.error('Помилка збереження config.json:', err.message);
      return { success: false, error: err.message };
    }
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return { ...this.config };
  }
}

module.exports = new ConfigManager();
