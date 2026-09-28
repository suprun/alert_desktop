const { webFrame } = require('electron');

// Запускаємо код у контексті головного світу веб-сторінки (world 0)
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
