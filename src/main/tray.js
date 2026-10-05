const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

class TrayManager {
  constructor() {
    this.tray = null;
    this.callbacks = {
      onShowMap: () => {},
      onShowSettings: () => {},
      onToggleWindow: () => {},
      onCheckForUpdates: () => {},
      onInstallUpdate: () => {}
    };
    this.currentIconName = '';
    this.updateInfo = null;
  }

  setUpdateInfo(info) {
    this.updateInfo = info;
    this.updateContextMenu();
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

    const items = [];

    // Якщо оновлення завантажено — показуємо кнопку встановлення угорі меню
    if (this.updateInfo && this.updateInfo.downloaded) {
      items.push({
        label: `🔄 Встановити оновлення v${this.updateInfo.version}`,
        click: () => this.callbacks.onInstallUpdate && this.callbacks.onInstallUpdate()
      });
      items.push({ type: 'separator' });
    }

    items.push(
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
        label: 'Перевірити оновлення...',
        click: () => this.callbacks.onCheckForUpdates && this.callbacks.onCheckForUpdates()
      },
      { type: 'separator' },
      {
        label: 'Вихід',
        click: () => app.quit()
      }
    );

    const contextMenu = Menu.buildFromTemplate(items);
    this.tray.setContextMenu(contextMenu);
  }

  getAlertInfo(alertType, alertLevel = 'red', threatInfo = null) {
    // 1. Пріоритет за структурованою інформацією про характер загрози (threatInfo)
    if (threatInfo && threatInfo.iconType) {
      switch (threatInfo.iconType) {
        case 'combo_missile_drone':
        case 'combo':
          return { icon: 'tray-combo-missile-drone', title: threatInfo.badgeLabel || 'Ракетна та дронова загроза' };
        case 'drone':
          return { icon: 'tray-drone', title: threatInfo.badgeLabel || 'Дронова загроза' };
        case 'missile':
          return { icon: 'tray-missile', title: threatInfo.badgeLabel || 'Ракетна загроза' };
        case 'ballistic':
          return { icon: 'tray-ballistic', title: threatInfo.badgeLabel || 'Загроза балістики' };
        case 'aviation':
          return { icon: 'tray-aviation', title: threatInfo.badgeLabel || 'Загроза КАБ / авіація' };
        case 'artillery':
          return { icon: 'tray-artillery', title: threatInfo.badgeLabel || 'Загроза артобстрілу' };
        case 'chemical':
          return { icon: 'tray-chemical', title: threatInfo.badgeLabel || 'Хімічна небезпека' };
        case 'nuclear':
          return { icon: 'tray-nuclear', title: threatInfo.badgeLabel || 'Радіаційна загроза' };
      }
    }

    // 2. Фолбек за базовими параметрами alertType та alertLevel
    const isYellow = alertLevel === 'yellow';

    switch (alertType) {
      case 'artillery_shelling':
        return { icon: 'tray-artillery', title: 'Загроза артобстрілу' };
      case 'urban_fights':
        return { icon: 'tray-urban-fights', title: 'Вуличні бої' };
      case 'chemical':
        return { icon: 'tray-chemical', title: 'Хімічна небезпека' };
      case 'nuclear':
        return { icon: 'tray-nuclear', title: 'Радіаційна загроза' };
      case 'air_raid':
      default:
        return {
          icon: isYellow ? 'tray-drone' : 'tray-air-raid',
          title: isYellow ? 'Дронова загроза' : 'Повітряна тривога'
        };
    }
  }

  updateStatus({ isAlert, alertType, alertLevel, alertScope, threats, threatInfo, locationTitle, startedAt, isOffline, fallbackActive, activeProvider, offlineReason }) {
    if (!this.tray) return;

    let iconName = 'tray-normal';
    let tooltip = `Повітряні тривоги — ${locationTitle || 'Україна'}: Немає тривоги`;

    const fallbackTag = (fallbackActive && activeProvider) ? ` [резерв: ${activeProvider.toUpperCase()}]` : '';

    if (isOffline) {
      iconName = 'tray-offline';
      const reasonLabel = offlineReason === 'no_internet' ? 'немає інтернету' : 'немає зв\'язку';
      tooltip = `Повітряні тривоги — ${locationTitle || 'Україна'}: Офлайн (${reasonLabel})`;
    } else if (isAlert) {
      const alertInfo = this.getAlertInfo(alertType, alertLevel, threatInfo);
      iconName = alertInfo.icon;
      const timeStr = startedAt ? new Date(startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
      
      const threatLabel = (threatInfo && threatInfo.hasThreats && threatInfo.tooltipSuffix && threatInfo.tooltipSuffix !== alertInfo.title)
        ? ` · ${threatInfo.tooltipSuffix}` 
        : '';
      const scopeNote = alertScope ? ` (${alertScope})` : '';
      
      tooltip = `Повітряні тривоги — ${locationTitle}: ${alertInfo.title}${threatLabel}${scopeNote}${fallbackTag}${timeStr ? ` (з ${timeStr})` : ''}`;
    } else {
      tooltip = `Повітряні тривоги — ${locationTitle || 'Україна'}: Немає тривоги${fallbackTag}`;
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
