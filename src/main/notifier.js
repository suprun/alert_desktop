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

      const hours = Math.floor(diffMin / 60);
      const minutes = diffMin % 60;
      return minutes > 0 ? `${hours} год ${minutes} хв` : `${hours} год`;
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
