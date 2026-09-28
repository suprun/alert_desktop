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
    this.tray.setToolTip('alert_desktop — Очікування даних...');

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

  getAlertInfo(alertType) {
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
        return { icon: 'tray-air-raid', title: 'Повітряна тривога!' };
    }
  }

  updateStatus({ isAlert, alertType, locationTitle, startedAt, isOffline }) {
    if (!this.tray) return;

    let iconName = 'tray-normal';
    let tooltip = `alert_desktop — ${locationTitle || 'Україна'}: Немає тривоги`;

    if (isOffline) {
      iconName = 'tray-offline';
      tooltip = `alert_desktop — ${locationTitle || 'Україна'}: Офлайн (немає зв'язку)`;
    } else if (isAlert) {
      const alertInfo = this.getAlertInfo(alertType);
      iconName = alertInfo.icon;
      const timeStr = startedAt ? new Date(startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
      tooltip = `alert_desktop — ${locationTitle}: ${alertInfo.title}${timeStr ? ` (з ${timeStr})` : ''}`;
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
