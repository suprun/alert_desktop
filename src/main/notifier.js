const { Notification, nativeImage } = require('electron');
const path = require('path');
const config = require('./config');

class NotifierService {
  constructor() {
    this.audioCallback = null;
  }

  setAudioCallback(cb) {
    this.audioCallback = cb;
  }

  notifyStatusChange({ isAlert, alertType, alertLevel, locationTitle, alertScope, threatInfo }) {
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
      iconName = isYellow ? 'tray-air-raid-yellow.png' : 'tray-air-raid.png';
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

      if (threatInfo && threatInfo.notificationText) {
        body = threatInfo.notificationText;
      } else if (isYellow) {
        body = 'Дрони. Загроза ударних БПЛА. Дотримуйтесь правил безпеки.';
      } else {
        body = 'Негайно пройдіть в найближче укриття!';
      }

      soundType = 'alert';
      soundId = alertSound;
      isSoundAllowed = soundAlertEnabled;
    } else {
      title = `Відбій тривоги — ${locationTitle}`;
      body = 'Загроза минула. Слідкуйте за офіційними повідомленнями.';
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

module.exports = new NotifierService();
