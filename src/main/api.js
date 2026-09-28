const { EventEmitter } = require('events');
const config = require('./config');
const locationsData = require('./locations.json');

// Індексація локацій для швидкого пошуку ієрархічних зв'язків
const locationByUid = new Map();
const locationByTitle = new Map();

for (const loc of locationsData) {
  if (loc.uid) {
    locationByUid.set(String(loc.uid), loc);
  }
  if (loc.title) {
    locationByTitle.set(loc.title.toLowerCase().trim(), loc);
  }
}

class AlertApiService extends EventEmitter {
  constructor() {
    super();
    this.timer = null;
    this.lastState = {
      isAlert: false,
      alertType: 'none',
      alertLevel: 'none',
      alertScope: null,
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

      // Пошук об'єкта обраної локації для побудови ієрархії (громада -> район -> область)
      let currentLocation = locationByUid.get(selectedUid);
      if (!currentLocation && selectedTitle) {
        currentLocation = locationByTitle.get(selectedTitle);
      }
      if (!currentLocation && selectedTitle) {
        currentLocation = locationsData.find(l => {
          const t = l.title.toLowerCase().trim();
          return t === selectedTitle || t.includes(selectedTitle) || selectedTitle.includes(t);
        });
      }

      // Формуємо пріоритетну ієрархію:
      // 1. Пряма локація (громада / район / область / місто)
      // 2. Батьківський район (для громади)
      // 3. Батьківська область (для громади або району)
      const targetHierarchy = [];
      if (currentLocation) {
        targetHierarchy.push({
          level: 'direct',
          uid: String(currentLocation.uid),
          title: currentLocation.title.toLowerCase().trim(),
          sourceTitle: currentLocation.title
        });
        if (currentLocation.raionUid && String(currentLocation.raionUid) !== String(currentLocation.uid)) {
          targetHierarchy.push({
            level: 'raion',
            uid: String(currentLocation.raionUid),
            title: (currentLocation.raionTitle || '').toLowerCase().trim(),
            sourceTitle: currentLocation.raionTitle || 'Район'
          });
        }
        if (currentLocation.oblastUid && String(currentLocation.oblastUid) !== String(currentLocation.uid)) {
          targetHierarchy.push({
            level: 'oblast',
            uid: String(currentLocation.oblastUid),
            title: (currentLocation.oblastTitle || '').toLowerCase().trim(),
            sourceTitle: currentLocation.oblastTitle || 'Область'
          });
        }
      } else if (selectedUid || selectedTitle) {
        targetHierarchy.push({
          level: 'direct',
          uid: selectedUid,
          title: selectedTitle,
          sourceTitle: config.get('locationTitle') || 'Локація'
        });
      }

      // Шукаємо активну тривогу за спаданням специфічності (громада -> район -> область)
      let matchedAlert = null;
      let matchedScope = null;

      for (const target of targetHierarchy) {
        for (const alert of alerts) {
          const alertUid = String(alert.location_uid || alert.uid || alert.id || '');
          const alertTitle = (alert.location_title || alert.title || '').toLowerCase().trim();
          const alertOblast = (alert.location_oblast || '').toLowerCase().trim();
          const alertType = alert.location_type || '';

          const matchUid = target.uid && alertUid === target.uid;
          const matchTitle = target.title && (alertTitle === target.title || alertTitle.includes(target.title) || target.title.includes(alertTitle));
          const matchOblast = target.level === 'oblast' && alertType === 'oblast' && target.title && alertOblast === target.title;

          if (matchUid || matchTitle || matchOblast) {
            matchedAlert = alert;
            matchedScope = target.level !== 'direct' ? target.sourceTitle : null;
            break;
          }
        }
        if (matchedAlert) break;
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
        alertScope: matchedScope, // джерело тривоги, якщо вона поширюється з району чи області
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
          alertScope: newState.alertScope,
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
