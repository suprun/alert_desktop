const { webFrame, ipcRenderer } = require('electron');

// 1. Код у контексті головного світу (world 0) для блокування PiP,
// очищення зайвих банерів/меню та створення плаваючої пігулки-посилання
try {
  webFrame.executeJavaScript(`
    (() => {
      // 1. Повідомляємо веб-додаток, що Picture-in-Picture не підтримується
      try {
        Object.defineProperty(document, 'pictureInPictureEnabled', {
          get: () => false,
          configurable: false
        });
      } catch (e) {}

      // 2. Блокуємо requestPictureInPicture на рівні прототипу відео
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

      // 4. Очищення та стилізація сторінок (UkraineAlarm, Alerts.in.ua тощо)
      const injectCustomStyles = () => {
        try {
          if (document.getElementById('app-custom-injected-styles')) return;
          const host = window.location.hostname || '';
          const style = document.createElement('style');
          style.id = 'app-custom-injected-styles';

          let css = \`
            /* Приховування кнопок PiP та міні-карт */
            button[title*="Picture-in-picture" i],
            button[title*="міні-мап" i],
            button[title*="мини-карт" i],
            button[title*="pip" i],
            button[aria-label*="Picture-in-picture" i],
            button[aria-label*="міні-мап" i],
            button[aria-label*="мини-карт" i],
            button[aria-label*="pip" i],
            [data-action*="pip" i],
            [data-action*="mini-map" i],
            .pip-button,
            .mini-map-button {
              display: none !important;
            }
          \`;

          // Для UkraineAlarm: приховуємо верхнє меню та рекламний банер з віджетом тривог
          if (host.includes('ukrainealarm')) {
            css += \`
              .header, .header-wrapper, .header-container {
                display: none !important;
              }
              .bottom-banner, #bottom-banner_a, #bottom-banner_img, [class*="bottom-banner"] {
                display: none !important;
              }
              .appHolder {
                height: 100% !important;
                top: 0 !important;
              }
              .svgMapHolder {
                height: 100% !important;
              }
            \`;
          }

          style.textContent = css;
          (document.head || document.documentElement).appendChild(style);
        } catch (e) {}
      };

      // 5. Впровадження плаваючої пігулки з посиланням на сайт (крім локальної карти)
      const injectFloatingPill = () => {
        try {
          const host = window.location.hostname || '';
          if (!host || host === 'localhost' || host === '127.0.0.1' || document.getElementById('app-map-external-pill')) {
            return;
          }

          const pill = document.createElement('a');
          pill.id = 'app-map-external-pill';
          pill.href = window.location.origin;
          pill.target = '_blank';
          pill.rel = 'noopener noreferrer';
          pill.title = 'Відкрити ' + host + ' у системному браузері';
          pill.setAttribute('aria-label', 'Відкрити ' + host + ' у браузері');

          // Векторна SVG-іконка зовнішнього переходу (без емодзі)
          pill.innerHTML = \`
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span>\${host}</span>
          \`;

          Object.assign(pill.style, {
            position: 'fixed',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '2147483647',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            backgroundColor: 'rgba(24, 26, 31, 0.76)',
            backdropFilter: 'blur(8px)',
            webkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '999px',
            color: '#cbd5e1',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '11.5px',
            fontWeight: '500',
            lineHeight: '1',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.18s ease'
          });

          pill.addEventListener('mouseenter', () => {
            pill.style.backgroundColor = 'rgba(35, 38, 45, 0.94)';
            pill.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            pill.style.color = '#ffffff';
            pill.style.transform = 'translateX(-50%) translateY(-1px)';
          });

          pill.addEventListener('mouseleave', () => {
            pill.style.backgroundColor = 'rgba(24, 26, 31, 0.76)';
            pill.style.borderColor = 'rgba(255, 255, 255, 0.16)';
            pill.style.color = '#cbd5e1';
            pill.style.transform = 'translateX(-50%)';
          });

          pill.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('app-open-external-url', { detail: window.location.origin }));
          });

          (document.body || document.documentElement).appendChild(pill);
        } catch (e) {}
      };

      // 6. Перехоплення localStorage.setItem та removeItem для відстеження тем
      try {
        const origSetItem = Storage.prototype.setItem;
        const origRemoveItem = Storage.prototype.removeItem;
        Storage.prototype.setItem = function(key, val) {
          origSetItem.apply(this, arguments);
          if (key === 'darkMode' || key === 'alarm-theme' || key === 'dark_mode') {
            window.dispatchEvent(new CustomEvent('app-storage-theme-change', { detail: { key, val } }));
          }
        };
        Storage.prototype.removeItem = function(key) {
          origRemoveItem.apply(this, arguments);
          if (key === 'darkMode' || key === 'alarm-theme' || key === 'dark_mode') {
            window.dispatchEvent(new CustomEvent('app-storage-theme-change', { detail: { key } }));
          }
        };
      } catch (e) {}

      // Ініціалізація стилів та пігулки
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          injectCustomStyles();
          injectFloatingPill();
        });
      } else {
        injectCustomStyles();
        injectFloatingPill();
      }
      window.addEventListener('load', () => {
        injectCustomStyles();
        injectFloatingPill();
      });
    })();
  `);
} catch (err) {
  // Silent catch
}

// 2. Відстеження теми оформлення (світла/темна) на веб-сторінках
let lastKnownIsDark = null;

function detectTheme() {
  try {
    const host = window.location ? (window.location.hostname || '') : '';

    // А) UkraineAlarm: ключ 'alarm-theme' або перемикач
    if (host.includes('ukrainealarm')) {
      const alarmTheme = window.localStorage ? window.localStorage.getItem('alarm-theme') : null;
      if (alarmTheme === 'light') return false;
      if (alarmTheme === 'dark') return true;

      const switcher = document.querySelector('.theme-switcher');
      if (switcher && switcher.classList.contains('light')) return false;

      if (document.documentElement && document.documentElement.classList.contains('light')) {
        return false;
      }
      return true;
    }

    // Б) Alerts.in.ua: значення darkMode у localStorage або іконка
    if (host.includes('alerts.in.ua')) {
      const stored = window.localStorage ? window.localStorage.getItem('darkMode') : null;
      if (stored === 'false') return false;
      if (stored === 'true') return true;

      if (document.documentElement && document.documentElement.classList.contains('light')) {
        return false;
      }

      // Якщо на кнопці режимів зображений Місяць — значить зараз світла тема (клік перемкне на темну)
      if (document.querySelector('.modes-button .fa-moon')) {
        return false;
      }
      return true;
    }

    // В) Інші сайти (Neptun тощо)
    const docCls = document.documentElement ? document.documentElement.classList : null;
    const bodyCls = document.body ? document.body.classList : null;

    if ((docCls && docCls.contains('light')) || (bodyCls && bodyCls.contains('light'))) {
      return false;
    }
    if ((docCls && docCls.contains('dark')) || (bodyCls && bodyCls.contains('dark'))) {
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

// Примусове застосування теми з головного вікна
ipcRenderer.on('set-view-theme', (_event, { isDark }) => {
  try {
    const targetIsDark = Boolean(isDark);
    lastKnownIsDark = targetIsDark;
    const host = window.location ? (window.location.hostname || '') : '';

    // 1. Для Alerts.in.ua: викликаємо штатні механізми сайту через кнопку .modes-button
    if (host.includes('alerts.in.ua')) {
      const currentDark = detectTheme();
      if (currentDark !== targetIsDark) {
        const modesBtn = document.querySelector('.modes-button[title*="світлий/темний" i], .modes-button:has(.fa-sun, .fa-moon), .modes-button');
        if (modesBtn) {
          modesBtn.click();
        } else {
          // Якщо кнопка ще не змонтована Vue:
          if (window.localStorage) {
            window.localStorage.setItem('darkMode', targetIsDark ? 'true' : 'false');
          }
          if (document.documentElement) {
            document.documentElement.classList.toggle('light', !targetIsDark);
          }
        }
      }
      return;
    }

    // 2. Для UkraineAlarm: викликаємо перемикач .theme-switcher
    if (host.includes('ukrainealarm')) {
      const currentDark = detectTheme();
      if (currentDark !== targetIsDark) {
        const switcher = document.querySelector('.theme-switcher');
        if (switcher) {
          switcher.click();
        } else {
          if (window.localStorage) {
            if (targetIsDark) window.localStorage.removeItem('alarm-theme');
            else window.localStorage.setItem('alarm-theme', 'light');
          }
          if (document.documentElement) {
            document.documentElement.classList.toggle('light', !targetIsDark);
          }
        }
      }
      return;
    }

    // 3. Для Neptun та інших карт
    if (window.localStorage) {
      window.localStorage.setItem('darkMode', targetIsDark ? 'true' : 'false');
    }
    if (document.documentElement) {
      document.documentElement.classList.toggle('dark', targetIsDark);
      document.documentElement.classList.toggle('light', !targetIsDark);
    }
    if (document.body) {
      document.body.classList.toggle('dark', targetIsDark);
      document.body.classList.toggle('light', !targetIsDark);
    }
  } catch (e) {}
});

// Слухач відкриття зовнішнього посилання від пігулки
window.addEventListener('app-open-external-url', (e) => {
  try {
    const url = e.detail || (window.location ? window.location.origin : '');
    if (url) {
      ipcRenderer.send('open-external-url', url);
    }
  } catch (err) {}
});

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

// Відстеження зміни ключів у localStorage
window.addEventListener('storage', (e) => {
  if (e.key === 'darkMode' || e.key === 'alarm-theme' || e.key === 'dark_mode') {
    checkAndEmitTheme();
  }
});
window.addEventListener('app-storage-theme-change', () => {
  checkAndEmitTheme();
});

// Перехоплення кліків на перемикачі теми сторінки
window.addEventListener('click', () => {
  setTimeout(checkAndEmitTheme, 50);
  setTimeout(checkAndEmitTheme, 250);
}, true);

// Періодична контрольна звірка раз на 2 секунди
setInterval(checkAndEmitTheme, 2000);
