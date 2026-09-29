let electron;
try {
  electron = require('electron');
} catch (_) {
  electron = null;
}

const app = (electron && typeof electron === 'object' && electron.app) ? electron.app : null;
const { execFileSync } = require('child_process');
const path = require('path');

const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const APP_NAME = 'AlertDesktop';

class AutoStartManager {
  setAutoStart(enable) {
    try {
      const execPath = process.execPath;
      const appPath = (app && app.getAppPath) ? app.getAppPath() : path.resolve(__dirname, '..', '..');
      const isPackaged = Boolean(app && app.isPackaged);
      const args = isPackaged ? ['--hidden'] : [appPath, '--hidden'];

      // 1. Electron вбудований API
      if (app && typeof app.setLoginItemSettings === 'function') {
        try {
          app.setLoginItemSettings({
            openAtLogin: Boolean(enable),
            path: execPath,
            args: args
          });
        } catch (e) {
          console.warn('Попередження app.setLoginItemSettings:', e.message);
        }
      }

      // 2. Безпосередній нативний запис до реєстру Windows (гарантує запуск у будь-якому режимі)
      if (process.platform === 'win32') {
        if (enable) {
          const command = isPackaged ? `"${execPath}" --hidden` : `"${execPath}" "${appPath}" --hidden`;
          execFileSync('reg.exe', ['add', REG_KEY, '/v', APP_NAME, '/t', 'REG_SZ', '/d', command, '/f'], { stdio: 'ignore' });
        } else {
          try {
            execFileSync('reg.exe', ['delete', REG_KEY, '/v', APP_NAME, '/f'], { stdio: 'ignore' });
          } catch (_) {
            // Ключ уже видалений або відсутній
          }
        }
      }
      return true;
    } catch (err) {
      console.warn('Помилка оновлення автозапуску:', err.message);
      return false;
    }
  }

  isEnabled() {
    if (process.platform === 'win32') {
      try {
        const out = execFileSync('reg.exe', ['query', REG_KEY, '/v', APP_NAME], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        });
        return out.includes(APP_NAME);
      } catch (_) {
        return false;
      }
    }
    return (app && typeof app.getLoginItemSettings === 'function') ? app.getLoginItemSettings().openAtLogin : false;
  }
}

module.exports = new AutoStartManager();

