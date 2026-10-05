const { Notification, nativeImage } = require('electron');
const path = require('path');
const config = require('./config');

class NotifierService {
  constructor() {
    this.audioCallback = null;
    this.activeAlertStartedAt = null;
  }

  setAudioCallback(cb) {
    this.audioCallback = cb;
  }

  resetAlertTracking(startedAt = null) {
    this.activeAlertStartedAt = startedAt ? new Date(startedAt) : null;
  }

  formatTime(dateOrIso) {
    try {
      const d = dateOrIso ? new Date(dateOrIso) : new Date();
      if (isNaN(d.getTime())) {
        const now = new Date();
        return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      }
      const hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      const now = new Date();
      return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  }

  _pluralizeUa(n, one, few, many) {
    const abs = Math.abs(Math.round(n));
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
    if (mod10 === 1) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
    return `${n} ${many}`;
  }

  formatDuration(startDate, endDate) {
    try {
      if (!startDate || !endDate) return '';
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const diffMin = Math.round(diffMs / 60000);

      if (diffMin < 1) return '< 1 хв';
      if (diffMin < 60) return `${diffMin} хв`;

      // До 24 годин: звичний формат "X год" або "X год Y хв"
      if (diffMin < 1440) {
        const hours = Math.floor(diffMin / 60);
        const minutes = diffMin % 60;
        return minutes > 0 ? `${hours} год ${minutes} хв` : `${hours} год`;
      }

      // Від 24 годин: дні, місяці, роки з українськими відмінками
      let s = start;
      let e = end;
      if (s > e) {
        const tmp = s;
        s = e;
        e = tmp;
      }

      let years = e.getFullYear() - s.getFullYear();
      let months = e.getMonth() - s.getMonth();
      let days = e.getDate() - s.getDate();
      let hours = e.getHours() - s.getHours();
      let minutes = e.getMinutes() - s.getMinutes();

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
        const prevMonth = new Date(e.getFullYear(), e.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      if (years === 0 && months === 0 && days === 0) {
        const totalDays = Math.floor(diffMin / 1440);
        hours = Math.floor((diffMin % 1440) / 60);
        minutes = Math.round(diffMin % 60);

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
        parts.push(this._pluralizeUa(days, 'день', 'дні', 'днів'));
        if (hours > 0) {
          parts.push(this._pluralizeUa(hours, 'година', 'години', 'годин'));
        }
        if (days < 2 && hours === 0 && minutes > 0) {
          parts.push(this._pluralizeUa(minutes, 'хвилина', 'хвилини', 'хвилин'));
        }
      }

      return parts.join(' ');
    } catch {
      return '';
    }
  }

  notifyStatusChange({ isAlert, alertType, alertLevel, locationTitle, alertScope, threatInfo, startedAt }) {
    const volume = config.get('volume') !== undefined ? config.get('volume') : 80;
    const soundAlertEnabled = config.get('soundAlertEnabled') !== undefined 
      ? config.get('soundAlertEnabled') 
      : config.get('soundEnabled') !== false;
    const soundAllClearEnabled = config.get('soundAllClearEnabled') !== undefined 
      ? config.get('soundAllClearEnabled') 
      : config.get('soundEnabled') !== false;

    const alertSound = config.get('alertSound') || 'siren';
    const allClearSound = config.get('allClearSound') || 'chime';

    const isYellow = alertLevel === 'yellow';
    let iconName = 'tray-normal.png';
    if (isAlert) {
      if (threatInfo && threatInfo.iconType) {
        switch (threatInfo.iconType) {
          case 'combo_missile_drone':
          case 'combo':
            iconName = 'tray-combo-missile-drone.png';
            break;
          case 'drone':
            iconName = 'tray-drone.png';
            break;
          case 'missile':
            iconName = 'tray-missile.png';
            break;
          case 'ballistic':
            iconName = 'tray-ballistic.png';
            break;
          case 'aviation':
            iconName = 'tray-aviation.png';
            break;
          case 'artillery':
            iconName = 'tray-artillery.png';
            break;
          case 'chemical':
            iconName = 'tray-chemical.png';
            break;
          case 'nuclear':
            iconName = 'tray-nuclear.png';
            break;
          default:
            iconName = isYellow ? 'tray-drone.png' : 'tray-air-raid.png';
        }
      } else {
        iconName = isYellow ? 'tray-drone.png' : 'tray-air-raid.png';
      }
    }

    const iconPath = path.join(
      __dirname,
      '..',
      '..',
      'assets',
      'icons',
      iconName
    );
    const notificationIcon = nativeImage.createFromPath(iconPath);

    let title = '';
    let body = '';
    let soundType = '';
    let soundId = '';
    let isSoundAllowed = false;

    const scopeNote = alertScope ? ` (${alertScope})` : '';

    if (isAlert) {
      const typeText = isYellow ? 'Жовтий рівень' : this.getAlertTypeText(alertType);
      title = `${typeText} — ${locationTitle}${scopeNote}`;

      // Фіксуємо час початку тривоги
      const alertStartTime = startedAt ? new Date(startedAt) : new Date();
      this.activeAlertStartedAt = alertStartTime;
      const timeStr = this.formatTime(alertStartTime);

      let desc = 'Негайно пройдіть в найближче укриття!';
      if (threatInfo && threatInfo.notificationText) {
        desc = threatInfo.notificationText;
      } else if (isYellow) {
        desc = 'Дронова загроза. Оцініть безпекову ситуацію.';
      }

      // Windows Toast самостійно показує час доставки внизу картки, не дублюємо його у тексті
      body = desc;

      soundType = 'alert';
      soundId = alertSound;
      isSoundAllowed = soundAlertEnabled;
    } else {
      title = `Відбій тривоги — ${locationTitle}`;

      const clearTime = new Date();
      let durationText = '';
      if (this.activeAlertStartedAt) {
        const dur = this.formatDuration(this.activeAlertStartedAt, clearTime);
        if (dur) {
          durationText = ` (тривалість ${dur})`;
        }
        this.activeAlertStartedAt = null;
      }

      body = `Загроза минула${durationText}. Слідкуйте за офіційними повідомленнями.`;

      soundType = 'all-clear';
      soundId = allClearSound;
      isSoundAllowed = soundAllClearEnabled;
    }

    // Системне спливаюче сповіщення Windows
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: notificationIcon,
        silent: true // Вимикаємо стандартний звук Windows, щоб програвати наш
      });
      notification.show();
    }

    // Програвання звуку через аудіо-модуль
    if (isSoundAllowed && this.audioCallback) {
      this.audioCallback(soundType, soundId, volume);
    }
  }

  getAlertTypeText(alertType) {
    switch (alertType) {
      case 'air_raid':
        return 'Повітряна тривога';
      case 'artillery_shelling':
        return 'Загроза артобстрілу';
      case 'urban_fights':
        return 'Вуличні бої';
      case 'chemical':
        return 'Хімічна небезпека';
      case 'nuclear':
        return 'Радіаційна загроза';
      default:
        return 'Повітряна тривога';
    }
  }
}

const serviceInstance = new NotifierService();
serviceInstance.NotifierService = NotifierService;

module.exports = serviceInstance;
