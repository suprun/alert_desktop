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
    this.currentIconName = 'tray-normal';
  }

  init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    const iconPath = this.getIconPath('tray-normal');
    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon);
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

  updateStatus({ isAlert, alertType, locationTitle, startedAt, isOffline }) {
    if (!this.tray) return;

    let iconName = 'tray-normal';
    let tooltip = `alert_desktop — ${locationTitle || 'Україна'}: Немає тривоги`;

    if (isOffline) {
      iconName = 'tray-offline';
      tooltip = `alert_desktop — ${locationTitle || 'Україна'}: Офлайн (немає зв'язку)`;
    } else if (isAlert) {
      if (alertType === 'artillery_shelling') {
        iconName = 'tray-artillery';
        tooltip = `alert_desktop — ${locationTitle}: Загроза артобстрілу!`;
      } else {
        iconName = 'tray-air-raid';
        const timeStr = startedAt ? new Date(startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
        tooltip = `alert_desktop — ${locationTitle}: Повітряна тривога!${timeStr ? ` (з ${timeStr})` : ''}`;
      }
    }

    if (this.currentIconName !== iconName) {
      this.currentIconName = iconName;
      const icon = nativeImage.createFromPath(this.getIconPath(iconName));
      this.tray.setImage(icon);
    }

    this.tray.setToolTip(tooltip);
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = new TrayManager();
