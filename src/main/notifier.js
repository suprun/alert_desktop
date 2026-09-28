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

  notifyStatusChange({ isAlert, alertType, locationTitle }) {
    const soundEnabled = config.get('soundEnabled');
    const volume = config.get('volume');

    const iconPath = path.join(
      __dirname,
      '..',
      '..',
      'assets',
      'icons',
      isAlert ? 'tray-air-raid.png' : 'tray-normal.png'
    );
    const notificationIcon = nativeImage.createFromPath(iconPath);

    let title = '';
    let body = '';
    let soundType = '';

    if (isAlert) {
      const typeText = this.getAlertTypeText(alertType);
      title = `${typeText} — ${locationTitle}`;
      body = 'Негайно пройдіть в найближче укриття!';
      soundType = 'alert';
    } else {
      title = `Відбій тривоги — ${locationTitle}`;
      body = 'Загроза минула. Слідкуйте за офіційними повідомленнями.';
      soundType = 'all-clear';
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
    if (soundEnabled && this.audioCallback) {
      this.audioCallback(soundType, volume);
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
