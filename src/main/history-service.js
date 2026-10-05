/**
 * Модуль отримання історії тривог та статистики для адмінодиниць (HistoryService).
 * Дворівнева архітектура:
 * 1. Основне джерело: власний проксі-шлюз (Gateway) через ендпоінт /v1/history/region.
 * 2. Резервне джерело (Fallback): прямі запити до api.alerts.in.ua/v3/ при недоступності Gateway.
 */

const https = require('https');
const http = require('http');
const config = require('./config');
const locationsData = require('./locations.json');

// Індексація локацій: raionUid -> Set громад району, а також швидкий пошук за UID
const hromadasByRaionUid = new Map();
const locationByUid = new Map();

for (const loc of locationsData) {
  if (loc.uid) {
    locationByUid.set(String(loc.uid), loc);
  }
  if (loc.raionUid && loc.uid) {
    const rUid = String(loc.raionUid);
    const uid = String(loc.uid);
    if (rUid !== uid) {
      if (!hromadasByRaionUid.has(rUid)) {
        hromadasByRaionUid.set(rUid, new Set());
      }
      hromadasByRaionUid.get(rUid).add(uid);
    }
  }
}

const BASE_EPOCH_ALERTS_IN_UA = 1640000000;

class HistoryService {
  constructor() {
    // Локальний кеш для fallback-запитів до alerts.in.ua (TTL 60 сек)
    this._fallbackCacheTime = 0;
    this._fallbackStats = [];
    this._fallbackAlerts = [];
    this._fallbackEvents = [];
    this._cacheTtlMs = 60000;
    // Накопичувальний буфер спостережуваних тривог (ліміт: 500 записів)
    this._observedAlerts = new Map();
    this._maxObservedAlerts = 500;
  }

  /**
   * Записує тривогу до внутрішнього буфера спостережень.
   * @param {object} a
   */
  _recordAlert(a) {
    if (!a) return;
    const luid = a.luid || a.location_uid;
    const sRaw = a.s;
    if (!luid || !sRaw) return;
    const key = `${luid}_${sRaw}`;
    if (!this._observedAlerts.has(key)) {
      this._observedAlerts.set(key, { ...a });
    } else {
      const existing = this._observedAlerts.get(key);
      if (a.f && !existing.f) existing.f = a.f;
      if (a.at && !existing.at) existing.at = a.at;
      if (a.m && !existing.m) existing.m = a.m;
    }
    this._pruneObservedAlerts();
  }

  /**
   * Записує подію тривоги (початок або відбій) до внутрішнього буфера.
   * @param {object} e
   */
  _recordEvent(e) {
    if (!e) return;
    const eLuid = String(e.luid || e.location_uid || '');
    const sRaw = e.s;
    if (sRaw) {
      const key = `${eLuid}_${sRaw}`;
      if (!this._observedAlerts.has(key)) {
        this._observedAlerts.set(key, { ...e });
      } else if (e.f && !this._observedAlerts.get(key).f) {
        this._observedAlerts.get(key).f = e.f;
      }
    } else if (e.f) {
      for (const [key, alertItem] of this._observedAlerts.entries()) {
        const itemLuid = String(alertItem.luid || alertItem.location_uid || '');
        if (itemLuid === eLuid && !alertItem.f && (alertItem.s || 0) <= e.f) {
          alertItem.f = e.f;
          break;
        }
      }
    }
    this._pruneObservedAlerts();
  }

  /**
   * Обмежує розмір буфера спостережуваних тривог заданим лімітом (500).
   */
  _pruneObservedAlerts() {
    if (this._observedAlerts.size <= this._maxObservedAlerts) return;
    const entries = Array.from(this._observedAlerts.entries());
    entries.sort((a, b) => (b[1].s || 0) - (a[1].s || 0));
    this._observedAlerts = new Map(entries.slice(0, this._maxObservedAlerts));
  }

  /**
   * Публічний метод запису списку активних тривог (може викликатися сервісом API).
   * @param {Array<object>} alerts
   */
  recordActiveAlerts(alerts) {
    if (!Array.isArray(alerts)) return;
    for (const a of alerts) {
      let s = a.s;
      if (!s && a.started_at) {
        const startedSec = Math.floor(new Date(a.started_at).getTime() / 1000);
        if (startedSec > BASE_EPOCH_ALERTS_IN_UA) {
          s = startedSec - BASE_EPOCH_ALERTS_IN_UA;
        }
      }
      this._recordAlert({
        i: a.id || a.i,
        u: a.u,
        s,
        f: a.finished_at ? (Math.floor(new Date(a.finished_at).getTime() / 1000) - BASE_EPOCH_ALERTS_IN_UA) : (a.f || null),
        at: a.threat_type || a.at || 1,
        luid: a.location_uid || a.luid,
        loi: a.oblast_uid || a.loi,
        t: a.location_type || a.t,
        m: a.message || a.m || null,
        nt: a.notes || a.nt || null
      });
    }
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
        for (const a of this._fallbackAlerts) {
          this._recordAlert(a);
        }
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value && Array.isArray(eventsRes.value.alert_events)) {
        this._fallbackEvents = eventsRes.value.alert_events;
        for (const e of this._fallbackEvents) {
          this._recordEvent(e);
        }
      }

      this._fallbackCacheTime = now;
    } catch (e) {
      console.warn('[HistoryService] Помилка оновлення fallback-кешу:', e.message);
    }
  }

  /**
   * Схиляє іменник з числівником відповідно до правил української мови.
   * @param {number} n
   * @param {string} one (напр. 'рік', 'місяць', 'день', 'година', 'хвилина')
   * @param {string} few (напр. 'роки', 'місяці', 'дні', 'години', 'хвилини')
   * @param {string} many (напр. 'років', 'місяців', 'днів', 'годин', 'хвилин')
   * @returns {string}
   */
  _pluralizeUa(n, one, few, many) {
    const abs = Math.abs(Math.round(n));
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
    if (mod10 === 1) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
    return `${n} ${many}`;
  }

  /**
   * Форматує тривалість у людиночитаний вигляд українською.
   * Конвертує тривалість понад добу в дні, місяці та роки з правильними відмінками.
   * @param {number|null} min
   * @param {Date|number|string|null} startDate
   * @param {Date|number|string|null} endDate
   * @returns {string}
   */
  _formatDuration(min, startDate, endDate) {
    if (min === null || min === undefined || isNaN(min)) return '';
    if (min <= 0) return '0 хв';
    if (min < 1) return '< 1 хв';
    if (min < 60) return `${Math.round(min)} хв`;

    // До 24 годин: лаконічний формат "X год" або "X год Y хв"
    if (min < 1440) {
      const hours = Math.floor(min / 60);
      const remainderMin = Math.round(min % 60);
      if (remainderMin === 0) return `${hours} год`;
      return `${hours} год ${remainderMin} хв`;
    }

    // 1 доба або більше: конвертація в дні, місяці, роки з українськими відмінками
    let years = 0;
    let months = 0;
    let days = 0;
    let hours = 0;
    let minutes = 0;

    if (startDate && endDate) {
      let start = startDate instanceof Date ? startDate : new Date(typeof startDate === 'number' && startDate < 1e11 ? startDate * 1000 : startDate);
      let end = endDate instanceof Date ? endDate : new Date(typeof endDate === 'number' && endDate < 1e11 ? endDate * 1000 : endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (start > end) {
          const tmp = start;
          start = end;
          end = tmp;
        }

        years = end.getFullYear() - start.getFullYear();
        months = end.getMonth() - start.getMonth();
        days = end.getDate() - start.getDate();
        hours = end.getHours() - start.getHours();
        minutes = end.getMinutes() - start.getMinutes();

        if (minutes < 0) {
          hours -= 1;
          minutes += 60;
        }
        if (hours < 0) {
          days -= 1;
          hours += 24;
        }
        if (days < 0) {
          months -= 1;
          const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
          days += prevMonth.getDate();
        }
        if (months < 0) {
          years -= 1;
          months += 12;
        }
      }
    }

    // Якщо точні дати не передані або різниця не порахована
    if (years === 0 && months === 0 && days === 0) {
      const totalDays = Math.floor(min / 1440);
      hours = Math.floor((min % 1440) / 60);
      minutes = Math.round(min % 60);

      years = Math.floor(totalDays / 365);
      const remDays = totalDays % 365;
      months = Math.floor(remDays / 30);
      days = remDays % 30;
    }

    const parts = [];
    if (years > 0) {
      parts.push(this._pluralizeUa(years, 'рік', 'роки', 'років'));
      if (months > 0) {
        parts.push(this._pluralizeUa(months, 'місяць', 'місяці', 'місяців'));
      }
      if (days > 0) {
        parts.push(this._pluralizeUa(days, 'день', 'дні', 'днів'));
      }
    } else if (months > 0) {
      parts.push(this._pluralizeUa(months, 'місяць', 'місяці', 'місяців'));
      if (days > 0) {
        parts.push(this._pluralizeUa(days, 'день', 'дні', 'днів'));
      }
      if (days === 0 && hours > 0) {
        parts.push(this._pluralizeUa(hours, 'година', 'години', 'годин'));
      }
    } else {
      // Тільки дні (менше місяця)
      parts.push(this._pluralizeUa(days, 'день', 'дні', 'днів'));
      if (hours > 0) {
        parts.push(this._pluralizeUa(hours, 'година', 'години', 'годин'));
      }
      if (days < 2 && hours === 0 && minutes > 0) {
        parts.push(this._pluralizeUa(minutes, 'хвилина', 'хвилини', 'хвилин'));
      }
    }

    return parts.join(' ');
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
    if (date.getFullYear() !== now.getFullYear()) {
      return `${day}.${month}.${date.getFullYear()}, ${timeStr}`;
    }
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
    const childHromadas = hromadasByRaionUid.get(uidStr) || null;
    const selectedLoc = locationByUid.get(uidStr);
    const parentRaionUid = selectedLoc && selectedLoc.raionUid && String(selectedLoc.raionUid) !== uidStr
      ? String(selectedLoc.raionUid)
      : null;

    const isMatchingLocation = (item) => {
      const iLuid = String(item.luid || item.location_uid || '');
      const iLoi = String(item.loi || item.oblast_uid || '');
      const iType = String(item.t || item.location_type || '');

      // 1. Якщо обрано область цілком
      if (isOblastSelected) {
        return iLuid === uidStr || iLoi === uidStr;
      }

      // 2. Прямий збіг за UID локації
      if (iLuid === uidStr) {
        return true;
      }

      // 3. Якщо обрано район, а тривога оголошена в одній з його громад
      if (childHromadas && childHromadas.has(iLuid)) {
        return true;
      }

      // 4. Якщо обрано громаду, а тривога оголошена на весь її район
      if (parentRaionUid && iLuid === parentRaionUid) {
        return true;
      }

      // 5. Загальнообласна тривога
      if (oblastUidStr && (iType === 's' || iType === 'oblast') && (iLuid === oblastUidStr || iLoi === oblastUidStr)) {
        return true;
      }

      return false;
    };

    const alertsByKey = new Map();

    // 1. Додаємо записи з alerts (основний перелік тривог)
    for (const a of this._fallbackAlerts) {
      if (!isMatchingLocation(a)) continue;
      const sRaw = a.s;
      if (!sRaw) continue; // Ігноруємо без мітки початку
      const aLuid = String(a.luid || a.location_uid || '');
      const key = `${aLuid}_${sRaw}`;
      alertsByKey.set(key, { ...a });
    }

    // 2. Додаємо накопичені спостереження з буфера
    for (const a of this._observedAlerts.values()) {
      if (!isMatchingLocation(a)) continue;
      const sRaw = a.s;
      if (!sRaw) continue;
      const aLuid = String(a.luid || a.location_uid || '');
      const key = `${aLuid}_${sRaw}`;
      if (!alertsByKey.has(key)) {
        alertsByKey.set(key, { ...a });
      } else {
        const existing = alertsByKey.get(key);
        if (a.f && !existing.f) existing.f = a.f;
      }
    }

    // 3. Додаємо/оновлюємо з alert_events
    for (const e of this._fallbackEvents) {
      if (!isMatchingLocation(e)) continue;
      const eLuid = String(e.luid || e.location_uid || '');
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
          const itemLuid = String(alertItem.luid || alertItem.location_uid || '');
          if (itemLuid === eLuid && !alertItem.f && (alertItem.s || 0) <= e.f) {
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

      const isItemActive = !Boolean(finishedAt);
      const nowSec = Math.floor(Date.now() / 1000);
      let effectiveDurMin = durationMin;
      let effectiveDurText = '';

      if (durationMin !== null) {
        effectiveDurText = this._formatDuration(durationMin, startedAt, finishedAt);
      } else if (isItemActive && startedAt && nowSec >= startedAt) {
        effectiveDurMin = Math.max(1, Math.round((nowSec - startedAt) / 60));
        effectiveDurText = this._formatDuration(effectiveDurMin, startedAt, nowSec);
      }

      const threatVal = item.at || 1;
      let threatName = threatLabels[threatVal] || 'Повітряна тривога';
      if (item.m) threatName = item.m;

      matched.push({
        id: item.i || item.u || `${item.luid}_${sRaw}`,
        startedAt,
        finishedAt,
        startedText: this._formatTime(startedAt),
        finishedText: isItemActive ? 'Триває' : this._formatTime(finishedAt),
        durationMin: effectiveDurMin,
        durationText: effectiveDurText,
        isActive: isItemActive,
        threatType: threatVal,
        threatLabel: threatName,
        message: item.m || item.nt || null,
        source: item.nt || item.su || null
      });
    }

    matched.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

    // 3. Уточнення статистики за сьогодні за фактичними тривогами
    const nowSec = Math.floor(Date.now() / 1000);
    const startOfTodaySec = Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000);

    const todayAlerts = matched.filter(a => {
      if (a.startedAt && a.startedAt >= startOfTodaySec) return true;
      if (a.finishedAt && a.finishedAt >= startOfTodaySec) return true;
      if (a.isActive) return true;
      return false;
    });

    let alertCount = todayStats.alertCount;
    let totalDurationMin = todayStats.totalDurationMin;

    // Якщо в todayStats немає даних або alertCount 0, розраховуємо з фактичних тривог
    if (alertCount === 0 && todayAlerts.length > 0) {
      alertCount = todayAlerts.length;
      let computedDurationMin = 0;
      for (const a of todayAlerts) {
        const aStart = Math.max(a.startedAt || startOfTodaySec, startOfTodaySec);
        const aEnd = a.finishedAt ? a.finishedAt : nowSec;
        if (aEnd > aStart) {
          computedDurationMin += Math.round((aEnd - aStart) / 60);
        }
      }
      totalDurationMin = computedDurationMin;
    }

    const isActive = todayStats.isActive || todayAlerts.some(a => a.isActive);

    const finalTodayStats = {
      alertCount,
      totalDurationMin,
      isActive,
      durationFormatted: alertCount > 0 ? this._formatDuration(totalDurationMin) : ''
    };

    return {
      success: true,
      source: 'fallback_alerts_in_ua',
      regionUid: uidStr,
      oblastUid: oblastUidStr,
      todayStats: finalTodayStats,
      recentAlerts: matched.slice(0, 20)
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
        // Доповнюємо відформатованим людиночитаним текстом часу (тільки якщо були тривоги)
        if (data.today_stats && typeof data.today_stats.total_duration_min === 'number') {
          const alertCount = data.today_stats.alert_count ?? data.today_stats.alertCount ?? 0;
          data.today_stats.duration_formatted = alertCount > 0 ? this._formatDuration(data.today_stats.total_duration_min) : '';
        }
        if (Array.isArray(data.recent_alerts)) {
          data.recent_alerts.forEach((alert) => {
            alert.started_text = this._formatTime(alert.started_at);
            alert.finished_text = alert.is_active ? 'Триває' : this._formatTime(alert.finished_at);
            alert.duration_text = this._formatDuration(alert.duration_min, alert.started_at, alert.finished_at);
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
