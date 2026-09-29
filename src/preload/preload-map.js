const { webFrame, ipcRenderer } = require('electron');

// 1. Запускаємо код у контексті головного світу веб-сторінки (world 0)
// для повного блокування Picture-in-Picture та міні-мапи до ініціалізації скриптів alerts.in.ua
try {
  webFrame.executeJavaScript(`
    (() => {
      // 1. Повідомляємо веб-додаток, що Picture-in-Picture не підтримується рушієм
      try {
        Object.defineProperty(document, 'pictureInPictureEnabled', {
          get: () => false,
          configurable: false
        });
      } catch (e) {}

      // 2. Блокуємо виклики requestPictureInPicture на рівні прототипу відеоплеєра
      if (typeof HTMLVideoElement !== 'undefined' && HTMLVideoElement.prototype) {
        HTMLVideoElement.prototype.requestPictureInPicture = function() {
          return Promise.reject(new DOMException('Picture-in-Picture is disabled in desktop client', 'NotSupportedError'));
        };
      }

      // 3. Блокуємо document.exitPictureInPicture
      if (typeof document.exitPictureInPicture === 'function') {
        document.exitPictureInPicture = function() {
          return Promise.reject(new DOMException('Picture-in-Picture is disabled in desktop client', 'NotSupportedError'));
        };
      }

      // 4. Функція для приховування UI-кнопок запуску міні-мапи / Picture-in-picture
      const hidePipElements = () => {
        try {
          const selectors = [
            'button[title*="Picture-in-picture" i]',
            'button[title*="міні-мап" i]',
            'button[title*="мини-карт" i]',
            'button[title*="pip" i]',
            'button[aria-label*="Picture-in-picture" i]',
            'button[aria-label*="міні-мап" i]',
            'button[aria-label*="мини-карт" i]',
            'button[aria-label*="pip" i]',
            '[data-action*="pip" i]',
            '[data-action*="mini-map" i]',
            '.pip-button',
            '.mini-map-button'
          ];
          const elements = document.querySelectorAll(selectors.join(','));
          elements.forEach(el => {
            el.style.display = 'none';
          });
        } catch (e) {}
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hidePipElements);
      } else {
        hidePipElements();
      }
      window.addEventListener('load', hidePipElements);
    })();
  `);
} catch (err) {
  // Silent catch
}

// 2. Відстеження теми оформлення (світла/темна) на веб-сторінці alerts.in.ua
let lastKnownIsDark = null;

function detectTheme() {
  try {
    // А) Пріоритет: значення darkMode у localStorage сторінки alerts.in.ua
    const stored = window.localStorage ? window.localStorage.getItem('darkMode') : null;
    if (stored !== null) {
      if (stored === 'true' || stored === true || stored === '1') return true;
      if (stored === 'false' || stored === false || stored === '0') return false;
    }

    // Б) Класи на documentElement та body
    const docCls = document.documentElement ? document.documentElement.classList : null;
    const bodyCls = document.body ? document.body.classList : null;

    if ((docCls && docCls.contains('light')) || (bodyCls && bodyCls.contains('light'))) {
      return false;
    }
    if ((docCls && docCls.contains('dark')) || (bodyCls && bodyCls.contains('dark'))) {
      return true;
    }

    // В) Системний медіа-запит prefers-color-scheme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return false;
    }
  } catch (e) {
    // fallback
  }
  return true; // За замовчуванням темна тема
}

function checkAndEmitTheme() {
  const isDark = detectTheme();
  if (lastKnownIsDark !== isDark) {
    lastKnownIsDark = isDark;
    try {
      ipcRenderer.send('map-theme-changed', { isDark });
    } catch (e) {
      // ignore ipc error
    }
  }
}

// Початкова перевірка при завантаженні DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndEmitTheme);
} else {
  checkAndEmitTheme();
}
window.addEventListener('load', checkAndEmitTheme);

// Спостереження за змінами класів DOM (MutationObserver)
try {
  const observer = new MutationObserver(() => {
    checkAndEmitTheme();
  });
  if (document.documentElement) {
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  }
  if (document.body) {
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  }
} catch (e) {}

// Відстеження зміни ключа у localStorage
window.addEventListener('storage', (e) => {
  if (e.key === 'darkMode') {
    checkAndEmitTheme();
  }
});

// Перехоплення кліків на перемикач теми
window.addEventListener('click', () => {
  setTimeout(checkAndEmitTheme, 50);
  setTimeout(checkAndEmitTheme, 250);
}, true);

// Періодична контрольна звірка раз на 1.5 секунди
setInterval(checkAndEmitTheme, 1500);
