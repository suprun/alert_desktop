/**
 * Модуль отримання історії тривог та статистики для адмінодиниць (HistoryService).
 * Дворівнева архітектура:
 * 1. Основне джерело: власний проксі-шлюз (Gateway) через ендпоінт /v1/history/region.
 * 2. Резервне джерело (Fallback): прямі запити до api.alerts.in.ua/v3/ при недоступності Gateway.
 */

const https = require('https');
const http = require('http');
const config = require('./config');

const BASE_EPOCH_ALERTS_IN_UA = 1640000000;

class HistoryService {
  constructor() {
    // Локальний кеш для fallback-запитів до alerts.in.ua (TTL 60 сек)
    this._fallbackCacheTime = 0;
    this._fallbackStats = [];
    this._fallbackAlerts = [];
    this._fallbackEvents = [];
    this._cacheTtlMs = 60000;
  }

  /**
   * Допоміжний метод виконання HTTP/HTTPS GET запиту з таймаутом.
   * @param {string} url
   * @param {number} timeoutMs
   * @returns {Promise<any>}
   */
  _fetchJson(url, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'AlertDesktop/1.0',
            Accept: 'application/json'
          },
          timeout: timeoutMs
        },
        (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            return reject(new Error(`HTTP status ${res.statusCode}`));
          }
          let rawData = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(rawData);
              resolve(parsed);
            } catch (e) {
              reject(new Error(`Invalid JSON: ${e.message}`));
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout (${timeoutMs}ms)`));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Визначає базовий URL проксі-шлюзу з налаштувань.
   * @returns {string}
   */
  _getGatewayBaseUrl() {
    const serverUrl = config.get('serverUrl') || 'https://api.applink.pp.ua/v1/alerts/active.json';
    try {
      const parsed = new URL(serverUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return 'https://api.applink.pp.ua';
    }
  }

  /**
   * Завантажує та оновлює локальний кеш публічних даних api.alerts.in.ua.
   */
  async _refreshFallbackCache() {
    const now = Date.now();
    if (now - this._fallbackCacheTime < this._cacheTtlMs && this._fallbackAlerts.length > 0) {
      return;
    }

    try {
      const [statsRes, alertsRes, eventsRes] = await Promise.allSettled([
        this._fetchJson('https://api.alerts.in.ua/v3/stats/duration/today.json', 7000),
        this._fetchJson('https://api.alerts.in.ua/v3/alerts/recent.json', 7000),
        this._fetchJson('https://api.alerts.in.ua/v3/alert_events/recent.json', 7000)
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value && Array.isArray(statsRes.value.data)) {
        this._fallbackStats = statsRes.value.data;
      }
      if (alertsRes.status === 'fulfilled' && alertsRes.value && Array.isArray(alertsRes.value.alerts)) {
        this._fallbackAlerts = alertsRes.value.alerts;
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value && Array.isArray(eventsRes.value.alert_events)) {
        this._fallbackEvents = eventsRes.value.alert_events;
      }

      this._fallbackCacheTime = now;
    } catch (e) {
      console.warn('[HistoryService] Помилка оновлення fallback-кешу:', e.message);
    }
  }

  /**
   * Форматує тривалість у людиночитаний вигляд українською.
   * @param {number|null} min
   * @returns {string}
   */
  _formatDuration(min) {
    if (min === null || min === undefined || isNaN(min)) return '';
    if (min < 1) return '< 1 хв';
    const hours = Math.floor(min / 60);
    const remainderMin = min % 60;
    if (hours === 0) return `${remainderMin} хв`;
    if (remainderMin === 0) return `${hours} год`;
    return `${hours} год ${remainderMin} хв`;
  }

  /**
   * Форматує дату та час у компактний український формат.
   * @param {number|null} timestampSec Unix timestamp у секундах
   * @returns {string}
   */
  _formatTime(timestampSec) {
    if (!timestampSec) return '';
    const date = new Date(timestampSec * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (isToday) return `Сьогодні, ${timeStr}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Вчора, ${timeStr}`;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}, ${timeStr}`;
  }

  /**
   * Формує історію з fallback-даних при збої Gateway.
   * @param {string} regionUid
   * @param {string|null} oblastUid
   * @returns {object}
   */
  _buildFallbackResponse(regionUid, oblastUid) {
    const uidStr = String(regionUid).trim();
    const oblastUidStr = oblastUid ? String(oblastUid).trim() : null;

    // 1. Статистика за сьогодні
    let stat = this._fallbackStats.find((d) => String(d.luid) === uidStr);
    if (!stat && oblastUidStr) {
      stat = this._fallbackStats.find((d) => String(d.luid) === oblastUidStr);
    }

    const todayStats = {
      alertCount: stat && typeof stat.ac === 'number' ? stat.ac : 0,
      totalDurationMin: stat && typeof stat.d === 'number' ? Math.round(stat.d / 60000) : 0,
      isActive: Boolean(stat && stat.a)
    };

    // 2. Список недавніх тривог
    const isOblastSelected = uidStr === oblastUidStr;

    const isMatchingLocation = (item) => {
      const iLuid = String(item.luid || '');
      const iLoi = String(item.loi || '');
      const iType = String(item.t || '');
      if (isOblastSelected) {
        return iLuid === uidStr || iLoi === uidStr;
      }
      // Обрано конкретний район або місто спеціального статусу
      return iLuid === uidStr || (Boolean(oblastUidStr) && iType === 's' && iLuid === oblastUidStr);
    };

    const alertsByKey = new Map();

    // 1. Додаємо записи з alerts (основний перелік тривог)
    for (const a of this._fallbackAlerts) {
      if (!isMatchingLocation(a)) continue;
      const sRaw = a.s;
      if (!sRaw) continue; // Ігноруємо без мітки початку
      const aLuid = String(a.luid || '');
      const key = `${aLuid}_${sRaw}`;
      alertsByKey.set(key, { ...a });
    }

    // 2. Додаємо/оновлюємо з alert_events
    for (const e of this._fallbackEvents) {
      if (!isMatchingLocation(e)) continue;
      const eLuid = String(e.luid || '');
      const sRaw = e.s;
      if (sRaw) {
        const key = `${eLuid}_${sRaw}`;
        if (!alertsByKey.has(key)) {
          alertsByKey.set(key, { ...e });
        } else if (e.f && !alertsByKey.get(key).f) {
          alertsByKey.get(key).f = e.f;
        }
      } else if (e.f) {
        // Подія відбою без часу початку: оновлюємо відкриту тривогу для цієї локації
        for (const [key, alertItem] of alertsByKey.entries()) {
          if (String(alertItem.luid || '') === eLuid && !alertItem.f && (alertItem.s || 0) <= e.f) {
            alertItem.f = e.f;
            break;
          }
        }
      }
    }

    const threatLabels = {
      1: 'Повітряна тривога',
      2: 'Загроза артобстрілу',
      3: 'Ракетна загроза',
      4: 'Дронова загроза',
      5: 'Загроза тактичної авіації',
      6: 'Загроза пусків КАБ',
      7: 'Хімічна загроза',
      8: 'Радіаційна загроза'
    };

    const matched = [];

    for (const item of alertsByKey.values()) {
      const sRaw = item.s;
      if (!sRaw) continue;

      const fRaw = item.f;
      const startedAt = BASE_EPOCH_ALERTS_IN_UA + sRaw;
      const finishedAt = fRaw ? (BASE_EPOCH_ALERTS_IN_UA + fRaw) : null;
      const durationMin = (fRaw && fRaw >= sRaw) ? Math.round((fRaw - sRaw) / 60) : null;

      const threatVal = item.at || 1;
      let threatName = threatLabels[threatVal] || 'Повітряна тривога';
      if (item.m) threatName = item.m;

      matched.push({
        id: item.i || item.u || `${item.luid}_${sRaw}`,
        startedAt,
        finishedAt,
        startedText: this._formatTime(startedAt),
        finishedText: this._formatTime(finishedAt),
        durationMin,
        durationText: this._formatDuration(durationMin),
        isActive: !Boolean(finishedAt),
        threatType: threatVal,
        threatLabel: threatName,
        message: item.m || item.nt || null,
        source: item.nt || item.su || null
      });
    }

    matched.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

    return {
      success: true,
      source: 'fallback_alerts_in_ua',
      regionUid: uidStr,
      oblastUid: oblastUidStr,
      todayStats: {
        ...todayStats,
        durationFormatted: this._formatDuration(todayStats.totalDurationMin)
      },
      recentAlerts: matched.slice(0, 15)
    };
  }

  /**
   * Головний метод отримання історії для адмінодиниці.
   * Спершу запитує Gateway, при збої перемикається на прямий Alerts.in.ua.
   * @param {string} regionUid
   * @param {string|null} oblastUid
   * @returns {Promise<object>}
   */
  async getRegionHistory(regionUid, oblastUid = null) {
    const gatewayBase = this._getGatewayBaseUrl();
    const queryParams = new URLSearchParams({
      uid: String(regionUid).trim()
    });
    if (oblastUid) {
      queryParams.set('oblast_uid', String(oblastUid).trim());
    }

    const gatewayUrl = `${gatewayBase}/v1/history/region?${queryParams.toString()}`;

    // 1. Спроба отримати з Gateway
    try {
      const data = await this._fetchJson(gatewayUrl, 5000);
      if (data && data.success) {
        // Доповнюємо відформатованим людиночитаним текстом часу
        if (data.today_stats && typeof data.today_stats.total_duration_min === 'number') {
          data.today_stats.duration_formatted = this._formatDuration(data.today_stats.total_duration_min);
        }
        if (Array.isArray(data.recent_alerts)) {
          data.recent_alerts.forEach((alert) => {
            alert.started_text = this._formatTime(alert.started_at);
            alert.finished_text = this._formatTime(alert.finished_at);
            alert.duration_text = this._formatDuration(alert.duration_min);
          });
        }
        return data;
      }
    } catch (gatewayErr) {
      console.warn(`[HistoryService] Gateway недоступний (${gatewayErr.message}). Застосовується fallback...`);
    }

    // 2. Резервний канал (Fallback) на api.alerts.in.ua
    await this._refreshFallbackCache();
    return this._buildFallbackResponse(regionUid, oblastUid);
  }
}

module.exports = new HistoryService();
