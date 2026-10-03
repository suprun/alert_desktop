/**
 * AlertDesktop — GitHub Pages Client Logic
 * - Dynamic OS detection & Smart CTA (Web Setup prioritized for Windows)
 * - Pseudo-desktop screen integration (Taskbar, Topbar, Toast notifications)
 * - Animated Ukraine map alert state simulation
 * - Frosted glass overlay appearance via IntersectionObserver
 * - Dynamic threat icon cycling for the System Tray feature card
 * - GitHub Releases API live integration & fallback links
 * - Dark / Light theme switcher
 */

(() => {
  'use strict';

  const GITHUB_REPO = 'suprun/alert_desktop';
  const FALLBACK_VERSION = 'v1.0.56';
  const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
  const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

  // Статичні fallback-посилання на випадок відсутності зв'язку або ліміту API
  const DEFAULT_DOWNLOADS = {
    winWeb: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-Web-Setup-${FALLBACK_VERSION}.exe`,
    win: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-Setup-${FALLBACK_VERSION}.exe`,
    winX64: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-x64-Setup-${FALLBACK_VERSION}.exe`,
    winArm64: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-arm64-Setup-${FALLBACK_VERSION}.exe`,
    winMsix: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-x64-${FALLBACK_VERSION}.msix`,
    winPortable: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-x64-Portable-${FALLBACK_VERSION}.exe`,
    macDmg: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-universal-${FALLBACK_VERSION}.dmg`,
    macZip: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-universal-${FALLBACK_VERSION}.zip`,
    linuxAppImage: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-x86_64-${FALLBACK_VERSION}.AppImage`,
    linuxDeb: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-amd64-${FALLBACK_VERSION}.deb`,
    linuxSnap: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-amd64-${FALLBACK_VERSION}.snap`,
    linuxFlatpak: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-x86_64-${FALLBACK_VERSION}.flatpak`
  };

  // 1. Визначення операційної системи відвідувача
  function detectOS() {
    const userAgent = (navigator.userAgent || '').toLowerCase();
    const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();

    if (platform.includes('win') || userAgent.includes('windows')) {
      return 'windows';
    }
    if (platform.includes('mac') || userAgent.includes('macintosh') || userAgent.includes('mac os x')) {
      return 'macos';
    }
    if (platform.includes('linux') || userAgent.includes('linux') || userAgent.includes('x11')) {
      return 'linux';
    }
    return 'windows';
  }

  // 2. Застосування теми ОС до псевдо-екрану
  function applyDesktopOS(os) {
    const screen = document.getElementById('desktopScreenMockup');
    if (!screen) return;
    screen.classList.remove('os-windows', 'os-macos', 'os-linux');
    screen.classList.add(`os-${os}`);
  }

  // 3. Оновлення головної кнопки Smart CTA
  function setupSmartCTA(os, links, version) {
    const smartBtn = document.getElementById('smartDownloadBtn');
    const smartBtnText = document.getElementById('smartBtnText');
    const smartBtnMeta = document.getElementById('smartBtnMeta');
    const smartBtnIcon = document.getElementById('smartBtnIcon');

    if (!smartBtn) return;

    let targetUrl = links.winWeb || links.win;
    let label = `Завантажити Web Setup (.exe)`;
    let meta = `Web Setup (${version}) • Легкий мережевий інсталятор`;

    if (os === 'macos') {
      targetUrl = links.macDmg;
      label = `Завантажити для macOS`;
      meta = `Universal DMG (${version}) • Apple Silicon & Intel`;
      if (smartBtnIcon) smartBtnIcon.innerHTML = getAppleIconSvg();
    } else if (os === 'linux') {
      targetUrl = links.linuxAppImage;
      label = `Завантажити для Linux`;
      meta = `AppImage (${version}) • x86_64`;
      if (smartBtnIcon) smartBtnIcon.innerHTML = getLinuxIconSvg();
    } else {
      if (smartBtnIcon) smartBtnIcon.innerHTML = getWindowsIconSvg();
    }

    smartBtn.href = targetUrl;
    if (smartBtnText) smartBtnText.textContent = label;
    if (smartBtnMeta) smartBtnMeta.textContent = meta;

    // Підсвічуємо картку поточної ОС у сітці
    const cards = document.querySelectorAll('.platform-card');
    cards.forEach(card => card.classList.remove('highlight'));
    const currentCard = document.getElementById(`card-${os}`);
    if (currentCard) {
      currentCard.classList.add('highlight');
    }

    // Оновлюємо вигляд псевдо-екрана
    applyDesktopOS(os);
  }

  // 4. Запит до GitHub Releases API
  async function fetchLatestRelease() {
    const releaseVersionBadges = document.querySelectorAll('.release-version-tag');
    let currentLinks = { ...DEFAULT_DOWNLOADS };
    let latestVersion = FALLBACK_VERSION;

    try {
      const response = await fetch(GITHUB_LATEST_API, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.tag_name) {
          latestVersion = data.tag_name;
        }

        if (Array.isArray(data.assets) && data.assets.length > 0) {
          for (const asset of data.assets) {
            const name = (asset.name || '').toLowerCase();
            const url = asset.browser_download_url;

            if (name.includes('web-setup') && name.endsWith('.exe')) {
              currentLinks.winWeb = url;
            } else if (name.includes('x64-setup') && name.endsWith('.exe')) {
              currentLinks.winX64 = url;
            } else if (name.includes('arm64-setup') && name.endsWith('.exe')) {
              currentLinks.winArm64 = url;
            } else if (name.includes('portable') && name.endsWith('.exe')) {
              currentLinks.winPortable = url;
            } else if (name.includes('setup') && name.endsWith('.exe')) {
              currentLinks.win = url;
            } else if (name.endsWith('.msix')) {
              if (name.includes('x64') || !currentLinks.winMsix) {
                currentLinks.winMsix = url;
              }
            } else if (name.endsWith('.snap')) {
              currentLinks.linuxSnap = url;
            } else if (name.endsWith('.flatpak')) {
              currentLinks.linuxFlatpak = url;
            } else if (name.includes('universal') && name.endsWith('.dmg')) {
              currentLinks.macDmg = url;
            } else if (!currentLinks.macDmg && name.endsWith('.dmg')) {
              currentLinks.macDmg = url;
            } else if (name.includes('universal') && name.endsWith('.zip')) {
              currentLinks.macZip = url;
            } else if (!currentLinks.macZip && name.endsWith('.zip')) {
              currentLinks.macZip = url;
            } else if ((name.includes('x86_64') || name.includes('amd64')) && name.endsWith('.appimage')) {
              currentLinks.linuxAppImage = url;
            } else if (!currentLinks.linuxAppImage && name.endsWith('.appimage')) {
              currentLinks.linuxAppImage = url;
            } else if ((name.includes('amd64') || name.includes('x86_64')) && name.endsWith('.deb')) {
              currentLinks.linuxDeb = url;
            } else if (!currentLinks.linuxDeb && name.endsWith('.deb')) {
              currentLinks.linuxDeb = url;
            }
          }
        }
      }
    } catch (err) {
      // При помилці мережі використовуються надійні fallback-посилання
    }

    // Оновлюємо текстові бейджі версії
    releaseVersionBadges.forEach(badge => {
      badge.textContent = latestVersion;
    });

    // Оновлюємо прямі лінки в картках
    updatePlatformLinks(currentLinks);

    // Оновлюємо головну кнопку Smart CTA
    const userOS = detectOS();
    setupSmartCTA(userOS, currentLinks, latestVersion);
  }

  function updatePlatformLinks(links) {
    const setHref = (id, url) => {
      const el = document.getElementById(id);
      if (el && url) el.href = url;
    };

    setHref('link-win-main', links.winWeb || links.win);
    setHref('link-win-x64', links.winX64);
    setHref('link-win-arm64', links.winArm64);
    setHref('link-win-universal', links.win);
    setHref('link-win-msix', links.winMsix);
    setHref('link-win-portable', links.winPortable);
    setHref('link-mac-main', links.macDmg);
    setHref('link-mac-zip', links.macZip);
    setHref('link-linux-main', links.linuxAppImage);
    setHref('link-linux-deb', links.linuxDeb);
    setHref('link-linux-snap', links.linuxSnap);
    setHref('link-linux-flatpak', links.linuxFlatpak);
  }

  // 5. Системні годинники для панелей псевдо-ОС
  function updateDesktopClocks() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const topClock = document.getElementById('topbarClock');
    const taskClock = document.getElementById('taskbarClock');
    if (topClock) topClock.textContent = timeStr;
    if (taskClock) taskClock.textContent = timeStr;
  }

  // 6. Анімований цикл карток сповіщень (Toast Notifications)
  function initDesktopToastLoop() {
    const toast = document.getElementById('desktopToastCard');
    const toastTitle = document.getElementById('toastCardTitle');
    const toastDesc = document.getElementById('toastCardDesc');
    const toastTime = document.getElementById('toastCardTime');
    if (!toast) return;

    const events = [
      {
        title: 'Повітряна тривога: м. Київ',
        desc: 'Загроза застосування балістичного озброєння! Пройдіть в укриття.',
        time: 'щойно'
      },
      {
        title: 'Загроза ударних БпЛА: Київська обл.',
        desc: 'Група «Shahed» наближається з південного сходу.',
        time: 'щойно'
      },
      {
        title: 'Відбій тривоги: м. Київ',
        desc: 'Небезпека минула. Уважно слідкуйте за подальшими оновленнями.',
        time: 'щойно'
      }
    ];

    let currentIdx = 0;
    function showNextToast() {
      const ev = events[currentIdx % events.length];
      if (toastTitle) toastTitle.textContent = ev.title;
      if (toastDesc) toastDesc.textContent = ev.desc;
      if (toastTime) toastTime.textContent = ev.time;

      toast.classList.add('toast-visible');

      // Відображається 4.5 секунди, потім зникає
      setTimeout(() => {
        toast.classList.remove('toast-visible');
      }, 4500);

      currentIdx++;
    }

    // Перший показ через 1.5 секунди після старту, далі кожні 9 секунд
    setTimeout(showNextToast, 1500);
    setInterval(showNextToast, 9000);
  }

  // 7. Динамічна анімована симуляція тривог на мапі України
  function initMapAlertSimulation() {
    const map = document.querySelector('.ukraine-admin-map');
    if (!map) return;

    // Всі доступні області на SVG
    const oblastIds = [
      'donetsk_obl', 'kharkiv_obl', 'zakarpattia_obl', 'kirovohrad_obl',
      'mykolaiv_obl', 'luhansk_obl', 'dnipropetrovsk_obl', 'zaporizha_obl',
      'kherson_obl', 'odesa_obl', 'kyiv_obl', 'lviv_obl', 'poltava_obl',
      'sumy_obl', 'cherkasy_obl', 'vinnytsia_obl', 'zhytomyr_obl', 'chernihiv_obl'
    ];

    function randomizeAlerts() {
      // Знімаємо попередні стани
      map.querySelectorAll('.map-oblast.state-red, .map-oblast.state-yellow').forEach(el => {
        el.classList.remove('state-red', 'state-yellow');
      });

      // Обираємо від 3 до 6 випадкових областей
      const count = 3 + Math.floor(Math.random() * 4);
      const shuffled = [...oblastIds].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);

      selected.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) {
          // Перша область - жовта (БпЛА), інші - червоні (повітряна тривога)
          if (idx === 0) {
            el.classList.add('state-yellow');
          } else {
            el.classList.add('state-red');
          }
        }
      });
    }

    randomizeAlerts();
    setInterval(randomizeAlerts, 4200);
  }

  // 8. Плавна поява плашки мапи (Frosted Glass) при скролі
  function initMapOverlayObserver() {
    const badge = document.getElementById('mapOverlayBadge');
    const mockup = document.querySelector('.app-mockup');
    if (!badge || !mockup) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          // Коли псевдо-вікно повністю або майже повністю у полі зору
          if (entry.intersectionRatio >= 0.65) {
            badge.classList.add('is-visible');
          }
        });
      }, {
        threshold: [0.3, 0.65, 0.9]
      });

      observer.observe(mockup);
    } else {
      // Fallback
      badge.classList.add('is-visible');
    }
  }

  // 9. Динамічний цикл іконок загроз у блоці «Інтеграція в системний трей»
  function initTrayFeatureCycle() {
    const box = document.getElementById('dynamicTrayIconBox');
    const iconSpan = document.getElementById('dynamicTrayIcon');
    if (!box || !iconSpan) return;

    const states = [
      {
        class: 'threat-safe',
        svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>`
      },
      {
        class: 'threat-alert',
        svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>`
      },
      {
        class: 'threat-drone',
        svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 3v18M3 12h18"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>`
      },
      {
        class: 'threat-missile',
        svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m4.5 16.5-1.5 3 3-1.5L17.5 6.5l-3-3z"/>
          <path d="m15 9 3 3"/>
          <path d="m9 15 3 3"/>
        </svg>`
      }
    ];

    let current = 0;
    function applyState(idx) {
      const st = states[idx % states.length];
      box.classList.remove('threat-safe', 'threat-alert', 'threat-drone', 'threat-missile');
      box.classList.add(st.class);
      iconSpan.innerHTML = st.svg;
    }

    applyState(0);
    setInterval(() => {
      current++;
      applyState(current);
    }, 2800);

    // Дозволяємо також перемикати кліком для інтерактивності
    box.addEventListener('click', () => {
      current++;
      applyState(current);
    });
  }

  // 10. Керування темами (Dark / Light)
  function initTheme() {
    const savedTheme = localStorage.getItem('alert_desktop_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    applyTheme(isDark);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentIsDark = document.documentElement.classList.contains('theme-dark') || 
                             !document.documentElement.classList.contains('theme-light');
        applyTheme(!currentIsDark);
      });
    }
  }

  function applyTheme(isDark) {
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');

    if (isDark) {
      htmlEl.classList.remove('theme-light');
      htmlEl.classList.add('theme-dark');
      localStorage.setItem('alert_desktop_theme', 'dark');
      if (themeIcon) themeIcon.innerHTML = getSunIconSvg();
    } else {
      htmlEl.classList.remove('theme-dark');
      htmlEl.classList.add('theme-light');
      localStorage.setItem('alert_desktop_theme', 'light');
      if (themeIcon) themeIcon.innerHTML = getMoonIconSvg();
    }
  }

  // 11. Векторні SVG-іконки
  function getWindowsIconSvg() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display: block; margin: auto;">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>`;
  }

  function getAppleIconSvg() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display: block; margin: auto; transform: translateY(-2px)">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>`;
  }

  function getLinuxIconSvg() {
    return `<svg viewBox="0 0 200 200" width="20" height="20" fill="currentColor" style="display: block; margin: auto;">
      <path d="M 86 9.314 C 84.075 9.924, 80.398 12.521, 77.829 15.084 C 70.519 22.380, 68.812 28.945, 68.235 51.972 L 67.772 70.445 62.052 79.972 C 55.156 91.460, 49.676 104.036, 46.989 114.544 C 44.336 124.918, 44.364 128, 47.114 128 C 50.905 128, 57.099 132.358, 61.343 138.009 C 63.629 141.054, 68.629 148.598, 72.454 154.773 C 76.915 161.974, 80.021 166, 81.115 166 C 83.578 166, 88 160.312, 88 157.146 C 88 153.153, 85.866 150.753, 77.778 145.652 C 67.855 139.393, 64.484 134.512, 64.548 126.500 C 64.614 118.377, 67.810 109.231, 76.298 92.880 L 83.368 79.260 89.620 79.762 C 95.292 80.217, 96.399 79.966, 101.558 77.054 C 104.686 75.289, 107.562 74.217, 107.949 74.672 C 108.337 75.128, 110.696 78.425, 113.192 82 C 121.998 94.612, 127.819 108.580, 130.061 122.478 C 131.092 128.872, 131.550 129.986, 132.895 129.381 C 138.741 126.753, 151.466 128.417, 157.055 132.541 C 158.888 133.893, 161.265 135, 162.335 135 C 164.152 135, 164.244 134.451, 163.719 126.750 C 162.767 112.784, 157.042 99.203, 144.393 80.910 C 134.079 65.992, 133.814 65.275, 128.018 36.515 C 124.518 19.150, 120.009 12.914, 108.438 9.431 C 102.919 7.770, 91.065 7.708, 86 9.314 M 80.269 34.250 C 77.242 37.526, 75.619 43.975, 76.442 49.460 C 77.255 54.882, 79.204 55.111, 80.054 49.884 C 81.068 43.647, 83.504 42.230, 86.732 46 C 89.132 48.803, 92 48.612, 92 45.649 C 92 39.783, 87.438 32, 84 32 C 83.092 32, 81.413 33.013, 80.269 34.250 M 100.313 34.250 C 97.920 36.894, 96 42.160, 96 46.076 C 96 49.981, 99.114 50.445, 100.702 46.776 C 102.932 41.624, 108 44.124, 108 50.375 C 108 52.821, 109.582 54.751, 110.684 53.650 C 111.947 52.387, 112.143 43.956, 110.994 40.369 C 109.539 35.831, 106.338 32, 104 32 C 103.092 32, 101.433 33.013, 100.313 34.250 M 86.500 57.861 C 84.850 58.880, 82.648 60.672, 81.607 61.844 C 79.726 63.960, 79.742 64, 84.107 67.946 C 89.740 73.039, 92.581 73.078, 100.996 68.179 C 107.050 64.654, 109.977 61, 106.746 61 C 105.975 61, 102.576 59.875, 99.192 58.500 C 91.841 55.513, 90.417 55.441, 86.500 57.861 M 38.684 141.994 C 33.434 147.146, 31.912 148.075, 27.832 148.617 C 25.080 148.982, 22.361 150.048, 21.358 151.157 C 19.729 152.957, 19.726 153.339, 21.315 157.784 C 23.630 164.264, 23.697 167.011, 21.643 171.339 C 18.321 178.339, 20.795 180.711, 34.783 183.935 C 39.889 185.112, 47.683 187.408, 52.102 189.037 C 64.491 193.605, 71.442 192.804, 74.452 186.460 C 77.655 179.710, 76.751 176.667, 66.750 160.551 C 57.179 145.127, 49.680 136, 46.579 136 C 45.595 136, 42.042 138.697, 38.684 141.994 M 136.092 136.922 C 134.899 137.677, 134.954 138.400, 136.452 141.657 C 138.709 146.561, 140.575 148, 144.675 148 C 149.236 148, 154.993 142.927, 153.404 140.307 C 151.342 136.907, 139.708 134.633, 136.092 136.922 M 128 153.810 C 128 159.470, 127.246 165.603, 125.889 170.966 C 123.276 181.302, 123.754 186.531, 127.616 189.854 C 129.997 191.901, 131.164 192.159, 136.519 191.818 C 142.165 191.458, 143.219 190.999, 149.091 186.335 C 152.616 183.535, 159.100 179.094, 163.500 176.466 C 178.053 167.772, 178.883 165.905, 170.561 160.582 C 165.193 157.149, 163.024 153.464, 163.006 147.750 C 162.997 145.182, 162.208 145.532, 156.983 150.419 C 151.538 155.513, 145.535 157.076, 138.974 155.110 C 135.090 153.947, 130 149.019, 130 146.423 C 130 145.640, 129.550 145, 129 145 C 128.409 145, 128 148.603, 128 153.810 M 112.071 173.227 C 104.721 176.981, 95.850 177.075, 88.131 173.481 L 82.762 170.982 83.367 173.241 C 83.700 174.483, 83.979 177.412, 83.986 179.750 L 84 184 100 184 L 116 184 116 180.065 C 116 177.901, 116.463 174.913, 117.028 173.426 C 117.593 171.939, 117.931 170.662, 117.778 170.588 C 117.625 170.515, 115.057 171.702, 112.071 173.227" stroke="none" fill="currentColor" fill-rule="evenodd"/>
    </svg>`;
  }

  function getSunIconSvg() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;
  }

  function getMoonIconSvg() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>`;
  }

  // 12. Ініціалізація компонентів при завантаженні DOM
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchLatestRelease();
    updateDesktopClocks();
    setInterval(updateDesktopClocks, 10000);
    initDesktopToastLoop();
    initMapAlertSimulation();
    initMapOverlayObserver();
    initTrayFeatureCycle();
  });
})();
