const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

class TrayManager {
  constructor() {
    this.tray = null;
    this.callbacks = {
      onShowMap: () => {},
      onShowSettings: () => {},
      onToggleWindow: () => {}
    };
    this.currentIconName = '';
  }

  init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    const icon = this.loadNativeIcon('tray-normal');

    this.tray = new Tray(icon);
    this.currentIconName = 'tray-normal';
    this.tray.setToolTip('Повітряні тривоги — Очікування даних...');

    this.updateContextMenu();

    // Подвійний клік відкриває / ховає головне вікно
    this.tray.on('double-click', () => {
      this.callbacks.onToggleWindow();
    });

    // Одинарний клік (натискання лівою кнопкою миші)
    this.tray.on('click', () => {
      this.callbacks.onToggleWindow();
    });
  }

  getIconPath(name) {
    return path.join(__dirname, '..', '..', 'assets', 'icons', `${name}.png`);
  }

  loadNativeIcon(name) {
    try {
      const p = this.getIconPath(name);
      return nativeImage.createFromPath(p);
    } catch (err) {
      console.error(`Помилка завантаження іконки ${name}:`, err.message);
      return nativeImage.createEmpty();
    }
  }

  updateContextMenu() {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Показати карту',
        click: () => this.callbacks.onShowMap()
      },
      {
        label: 'Налаштування',
        click: () => this.callbacks.onShowSettings()
      },
      { type: 'separator' },
      {
        label: 'Вихід',
        click: () => app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  getAlertInfo(alertType, alertLevel = 'red') {
    const isYellow = alertLevel === 'yellow';

    switch (alertType) {
      case 'artillery_shelling':
        return { icon: 'tray-artillery', title: 'Загроза артобстрілу!' };
      case 'urban_fights':
        return { icon: 'tray-urban-fights', title: 'Вуличні бої!' };
      case 'chemical':
        return { icon: 'tray-chemical', title: 'Хімічна небезпека!' };
      case 'nuclear':
        return { icon: 'tray-nuclear', title: 'Радіаційна загроза!' };
      case 'air_raid':
      default:
        return {
          icon: isYellow ? 'tray-air-raid-yellow' : 'tray-air-raid',
          title: isYellow ? 'Жовтий рівень загрози!' : 'Повітряна тривога (червоний рівень)!'
        };
    }
  }

  updateStatus({ isAlert, alertType, alertLevel, alertScope, threats, locationTitle, startedAt, isOffline }) {
    if (!this.tray) return;

    let iconName = 'tray-normal';
    let tooltip = `Повітряні тривоги — ${locationTitle || 'Україна'}: Немає тривоги`;

    if (isOffline) {
      iconName = 'tray-offline';
      tooltip = `Повітряні тривоги — ${locationTitle || 'Україна'}: Офлайн (немає зв'язку)`;
    } else if (isAlert) {
      const alertInfo = this.getAlertInfo(alertType, alertLevel);
      iconName = alertInfo.icon;
      const timeStr = startedAt ? new Date(startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
      
      let threatText = '';
      if (Array.isArray(threats) && threats.length > 0 && threats[0].source_message) {
        threatText = ` [${threats[0].source_message}]`;
      }
      
      const scopeNote = alertScope ? ` (${alertScope})` : '';
      tooltip = `Повітряні тривоги — ${locationTitle}: ${alertInfo.title}${scopeNote}${threatText}${timeStr ? ` (з ${timeStr})` : ''}`;
    }

    try {
      if (this.currentIconName !== iconName) {
        this.currentIconName = iconName;
        const icon = this.loadNativeIcon(iconName);
        this.tray.setImage(icon);
      }
      this.tray.setToolTip(tooltip);
    } catch (err) {
      console.warn('Не вдалося оновити трей:', err.message);
    }
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = new TrayManager();
