const { EventEmitter } = require('events');
const config = require('./config');
const locationsData = require('./locations.json');
const threatUtils = require('./threat-utils');

let WebSocketClient;
try {
  WebSocketClient = require('ws');
} catch (e) {
  WebSocketClient = globalThis.WebSocket;
}

// Індексація локацій для швидкого пошуку ієрархічних зв'язків
const locationByUid = new Map();
const locationByTitle = new Map();
const raionsByOblastUid = new Map();

for (const loc of locationsData) {
  if (loc.uid) {
    locationByUid.set(String(loc.uid), loc);
  }
  if (loc.title) {
    locationByTitle.set(loc.title.toLowerCase().trim(), loc);
  }
  if (loc.type === 'Район' && loc.oblastUid) {
    const obUid = String(loc.oblastUid);
    if (!raionsByOblastUid.has(obUid)) {
      raionsByOblastUid.set(obUid, []);
    }
    raionsByOblastUid.get(obUid).push(loc);
  }
}

class AlertApiService extends EventEmitter {
  constructor() {
    super();
    this.timer = null;
    this.ws = null;
    this.wsReconnectTimer = null;
    this.wsReconnectDelay = 1000;
    this.isWsConnected = false;
    this.isChecking = false;
    this.isInitialCheck = true;
    this.currentAlerts = [];
    this.currentWsUrl = null;

    this.lastState = {
      isAlert: false,
      alertType: 'none',
      alertLevel: 'none',
      alertScope: null,
      threats: [],
      threatInfo: threatUtils.formatThreatInfo([], 'none', 'none'),
      startedAt: null,
      locationTitle: config.get('locationTitle'),
      allAlertsCount: 0,
      isOffline: false,
      isRealtime: false,
      lastChecked: null
    };

    // Слухаємо зміни конфігурації
    config.on('changed', () => {
      this.lastState.locationTitle = config.get('locationTitle');
      // При зміні локації / налаштувань перераховуємо статус, але НЕ відтворюємо звукові сповіщення
      if (this.currentAlerts.length > 0) {
        this._processAlertsPayload(this.currentAlerts, { suppressNotification: true });
      } else {
        this.checkNow({ suppressNotification: true });
      }

      // Якщо змінилася адреса сервера/сокета — перепідключаємося
      const targetWs = config.getWsUrl();
      if (this.currentWsUrl && this.currentWsUrl !== targetWs) {
        this.connectWebSocket();
      }
    });
  }

  startPolling() {
    this.stopPolling();

    // 1. Негайний HTTP-запит для швидкого відображення стану в перші 100мс
    this.checkNow();

    // 2. Підключення до WebSocket шлюзу для отримання Webhook-подій у реальному часі (0 сек затримки)
    this.connectWebSocket();

    // 3. Фонові перевірки:
    // Якщо WebSocket підключено — повільна контрольна перевірка раз на 60 сек
    // Якщо WebSocket розірвано — стандартне HTTP опитування кожні 15 сек
    const interval = Math.max(10000, config.get('pollingInterval') || 15000);
    let pollTick = 0;
    this.timer = setInterval(() => {
      pollTick++;
      // Якщо сокет розірвано — регулярне опитування щоразу (15с).
      // Якщо сокет підключено — контрольна звірка раз на ~60с (кожні 4 такти).
      if (!this.isWsConnected || pollTick % 4 === 0) {
        this.checkNow();
      }
    }, interval);
  }

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.disconnectWebSocket();
  }

  connectWebSocket() {
    this.disconnectWebSocket();

    if (!WebSocketClient) {
      console.warn('[WebSocket] Бібліотека WebSocket недоступна в поточному середовищі.');
      return;
    }

    const wsUrl = config.getWsUrl();
    this.currentWsUrl = wsUrl;

    try {
      console.log(`[WebSocket] Підключення до шлюзу тривог: ${wsUrl}...`);
      this.ws = new WebSocketClient(wsUrl);

      const onOpen = () => {
        console.log(`[WebSocket] З'єднання успішно встановлено з ${wsUrl}`);
        this.isWsConnected = true;
        this.wsReconnectDelay = 1000;
        this.lastState.isRealtime = true;
        this.lastState.isOffline = false;
        this.emit('status-updated', this.lastState);
      };

      const onMessage = (raw) => {
        try {
          const text = typeof raw === 'string' ? raw : (raw.data ? raw.data.toString() : raw.toString());
          const data = JSON.parse(text);
          this._handleWsMessage(data);
        } catch (err) {
          console.warn('[WebSocket] Помилка обробки повідомлення:', err.message);
        }
      };

      const onClose = () => {
        if (this.isWsConnected) {
          console.log('[WebSocket] З\'єднання закрито сервером.');
        }
        this.isWsConnected = false;
        this.lastState.isRealtime = false;
        this._scheduleWsReconnect();
      };

      const onError = (err) => {
        console.warn('[WebSocket] Помилка з\'єднання:', err.message || err);
      };

      if (typeof this.ws.on === 'function') {
        this.ws.on('open', onOpen);
        this.ws.on('message', onMessage);
        this.ws.on('close', onClose);
        this.ws.on('error', onError);
      } else {
        this.ws.onopen = onOpen;
        this.ws.onmessage = onMessage;
        this.ws.onclose = onClose;
        this.ws.onerror = onError;
      }
    } catch (err) {
      console.warn('[WebSocket] Не вдалося створити сокет:', err.message);
      this._scheduleWsReconnect();
    }
  }

  disconnectWebSocket() {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      try {
        if (typeof this.ws.removeAllListeners === 'function') {
          this.ws.removeAllListeners();
        } else {
          this.ws.onopen = null;
          this.ws.onmessage = null;
          this.ws.onclose = null;
          this.ws.onerror = null;
        }
        this.ws.close();
      } catch (e) {
        // ignore close error
      }
      this.ws = null;
    }
    this.isWsConnected = false;
    this.lastState.isRealtime = false;
  }

  _scheduleWsReconnect() {
    if (this.wsReconnectTimer) return;

    const delay = this.wsReconnectDelay;
    this.wsReconnectDelay = Math.min(15000, this.wsReconnectDelay * 2);

    this.wsReconnectTimer = setTimeout(() => {
      this.wsReconnectTimer = null;
      this.connectWebSocket();
    }, delay);
  }

  _handleWsMessage(data) {
    if (!data || !data.event) return;

    if (data.event === 'initial_state' || data.event === 'sync_state') {
      const alerts = Array.isArray(data.alerts) ? data.alerts : [];
      this._processAlertsPayload(alerts);
    } else if (data.event === 'alert_event') {
      // Отримано Webhook-подію в реальному часі!
      const alerts = Array.isArray(data.alerts) ? data.alerts : [];
      console.log(`[WebSocket Push] Отримано оновлення тривоги: regionId=${data.regionId}, status=${data.status}`);
      this._processAlertsPayload(alerts);
    } else if (data.event === 'ping') {
      if (this.ws && (this.ws.readyState === 1 || this.ws.readyState === (WebSocketClient && WebSocketClient.OPEN))) {
        try {
          this.ws.send('pong');
        } catch (e) {
          // ignore send error
        }
      }
    }
  }

  _processAlertsPayload(alerts, options = {}) {
    this.currentAlerts = alerts;

    const selectedUid = String(config.get('locationUid') || '');
    const selectedTitle = (config.get('locationTitle') || '').toLowerCase().trim();

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

    // Визначаємо, чи обрана локація є областю
    const isSelectedOblast = currentLocation && (
      currentLocation.type === 'Область' ||
      (currentLocation.oblastUid && String(currentLocation.oblastUid) === String(currentLocation.uid) && !currentLocation.raionUid)
    );

    let matchedAlert = null;
    let matchedScope = null;

    if (isSelectedOblast) {
      // 1. Пряма перевірка: чи є в активних тривогах загальнообласний запис (state / oblast)
      const currentOblastTitle = (currentLocation.title || '').toLowerCase().trim();
      const directOblastAlert = alerts.find(alert => {
        const alertUid = String(alert.location_uid || alert.uid || alert.id || '');
        const alertType = alert.location_type || '';
        const alertOblast = (alert.location_oblast || '').toLowerCase().trim();
        const alertTitle = (alert.location_title || alert.title || '').toLowerCase().trim();

        const matchUid = alertUid === String(currentLocation.uid);
        const matchState = (alertType === 'state' || alertType === 'oblast') &&
          (alertTitle === currentOblastTitle || alertOblast === currentOblastTitle);

        return matchUid || matchState;
      });

      if (directOblastAlert) {
        matchedAlert = directOblastAlert;
        matchedScope = null;
      } else {
        // 2. Якщо прямого загальнообласного запису немає, перевіряємо активність районів цієї області.
        // Затверджено: тривога для області активується виключно тоді, коли тривога активна у ВСІХ районах області одночасно.
        const expectedRaions = raionsByOblastUid.get(String(currentLocation.uid)) || [];
        const totalExpectedRaions = expectedRaions.length;

        if (totalExpectedRaions > 0) {
          const expectedRaionUidMap = new Map();
          const expectedRaionTitleMap = new Map();

          for (const r of expectedRaions) {
            expectedRaionUidMap.set(String(r.uid), r);
            expectedRaionTitleMap.set((r.title || '').toLowerCase().trim(), r);
          }

          const activeRaionAlerts = [];
          const activeRaionUids = new Set();

          for (const alert of alerts) {
            const alertUid = String(alert.location_uid || alert.uid || alert.id || '');
            const alertType = alert.location_type || '';
            const alertOblast = (alert.location_oblast || '').toLowerCase().trim();
            const alertTitle = (alert.location_title || alert.title || '').toLowerCase().trim();

            let matchedRaion = expectedRaionUidMap.get(alertUid);
            if (!matchedRaion && (alertType === 'district' || alertOblast === currentOblastTitle)) {
              matchedRaion = expectedRaionTitleMap.get(alertTitle);
            }

            if (matchedRaion) {
              const canonicalUid = String(matchedRaion.uid);
              if (!activeRaionUids.has(canonicalUid)) {
                activeRaionUids.add(canonicalUid);
                activeRaionAlerts.push(alert);
              }
            }
          }

          // Перевіряємо, чи всі райони області мають активну тривогу
          if (activeRaionUids.size >= totalExpectedRaions) {
            let hasArtillery = false;
            let hasUrban = false;
            let hasChemical = false;
            let hasNuclear = false;
            let hasRed = false;
            const combinedThreatsMap = new Map();
            let earliestTime = null;

            for (const a of activeRaionAlerts) {
              if (a.alert_type === 'artillery_shelling') hasArtillery = true;
              if (a.alert_type === 'urban_fights') hasUrban = true;
              if (a.alert_type === 'chemical') hasChemical = true;
              if (a.alert_type === 'nuclear') hasNuclear = true;
              if (a.alert_level === 'red') hasRed = true;

              if (Array.isArray(a.threats)) {
                for (const t of a.threats) {
                  const type = t.threat_type || 'unknown';
                  const existing = combinedThreatsMap.get(type);
                  if (!existing) {
                    combinedThreatsMap.set(type, { ...t });
                  } else if (t.level === 'red' && existing.level !== 'red') {
                    combinedThreatsMap.set(type, { ...existing, level: 'red' });
                  }
                }
              }

              const alertTimeStr = a.started_at || a.created_at;
              if (alertTimeStr) {
                const time = new Date(alertTimeStr).getTime();
                if (!isNaN(time) && (!earliestTime || time < earliestTime)) {
                  earliestTime = time;
                }
              }
            }

            let aggregatedAlertType = 'air_raid';
            if (hasArtillery) aggregatedAlertType = 'artillery_shelling';
            else if (hasUrban) aggregatedAlertType = 'urban_fights';
            else if (hasChemical) aggregatedAlertType = 'chemical';
            else if (hasNuclear) aggregatedAlertType = 'nuclear';

            const aggregatedAlertLevel = hasRed ? 'red' : 'yellow';
            const aggregatedThreats = Array.from(combinedThreatsMap.values());
            const earliestStartedAt = earliestTime ? new Date(earliestTime).toISOString() : new Date().toISOString();

            matchedAlert = {
              location_uid: String(currentLocation.uid),
              location_title: currentLocation.title,
              location_type: 'state',
              location_oblast: currentLocation.title,
              alert_type: aggregatedAlertType,
              alert_level: aggregatedAlertLevel,
              threats: aggregatedThreats,
              started_at: earliestStartedAt
            };
            matchedScope = null;
          }
        }
      }
    } else {
      // Для громади чи району: стандартний ієрархічний пошук знизу вгору (громада -> район -> область)
      for (const target of targetHierarchy) {
        for (const alert of alerts) {
          const alertUid = String(alert.location_uid || alert.uid || alert.id || '');
          const alertTitle = (alert.location_title || alert.title || '').toLowerCase().trim();
          const alertOblast = (alert.location_oblast || '').toLowerCase().trim();
          const alertType = alert.location_type || '';

          const matchUid = target.uid && alertUid === target.uid;
          const matchTitle = target.title && (alertTitle === target.title || alertTitle.includes(target.title) || target.title.includes(alertTitle));
          const matchOblast = target.level === 'oblast' && (alertType === 'state' || alertType === 'oblast') && target.title && alertOblast === target.title;

          if (matchUid || matchTitle || matchOblast) {
            matchedAlert = alert;
            matchedScope = target.level !== 'direct' ? target.sourceTitle : null;
            break;
          }
        }
        if (matchedAlert) break;
      }
    }

    const previousIsAlert = this.lastState.isAlert;
    const previousLevel = this.lastState.alertLevel;
    const isAlert = Boolean(matchedAlert);
    const alertType = matchedAlert ? (matchedAlert.alert_type || 'air_raid') : 'none';
    const alertLevel = matchedAlert ? (matchedAlert.alert_level || 'red') : 'none';
    const threats = matchedAlert && Array.isArray(matchedAlert.threats) ? matchedAlert.threats : [];
    const threatInfo = threatUtils.formatThreatInfo(threats, alertType, alertLevel);
    const startedAt = matchedAlert ? (matchedAlert.started_at || matchedAlert.created_at || new Date().toISOString()) : null;

    const newState = {
      isAlert,
      alertType,
      alertLevel, // 'red', 'yellow' або 'none'
      alertScope: matchedScope, // джерело тривоги, якщо вона поширюється з району чи області
      threats,
      threatInfo, // нормалізований об'єкт загрози
      startedAt,
      locationTitle: config.get('locationTitle'),
      allAlertsCount: alerts.length,
      isOffline: false,
      isRealtime: this.isWsConnected,
      lastChecked: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    const suppressNotification = options.suppressNotification === true;

    // Перевірка зміни статусу або рівня тривоги для сповіщення.
    // При першому опитуванні після запуску застосунку (isInitialCheck) або при збереженні налаштувань (suppressNotification) звук не програється.
    if (!this.isInitialCheck && !suppressNotification) {
      if (previousIsAlert !== isAlert || (isAlert && (this.lastState.alertType !== alertType || previousLevel !== alertLevel))) {
        this.emit('status-changed', {
          isAlert,
          alertType,
          alertLevel,
          alertScope: newState.alertScope,
          threats,
          threatInfo,
          previousIsAlert,
          locationTitle: newState.locationTitle,
          startedAt
        });
      }
    } else {
      this.isInitialCheck = false;
      this.emit('status-synced', newState);
    }

    this.lastState = newState;
    this.emit('status-updated', this.lastState);
  }

  async checkNow(options = {}) {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const devMode = config.get('devMode') === true;
      const defaultProxyUrl = process.env.ALERTS_API_URL || 'https://api.applink.pp.ua/v1/alerts/active.json';
      let requestUrl = devMode ? (config.get('serverUrl') || defaultProxyUrl) : defaultProxyUrl;
      const apiKey = devMode ? (config.get('apiKey') || '') : '';

      // Якщо вказано API ключ (у режимі розробника), додаємо його до запиту
      if (apiKey) {
        if (!requestUrl.includes('token=')) {
          const sep = requestUrl.includes('?') ? '&' : '?';
          requestUrl = `${requestUrl}${sep}token=${encodeURIComponent(apiKey)}`;
        }
      }

      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'alert_desktop/2.0'
      };

      if (apiKey) {
        headers['X-API-Key'] = apiKey;
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

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

      this._processAlertsPayload(alerts, options);

    } catch (err) {
      console.warn('Помилка під час REST опитування сервера тривог:', err.message);
      if (!this.isWsConnected) {
        this.lastState = {
          ...this.lastState,
          isOffline: true,
          lastChecked: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        this.emit('status-updated', this.lastState);
      }
    } finally {
      this.isChecking = false;
    }
  }

  getCurrentState() {
    return { ...this.lastState };
  }

  getStatus() {
    return this.getCurrentState();
  }
}

module.exports = new AlertApiService();
