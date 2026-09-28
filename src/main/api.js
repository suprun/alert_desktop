const { EventEmitter } = require('events');
const config = require('./config');

class AlertApiService extends EventEmitter {
  constructor() {
    super();
    this.timer = null;
    this.lastState = {
      isAlert: false,
      alertType: 'none',
      startedAt: null,
      locationTitle: config.get('locationTitle'),
      allAlertsCount: 0,
      isOffline: false,
      lastChecked: null
    };

    // Слухаємо зміни конфігурації
    config.on('changed', () => {
      this.lastState.locationTitle = config.get('locationTitle');
      this.checkNow();
    });
  }

  startPolling() {
    this.checkNow();
    const interval = Math.max(10000, config.get('pollingInterval') || 15000);
    this.timer = setInterval(() => {
      this.checkNow();
    }, interval);
  }

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkNow() {
    const serverUrl = config.get('serverUrl') || 'https://api.alerts.in.ua/v1/alerts/active.json';
    let requestUrl = serverUrl;
    const apiKey = config.get('apiKey') || '';
    const selectedUid = String(config.get('locationUid') || '');
    const selectedTitle = (config.get('locationTitle') || '').toLowerCase().trim();

    // Якщо вказано API ключ, додаємо його до запиту (через token query параметр та headers)
    if (apiKey) {
      if (!requestUrl.includes('token=')) {
        const sep = requestUrl.includes('?') ? '&' : '?';
        requestUrl = `${requestUrl}${sep}token=${encodeURIComponent(apiKey)}`;
      }
    }

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'alert_desktop/1.0'
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP помилка: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const alerts = Array.isArray(data) ? data : (data.alerts || []);

      // Пошук активної тривоги для вибраної локації
      let matchedAlert = null;

      for (const alert of alerts) {
        const alertUid = String(alert.location_uid || alert.uid || alert.id || '');
        const alertTitle = (alert.location_title || alert.title || alert.location_oblast || '').toLowerCase().trim();

        const matchUid = selectedUid && alertUid === selectedUid;
        const matchTitle = selectedTitle && (alertTitle === selectedTitle || alertTitle.includes(selectedTitle) || selectedTitle.includes(alertTitle));

        if (matchUid || matchTitle) {
          matchedAlert = alert;
          break;
        }
      }

      const previousIsAlert = this.lastState.isAlert;
      const previousLevel = this.lastState.alertLevel;
      const isAlert = Boolean(matchedAlert);
      const alertType = matchedAlert ? (matchedAlert.alert_type || 'air_raid') : 'none';
      const alertLevel = matchedAlert ? (matchedAlert.alert_level || 'red') : 'none';
      const threats = matchedAlert && Array.isArray(matchedAlert.threats) ? matchedAlert.threats : [];
      const startedAt = matchedAlert ? (matchedAlert.started_at || matchedAlert.created_at || new Date().toISOString()) : null;

      const newState = {
        isAlert,
        alertType,
        alertLevel, // 'red', 'yellow' або 'none'
        threats,
        startedAt,
        locationTitle: config.get('locationTitle'),
        allAlertsCount: alerts.length,
        isOffline: false,
        lastChecked: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      // Перевірка зміни статусу або рівня тривоги для сповіщення
      if (previousIsAlert !== isAlert || (isAlert && (this.lastState.alertType !== alertType || previousLevel !== alertLevel))) {
        this.emit('status-changed', {
          isAlert,
          alertType,
          alertLevel,
          threats,
          previousIsAlert,
          locationTitle: newState.locationTitle,
          startedAt
        });
      }

      this.lastState = newState;
      this.emit('status-updated', this.lastState);

    } catch (err) {
      console.warn('Помилка під час опитування сервера тривог:', err.message);
      this.lastState = {
        ...this.lastState,
        isOffline: true,
        lastChecked: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      this.emit('status-updated', this.lastState);
    }
  }

  getCurrentState() {
    return { ...this.lastState };
  }
}

module.exports = new AlertApiService();
