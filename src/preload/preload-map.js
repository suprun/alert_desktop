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

          // Для Neptun: приховуємо нижній рекламний док, банери підтримки, кнопки встановлення застосунку, промо-банери та рекламу
          if (host.includes('neptun')) {
            css += \`
              [class*="AppPromoBanner_"],
              [class*="AppPromoBanner"],
              [class*="promoOverlay"],
              [class*="promo-fade"],
              [class*="promo-pop"],
              [role="dialog"][aria-label*="застосунок"],
              [role="dialog"][aria-label*="додаток"],
              [role="dialog"][aria-label*="app" i],
              div[class*="overlay"][role="dialog"],
              [class*="BottomDock_dock"],
              [class*="BottomDock_"],
              [class*="SupportBanner_"],
              [class*="MapHeader_installSlot"],
              [class*="InstallPill_pill"],
              [class*="InstallChoice_"],
              ins.adsbygoogle,
              [id*="google_ads"],
              [class*="advertisement"],
              [class*="ad-banner"],
              iframe[src*="google"],
              iframe[src*="doubleclick"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                height: 0 !important;
                overflow: hidden !important;
              }
              body:has([class*="AppPromoBanner"]) {
                overflow: auto !important;
              }
            \`;
          }

          // Стилі для плаваючої пігулки переходу на зовнішній сайт
          css += \`
            #app-map-external-pill {
              box-sizing: border-box !important;
              position: fixed !important;
              top: 8px !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
              z-index: 2147483647 !important;
              display: inline-flex !important;
              align-items: center !important;
              gap: 6px !important;
              padding: 4px 12px !important;
              border-radius: 999px !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              font-size: 11.5px !important;
              font-weight: 500 !important;
              line-height: 1 !important;
              text-decoration: none !important;
              cursor: pointer !important;
              user-select: none !important;
              transition: all 0.18s ease !important;
              backdrop-filter: blur(8px) !important;
              -webkit-backdrop-filter: blur(8px) !important;
            }

            #app-map-external-pill span.app-map-pill-host {
              font-family: inherit !important;
              font-size: inherit !important;
              font-weight: inherit !important;
              line-height: inherit !important;
              color: inherit !important;
              white-space: nowrap !important;
              pointer-events: none !important;
            }

            /* Векторна іконка через CSS-маску (захищена від конфліктів із скриптами карти, зокрема mapCore.js на UkraineAlarm) */
            #app-map-external-pill .app-map-pill-icon {
              display: inline-block !important;
              width: 13px !important;
              height: 13px !important;
              min-width: 13px !important;
              min-height: 13px !important;
              max-width: 13px !important;
              max-height: 13px !important;
              vertical-align: middle !important;
              flex-shrink: 0 !important;
              background-color: currentColor !important;
              -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/%3E%3Cpolyline points='15 3 21 3 21 9'/%3E%3Cline x1='10' y1='14' x2='21' y2='3'/%3E%3C/svg%3E") no-repeat center / contain !important;
              mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/%3E%3Cpolyline points='15 3 21 3 21 9'/%3E%3Cline x1='10' y1='14' x2='21' y2='3'/%3E%3C/svg%3E") no-repeat center / contain !important;
              pointer-events: none !important;
            }

            /* Світла тема оформлення пігулки */
            #app-map-external-pill.pill-light,
            html.light #app-map-external-pill,
            body.light #app-map-external-pill,
            [data-theme="light"] #app-map-external-pill {
              background-color: rgba(255, 255, 255, 0.88) !important;
              border: 1px solid rgba(0, 0, 0, 0.15) !important;
              color: #334155 !important;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05) !important;
            }

            #app-map-external-pill.pill-light:hover,
            html.light #app-map-external-pill:hover,
            body.light #app-map-external-pill:hover,
            [data-theme="light"] #app-map-external-pill:hover {
              background-color: rgba(255, 255, 255, 0.98) !important;
              border-color: rgba(0, 0, 0, 0.3) !important;
              color: #0f172a !important;
              box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14) !important;
              transform: translateX(-50%) translateY(-1px) !important;
            }

            /* Темна тема оформлення пігулки (за замовчуванням) */
            #app-map-external-pill.pill-dark,
            #app-map-external-pill {
              background-color: rgba(24, 26, 31, 0.78) !important;
              border: 1px solid rgba(255, 255, 255, 0.18) !important;
              color: #cbd5e1 !important;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35) !important;
            }

            #app-map-external-pill.pill-dark:hover,
            #app-map-external-pill:hover {
              background-color: rgba(35, 38, 45, 0.94) !important;
              border-color: rgba(255, 255, 255, 0.35) !important;
              color: #ffffff !important;
              box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45) !important;
              transform: translateX(-50%) translateY(-1px) !important;
            }
          \`;

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

          // Векторна іконка через span із захищеною CSS-маскою (без емодзі та без конфліктів з mapCore.js на UkraineAlarm)
          pill.innerHTML = \`
            <span class="app-map-pill-icon" aria-hidden="true"></span>
            <span class="app-map-pill-host">\${host}</span>
          \`;

          // Початкове визначення теми оформлення для пігулки
          const isLight = (document.documentElement && document.documentElement.classList.contains('light')) ||
                          (document.body && document.body.classList.contains('light')) ||
                          (window.localStorage && (window.localStorage.getItem('alarm-theme') === 'light' || window.localStorage.getItem('darkMode') === 'false'));
          pill.classList.toggle('pill-light', Boolean(isLight));
          pill.classList.toggle('pill-dark', !isLight);
          pill.setAttribute('data-theme', isLight ? 'light' : 'dark');

          pill.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('app-open-external-url', { detail: window.location.origin }));
          });

          (document.body || document.documentElement).appendChild(pill);
        } catch (e) {}
      };

      // Слухач синхронізації теми для плаваючої пігулки у world 0
      window.addEventListener('app-set-pill-theme', (e) => {
        try {
          const isDark = Boolean(e && e.detail && e.detail.isDark);
          const pill = document.getElementById('app-map-external-pill');
          if (pill) {
            pill.classList.toggle('pill-dark', isDark);
            pill.classList.toggle('pill-light', !isDark);
            pill.setAttribute('data-theme', isDark ? 'dark' : 'light');
          }
        } catch (err) {}
      });

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

      // 7. Спеціальне усунення промо-банера додатка на карті Neptun
      const dismissNeptunPromo = () => {
        try {
          const host = window.location ? (window.location.hostname || '') : '';
          if (!host.includes('neptun')) return;

          const promoEls = document.querySelectorAll(
            '[class*="AppPromoBanner"], [role="dialog"][aria-label*="застосунок"], [role="dialog"][aria-label*="додаток"]'
          );
          if (promoEls.length > 0) {
            promoEls.forEach((el) => {
              try {
                const closeBtn = el.querySelector('button[class*="close"], button[aria-label*="акрити"]');
                if (closeBtn) closeBtn.click();
                el.remove();
              } catch (e) {}
            });
            if (document.body && document.body.style.overflow === 'hidden') {
              document.body.style.overflow = '';
            }
          }
        } catch (e) {}
      };

      // Ініціалізація стилів та пігулки
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          injectCustomStyles();
          injectFloatingPill();
          dismissNeptunPromo();
        });
      } else {
        injectCustomStyles();
        injectFloatingPill();
        dismissNeptunPromo();
      }
      window.addEventListener('load', () => {
        injectCustomStyles();
        injectFloatingPill();
        dismissNeptunPromo();
      });
      setInterval(dismissNeptunPromo, 1000);
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

function updatePillTheme(isDark) {
  try {
    const pill = document.getElementById('app-map-external-pill');
    if (pill) {
      pill.classList.toggle('pill-dark', Boolean(isDark));
      pill.classList.toggle('pill-light', !isDark);
      pill.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    window.dispatchEvent(new CustomEvent('app-set-pill-theme', { detail: { isDark: Boolean(isDark) } }));
  } catch (e) {}
}

function checkAndEmitTheme() {
  const isDark = detectTheme();
  updatePillTheme(isDark);
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
    updatePillTheme(targetIsDark);
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
