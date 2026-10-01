/**
 * AlertDesktop — GitHub Pages Client Logic
 * - Dynamic OS detection & Smart CTA
 * - GitHub Releases API live integration
 * - Dark / Light theme switcher
 */

(() => {
  'use strict';

  const GITHUB_REPO = 'suprun/alert_desktop';
  const FALLBACK_VERSION = 'v1.0.46';
  const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
  const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

  // Статичні fallback-посилання на випадок відсутності зв'язку або ліміту API
  const DEFAULT_DOWNLOADS = {
    win: `${GITHUB_RELEASES_URL}/latest/download/AlertDesktop-Setup-${FALLBACK_VERSION}.exe`,
    winX64: `${GITHUB_RELEASES_URL}/latest/download/AlertDesktop-x64-Setup-${FALLBACK_VERSION}.exe`,
    winArm64: `${GITHUB_RELEASES_URL}/latest/download/AlertDesktop-arm64-Setup-${FALLBACK_VERSION}.exe`,
    winWeb: `${GITHUB_RELEASES_URL}/latest/download/AlertDesktop-Web-Setup-${FALLBACK_VERSION}.exe`,
    winZip: `${GITHUB_RELEASES_URL}/latest/download/AlertDesktop-${FALLBACK_VERSION}-win-portable.zip`,
    macDmg: `${GITHUB_RELEASES_URL}/latest/download/AlertDesktop-${FALLBACK_VERSION.replace('v', '')}-mac.dmg`,
    macZip: `${GITHUB_RELEASES_URL}/latest/download/AlertDesktop-${FALLBACK_VERSION.replace('v', '')}-mac.zip`,
    linuxAppImage: `${GITHUB_RELEASES_URL}/latest/download/AlertDesktop-${FALLBACK_VERSION.replace('v', '')}.AppImage`,
    linuxDeb: `${GITHUB_RELEASES_URL}/latest/download/alert-desktop_${FALLBACK_VERSION.replace('v', '')}_amd64.deb`
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

  // 2. Оновлення головної кнопки Smart CTA
  function setupSmartCTA(os, links, version) {
    const smartBtn = document.getElementById('smartDownloadBtn');
    const smartBtnText = document.getElementById('smartBtnText');
    const smartBtnMeta = document.getElementById('smartBtnMeta');
    const smartBtnIcon = document.getElementById('smartBtnIcon');

    if (!smartBtn) return;

    let targetUrl = links.win;
    let label = `Завантажити для Windows`;
    let meta = `Setup .exe (${version}) • x64 & ARM64`;

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
  }

  // 3. Запит до GitHub Releases API
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
          // Шукаємо прямі URL активів
          for (const asset of data.assets) {
            const name = (asset.name || '').toLowerCase();
            const url = asset.browser_download_url;

            if (name.endsWith('-setup.exe') || name.includes('alertdesktop-setup')) {
              currentLinks.win = url;
            } else if (name.includes('x64-setup') && name.endsWith('.exe')) {
              currentLinks.winX64 = url;
            } else if (name.includes('arm64-setup') && name.endsWith('.exe')) {
              currentLinks.winArm64 = url;
            } else if (name.includes('web-setup') && name.endsWith('.exe')) {
              currentLinks.winWeb = url;
            } else if (name.endsWith('.dmg')) {
              currentLinks.macDmg = url;
            } else if (name.endsWith('-mac.zip')) {
              currentLinks.macZip = url;
            } else if (name.endsWith('.appimage')) {
              currentLinks.linuxAppImage = url;
            } else if (name.endsWith('.deb')) {
              currentLinks.linuxDeb = url;
            }
          }
        }
      }
    } catch (err) {
      // При помилці або обмеженні запитів використовуються надійні fallback-посилання
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

    setHref('link-win-main', links.win);
    setHref('link-win-x64', links.winX64);
    setHref('link-win-arm64', links.winArm64);
    setHref('link-win-web', links.winWeb);
    setHref('link-mac-main', links.macDmg);
    setHref('link-mac-zip', links.macZip);
    setHref('link-linux-main', links.linuxAppImage);
    setHref('link-linux-deb', links.linuxDeb);
  }

  // 4. Керування темами (Dark / Light)
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

  // 5. Векторні SVG-іконки
  function getWindowsIconSvg() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>`;
  }

  function getAppleIconSvg() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.94-.92.04-2.02.61-2.67 1.38-.57.66-1.07 1.74-.94 2.8 1.03.08 2.05-.47 2.67-1.24"/>
    </svg>`;
  }

  function getLinuxIconSvg() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>`;
  }

  function getSunIconSvg() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>`;
  }

  // 6. Ініціалізація при завантаженні DOM
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchLatestRelease();
  });
})();
