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
  const FALLBACK_VERSION = 'v1.0.57';
  const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
  const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  const STORE_URLS = {
    microsoft: 'https://apps.microsoft.com/search?query=AlertDesktop',
    snap: 'https://snapcraft.io/alert-desktop',
    flathub: 'https://flathub.org/apps/ua.in.alerts.desktop'
  };

  // Статичні fallback-посилання на випадок відсутності зв'язку або ліміту API
  const DEFAULT_DOWNLOADS = {
    winWeb: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-Web-Setup-${FALLBACK_VERSION}.exe`,
    win: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-Setup-${FALLBACK_VERSION}.exe`,
    winX64: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-x64-Setup-${FALLBACK_VERSION}.exe`,
    winArm64: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-arm64-Setup-${FALLBACK_VERSION}.exe`,
    winPortable: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-x64-Portable-${FALLBACK_VERSION}.exe`,
    macDmg: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-universal-${FALLBACK_VERSION}.dmg`,
    macZip: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-universal-${FALLBACK_VERSION}.zip`,
    linuxAppImage: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-x86_64-${FALLBACK_VERSION}.AppImage`,
    linuxDeb: `${GITHUB_RELEASES_URL}/download/${FALLBACK_VERSION}/AlertDesktop-amd64-${FALLBACK_VERSION}.deb`
  };
  let previewDownloads = { ...DEFAULT_DOWNLOADS };
  let previewVersion = FALLBACK_VERSION;

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

  function setSiteIcon(element, iconName, size) {
    if (!element) return;
    element.className = `site-icon icon-${iconName} icon-size-${size}`;
    element.setAttribute('aria-hidden', 'true');
  }

  function setExternalLink(element, isExternal) {
    if (!element) return;
    if (isExternal) {
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
      return;
    }
    element.removeAttribute('target');
    element.removeAttribute('rel');
  }

  // 3. Оновлення головних кнопок Smart CTA
  function setupSmartCTA(os, links, version) {
    const smartBtn = document.getElementById('smartDownloadBtn');
    const smartBtnText = document.getElementById('smartBtnText');
    const smartBtnMeta = document.getElementById('smartBtnMeta');
    const smartBtnIcon = document.getElementById('smartBtnIcon');
    const smartStoreBtn = document.getElementById('smartStoreBtn');
    const smartStoreBtnText = document.getElementById('smartStoreBtnText');
    const smartStoreBtnIcon = document.getElementById('smartStoreBtnIcon');

    if (!smartBtn) return;

    let targetUrl = links.winWeb || links.win;
    let label = `Завантажити Web Setup (.exe)`;
    let meta = `Web Setup (${version}) • Легкий мережевий інсталятор`;
    let isPrimaryExternal = false;

    if (smartStoreBtn) {
      smartStoreBtn.hidden = false;
      smartStoreBtn.href = STORE_URLS.microsoft;
      setExternalLink(smartStoreBtn, true);
    }
    if (smartStoreBtnText) smartStoreBtnText.textContent = 'Завантажити з Microsoft Store';
    setSiteIcon(smartStoreBtnIcon, 'microsoft-store', 22);

    if (os === 'macos') {
      targetUrl = links.macDmg;
      label = `Завантажити для macOS`;
      meta = `Universal DMG (${version}) • Apple Silicon & Intel`;
      setSiteIcon(smartBtnIcon, 'apple', 20);
      if (smartStoreBtn) smartStoreBtn.hidden = true;
    } else if (os === 'linux') {
      targetUrl = STORE_URLS.snap;
      label = `Завантажити зі Snap Store`;
      meta = `Snap Store • Flathub • Linux`;
      isPrimaryExternal = true;
      setSiteIcon(smartBtnIcon, 'snap-store', 20);
      if (smartStoreBtn) smartStoreBtn.href = STORE_URLS.flathub;
      if (smartStoreBtnText) smartStoreBtnText.textContent = 'Завантажити з Flathub';
      setSiteIcon(smartStoreBtnIcon, 'flathub', 20);
    } else {
      setSiteIcon(smartBtnIcon, 'windows', 20);
    }

    smartBtn.href = targetUrl;
    setExternalLink(smartBtn, isPrimaryExternal);
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

  function previewOS(os) {
    if (!['windows', 'macos', 'linux'].includes(os)) return false;
    setupSmartCTA(os, previewDownloads, previewVersion);
    return true;
  }

  window.previewOS = previewOS;

  function revealReleaseVersion() {
    document.querySelectorAll('.version-pending').forEach(element => {
      element.classList.remove('version-pending');
    });
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

    previewDownloads = currentLinks;
    previewVersion = latestVersion;

    // Оновлюємо головні кнопки Smart CTA
    const userOS = detectOS();
    setupSmartCTA(userOS, currentLinks, latestVersion);
    revealReleaseVersion();
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
    setHref('link-win-portable', links.winPortable);
    setHref('link-mac-main', links.macDmg);
    setHref('link-mac-zip', links.macZip);
    setHref('link-linux-main', links.linuxAppImage);
    setHref('link-linux-deb', links.linuxDeb);
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
        icon: 'shield-check'
      },
      {
        class: 'threat-alert',
        icon: 'bell'
      },
      {
        class: 'threat-drone',
        icon: 'drone'
      },
      {
        class: 'threat-missile',
        icon: 'missile'
      }
    ];

    let current = 0;
    function applyState(idx) {
      const st = states[idx % states.length];
      box.classList.remove('threat-safe', 'threat-alert', 'threat-drone', 'threat-missile');
      box.classList.add(st.class);
      setSiteIcon(iconSpan, st.icon, 22);
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
      setSiteIcon(themeIcon, 'sun', 18);
    } else {
      htmlEl.classList.remove('theme-dark');
      htmlEl.classList.add('theme-light');
      localStorage.setItem('alert_desktop_theme', 'light');
      setSiteIcon(themeIcon, 'moon', 18);
    }
  }

  // 11. Ініціалізація компонентів при завантаженні DOM
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupSmartCTA(detectOS(), DEFAULT_DOWNLOADS, FALLBACK_VERSION);
    fetchLatestRelease();
    updateDesktopClocks();
    setInterval(updateDesktopClocks, 10000);
    initDesktopToastLoop();
    initMapAlertSimulation();
    initMapOverlayObserver();
    initTrayFeatureCycle();
  });
})();
