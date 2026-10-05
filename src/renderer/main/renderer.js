const appHeader = document.getElementById('appHeader');
const statusBadge = document.getElementById('statusBadge');
const statusIcon = document.getElementById('statusIcon');
const statusLocation = document.getElementById('statusLocation');
const statusText = document.getElementById('statusText');
const connectionStatus = document.getElementById('connectionStatus');
const fastTooltipText = document.getElementById('fastTooltipText');
const btnSettings = document.getElementById('btnSettings');
const mapProgressBar = document.getElementById('mapProgressBar');
const mapPlaceholder = document.getElementById('mapPlaceholder');
const mapLoadingState = document.getElementById('mapLoadingState');
const mapErrorState = document.getElementById('mapErrorState');
const mapErrorDescription = document.getElementById('mapErrorDescription');
const btnRetryMap = document.getElementById('btnRetryMap');
const audioPlayer = document.getElementById('audioPlayer');

// Елементи вбудованої векторної карти
const internalMapContainer = document.getElementById('internalMapContainer');
const internalAlertsSummary = document.getElementById('internalAlertsSummary');
const btnThemeToggle = document.getElementById('btnThemeToggle');
const ukraineMapWrapper = document.getElementById('ukraineMapWrapper');
const ukraineVectorSvg = document.getElementById('ukraineVectorSvg');
const svgDefs = document.getElementById('svgDefs');
const districtsLayer = document.getElementById('districtsLayer');
const oblastBordersLayer = document.getElementById('oblastBordersLayer');
const mapRegionTooltip = document.getElementById('mapRegionTooltip');
const tooltipRegionTitle = document.getElementById('tooltipRegionTitle');
const tooltipOblastTitle = document.getElementById('tooltipOblastTitle');
const tooltipStatusBadge = document.getElementById('tooltipStatusBadge');
const tooltipStatusIcon = document.getElementById('tooltipStatusIcon');
const tooltipStatusText = document.getElementById('tooltipStatusText');
const tooltipHromadasList = document.getElementById('tooltipHromadasList');
const tooltipTimeStarted = document.getElementById('tooltipTimeStarted');

// Елементи висувної панелі деталей та історії адмінодиниці
const regionHistoryDrawer = document.getElementById('regionHistoryDrawer');
const historyRegionTitle = document.getElementById('historyRegionTitle');
const historyOblastTitle = document.getElementById('historyOblastTitle');
const btnHistoryClose = document.getElementById('btnHistoryClose');
const historyDrawerBody = document.getElementById('historyDrawerBody');

// Елементи панелі вкладок
const tabButtons = document.querySelectorAll('.tab-btn');
const tabInternalAlertBadge = document.getElementById('tabInternalAlertBadge');

// Поточний стан
let currentActiveTab = 'internal';
let currentThemeIsDark = true;
let allLocationsCache = [];
let hromadaToRaionMap = new Map();
let currentAlertsList = [];

// Лінійні SVG іконки статусів (виключно векторні без емодзі)
const icons = {
  safe: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>`,
  alert: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 18v-6a5 5 0 1 1 10 0v6"/>
      <path d="M5 21h14"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="m4.9 4.9 1.4 1.4"/>
      <path d="m17.7 6.3 1.4-1.4"/>
      <line x1="12" y1="2" x2="12" y2="4"/>
    </svg>`,
  artillery: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`,
  yellow: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`,
  offline: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>`
};

// Лінійні SVG піктограми типів загроз (Threat Icons)
const threatIcons = {
  drone: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 8v8M8 12h8"/>
      <circle cx="12" cy="12" r="2"/>
      <circle cx="5" cy="5" r="2"/>
      <circle cx="19" cy="5" r="2"/>
      <circle cx="5" cy="19" r="2"/>
      <circle cx="19" cy="19" r="2"/>
      <line x1="6.5" y1="6.5" x2="10.5" y2="10.5"/>
      <line x1="17.5" y1="6.5" x2="13.5" y2="10.5"/>
      <line x1="6.5" y1="17.5" x2="10.5" y2="13.5"/>
      <line x1="17.5" y1="17.5" x2="13.5" y2="13.5"/>
    </svg>`,
  missile: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>`,
  ballistic: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 20C8 10 14 4 20 4"/>
      <polyline points="15 4 20 4 20 9"/>
      <line x1="19" y1="5" x2="13" y2="11"/>
      <circle cx="4" cy="20" r="1.5"/>
    </svg>`,
  aviation: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.5.1-1.8.8l-.5 1 5 3.5-3.5 3.5-2-.5c-.5-.1-1 .1-1.2.6l-.3.7 2.5 1.5 1.5 2.5.7-.3c.5-.2.7-.7.6-1.2l-.5-2 3.5-3.5 3.5 5 1-.5c.7-.3 1-1 .8-1.8z"/>
    </svg>`,
  artillery: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="3" x2="12" y2="7"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="7" y2="12"/>
      <line x1="17" y1="12" x2="21" y2="12"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>`,
  general: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
  chemical: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 2v7.31L4.15 19.1A2 2 0 0 0 6 22h12a2 2 0 0 0 1.85-2.9L14 9.31V2"/>
      <line x1="8.5" y1="2" x2="15.5" y2="2"/>
    </svg>`,
  nuclear: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M12 2a10 10 0 0 1 8.66 5l-4.33 2.5A5 5 0 0 0 12 7V2z"/>
      <path d="M22 17a10 10 0 0 1-10 5v-5a5 5 0 0 0 4.33-2.5L22 17z"/>
      <path d="M2 17l5.67-2.5A5 5 0 0 0 12 17v5a10 10 0 0 1-10-5z"/>
    </svg>`
};

function applyTheme(isDark) {
  currentThemeIsDark = Boolean(isDark);
  if (currentThemeIsDark) {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('theme-dark');
  } else {
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.classList.add('theme-light');
  }
}

function getProviderDisplayName(key) {
  const map = {
    gateway: 'Шлюз',
    alertsinua: 'Alerts.in.ua',
    ukrainealarm: 'UkraineAlarm',
    neptun: 'NEPTUN',
    ubilling: 'Ubilling',
    jaam: 'JAAM'
  };
  return map[key] || (key ? key.toUpperCase() : 'Резерв');
}

// ==========================================================================
// 1. ІНІЦІАЛІЗАЦІЯ ВЕКТОРНОЇ КАРТИ УКРАЇНИ
// ==========================================================================
function initVectorMap() {
  if (typeof MAP_REGIONS === 'undefined' || !districtsLayer) return;

  // Додавання маски (для Харкова)
  if (svgDefs && typeof MAP_MASK_KHARKIV !== 'undefined') {
    svgDefs.innerHTML = MAP_MASK_KHARKIV;
  }

  // Очищення шарів
  districtsLayer.innerHTML = '';
  if (oblastBordersLayer) oblastBordersLayer.innerHTML = '';

  // Створення елементів районів
  const fragment = document.createDocumentFragment();
  for (const reg of MAP_REGIONS) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', 'map-district safe');
    p.setAttribute('id', `dist-${reg.uid}`);
    p.setAttribute('data-uid', reg.uid);
    p.setAttribute('data-title', reg.title);
    p.setAttribute('data-oblast-uid', reg.oblastUid || '');
    p.setAttribute('data-oblast-title', reg.oblastTitle || '');
    p.setAttribute('d', reg.d);
    if (reg.mask) {
      p.setAttribute('mask', `url(#${reg.mask})`);
    }

    // Слухачі для тултіпа
    p.addEventListener('mouseenter', onDistrictMouseEnter);
    p.addEventListener('mousemove', onDistrictMouseMove);
    p.addEventListener('mouseleave', onDistrictMouseLeave);
    p.addEventListener('click', onDistrictClick);

    fragment.appendChild(p);
  }
  districtsLayer.appendChild(fragment);

  // Створення меж областей (Overlay)
  if (oblastBordersLayer && typeof MAP_OBLAST_BORDERS !== 'undefined') {
    const obFragment = document.createDocumentFragment();
    for (const ob of MAP_OBLAST_BORDERS) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('class', 'oblast-border');
      p.setAttribute('d', ob.d);
      if (ob.mask) {
        p.setAttribute('mask', `url(#${ob.mask})`);
      }
      obFragment.appendChild(p);
    }
    oblastBordersLayer.appendChild(obFragment);
  }
}

// Обробка спливаючої підказки (Tooltip)
function onDistrictMouseEnter(e) {
  showDistrictTooltip(e.currentTarget, e);
}

function onDistrictMouseMove(e) {
  positionTooltip(e);
}

function onDistrictMouseLeave() {
  if (mapRegionTooltip) {
    mapRegionTooltip.style.display = 'none';
  }
}

function onDistrictClick(e) {
  e.stopPropagation();
  const el = e.currentTarget;
  if (!el) return;

  const uid = el.getAttribute('data-uid');
  const title = el.getAttribute('data-title') || 'Адмінодиниця';
  const oblastUid = el.getAttribute('data-oblast-uid') || '';
  const oblastTitle = el.getAttribute('data-oblast-title') || '';
  const alertType = el.getAttribute('data-alert-type') || '';
  const alertLevel = el.getAttribute('data-alert-level') || '';
  const startedAt = el.getAttribute('data-started-at') || '';
  const isAlert = el.classList.contains('alert') || el.classList.contains('yellow') || el.classList.contains('artillery');

  // Виділення району на карті
  if (districtsLayer) {
    districtsLayer.querySelectorAll('.map-district.selected').forEach(p => p.classList.remove('selected'));
  }
  el.classList.add('selected');

  // Приховуємо спливаючий тултіп, щоб не перекривав
  if (mapRegionTooltip) {
    mapRegionTooltip.style.display = 'none';
  }

  // Відкриття панелі історії
  if (regionHistoryDrawer) {
    regionHistoryDrawer.classList.add('open');
    regionHistoryDrawer.setAttribute('aria-hidden', 'false');
  }
  if (historyRegionTitle) historyRegionTitle.textContent = title;
  if (historyOblastTitle) historyOblastTitle.textContent = oblastTitle ? `${oblastTitle}` : '';

  if (historyDrawerBody) {
    historyDrawerBody.innerHTML = `
      <div class="drawer-loading">
        <div class="drawer-spinner"></div>
        <span>Завантаження історії...</span>
      </div>
    `;
  }

  // Запит історії через IPC (Gateway -> Fallback)
  if (window.alertAPI && window.alertAPI.getRegionHistory) {
    window.alertAPI.getRegionHistory({ regionUid: uid, oblastUid })
      .then((data) => {
        renderRegionHistory(data, { uid, title, oblastTitle, isAlert, alertType, alertLevel, startedAt });
      })
      .catch((err) => {
        if (historyDrawerBody) {
          historyDrawerBody.innerHTML = `<div class="drawer-loading"><span>Помилка завантаження історії (${escapeHtml(err.message)})</span></div>`;
        }
      });
  }
}

function closeHistoryDrawer() {
  if (regionHistoryDrawer) {
    regionHistoryDrawer.classList.remove('open');
    regionHistoryDrawer.setAttribute('aria-hidden', 'true');
  }
  if (districtsLayer) {
    districtsLayer.querySelectorAll('.map-district.selected').forEach(p => p.classList.remove('selected'));
  }
}

function renderRegionHistory(data, meta) {
  if (!historyDrawerBody) return;

  const { isAlert, alertType, alertLevel, startedAt } = meta;

  // 1. Поточний статус безпеки
  let statusCardClass = 'safe';
  let statusTitle = 'Немає тривоги';
  let statusSubtitle = 'Наразі загрози не зафіксовано';

  if (isAlert) {
    if (alertType === 'artillery_shelling') {
      statusCardClass = 'artillery';
      statusTitle = 'Загроза артобстрілу';
    } else if (alertLevel === 'yellow') {
      statusCardClass = 'yellow';
      statusTitle = 'Дронова загроза';
    } else {
      statusCardClass = 'alert';
      statusTitle = 'Повітряна тривога';
    }
    if (startedAt) {
      const timeStr = new Date(startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      statusSubtitle = `Триває з ${timeStr}`;
    } else {
      statusSubtitle = 'Активна тривога';
    }
  }

  const statusCardHtml = `
    <div class="history-status-card ${statusCardClass}">
      <span class="status-icon">${icons[statusCardClass] || icons.safe}</span>
      <div class="history-status-info">
        <span class="history-status-title">${statusTitle}</span>
        <span class="history-status-subtitle">${statusSubtitle}</span>
      </div>
    </div>
  `;

  // 2. Статистика за сьогодні
  const todayStats = data && (data.todayStats || data.today_stats);
  const count = todayStats ? (todayStats.alertCount ?? todayStats.alert_count ?? 0) : 0;
  const durationText = todayStats ? (todayStats.durationFormatted || todayStats.duration_formatted || `${todayStats.totalDurationMin || todayStats.total_duration_min || 0} хв`) : '0 хв';

  const statsCardHtml = `
    <div class="history-stats-card">
      <span class="history-stats-heading">Сьогодні</span>
      <span class="history-stats-values">${count} ${count === 1 ? 'тривога' : (count >= 2 && count <= 4 ? 'тривоги' : 'тривог')} · ${durationText}</span>
    </div>
  `;

  // 3. Недавні тривоги
  const alertsList = (data && (data.recentAlerts || data.recent_alerts)) || [];
  let timelineItemsHtml = '';

  if (alertsList.length > 0) {
    timelineItemsHtml = alertsList.map(a => {
      const threatLabel = a.threatLabel || a.threat_label || 'Повітряна тривога';
      let threatClass = 'alert';
      let icon = icons.alert;

      const tType = a.threatType || a.threat_type;
      if (tType === 2 || String(tType).includes('artillery')) {
        threatClass = 'artillery';
        icon = threatIcons.artillery;
      } else if (tType === 4 || String(tType).includes('drone')) {
        threatClass = 'yellow';
        icon = threatIcons.drone;
      } else if (tType === 3 || String(tType).includes('missile')) {
        icon = threatIcons.missile;
      } else if (tType === 5 || String(tType).includes('aviation')) {
        icon = threatIcons.aviation;
      }

      const startedStr = a.startedText || a.started_text || (a.startedAt ? new Date(a.startedAt * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '');
      const finishedStr = a.finishedText || a.finished_text || (a.finishedAt ? new Date(a.finishedAt * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : (a.isActive ? 'Триває' : ''));
      const timeRange = finishedStr ? `${startedStr} — ${finishedStr}` : startedStr;
      const durationStr = a.durationText || a.duration_text || (a.durationMin ? `${a.durationMin} хв` : '');
      const msgHtml = a.message ? `<div class="history-item-msg">${escapeHtml(a.message)}</div>` : '';

      return `
        <div class="history-item">
          <div class="history-item-header">
            <span class="history-item-threat ${threatClass}">
              ${icon}
              <span>${escapeHtml(threatLabel)}</span>
            </span>
            ${durationStr ? `<span class="history-item-duration">${durationStr}</span>` : ''}
          </div>
          <div class="history-item-times">${timeRange}</div>
          ${msgHtml}
        </div>
      `;
    }).join('');
  } else {
    timelineItemsHtml = `<div class="drawer-loading"><span>Немає зафіксованих недавніх тривог</span></div>`;
  }

  const timelineSectionHtml = `
    <div class="history-timeline-section">
      <h4 class="history-section-title">Останні тривоги</h4>
      <div class="history-timeline-list">
        ${timelineItemsHtml}
      </div>
    </div>
  `;

  historyDrawerBody.innerHTML = statusCardHtml + statsCardHtml + timelineSectionHtml;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showDistrictTooltip(targetEl, e) {
  if (!mapRegionTooltip) return;

  const title = targetEl.getAttribute('data-title') || 'Район';
  const oblast = targetEl.getAttribute('data-oblast-title') || '';
  const alertType = targetEl.getAttribute('data-alert-type') || '';
  const alertLevel = targetEl.getAttribute('data-alert-level') || '';
  const startedAt = targetEl.getAttribute('data-started-at') || '';
  const hromadasStr = targetEl.getAttribute('data-active-hromadas') || '';

  tooltipRegionTitle.textContent = title;
  tooltipOblastTitle.textContent = oblast ? `${oblast}` : '';

  tooltipStatusBadge.className = 'tooltip-status-badge';

  if (targetEl.classList.contains('alert') || targetEl.classList.contains('yellow') || targetEl.classList.contains('artillery')) {
    if (targetEl.classList.contains('artillery')) {
      tooltipStatusBadge.classList.add('artillery');
      tooltipStatusIcon.innerHTML = threatIcons.artillery;
      tooltipStatusText.textContent = 'Загроза артобстрілу';
    } else if (targetEl.classList.contains('yellow') || alertLevel === 'yellow') {
      tooltipStatusBadge.classList.add('yellow');
      tooltipStatusIcon.innerHTML = threatIcons.drone;
      tooltipStatusText.textContent = 'Дронова загроза';
    } else {
      tooltipStatusBadge.classList.add('alert');
      tooltipStatusIcon.innerHTML = icons.alert;
      tooltipStatusText.textContent = 'Повітряна тривога';
    }

    // Якщо тривога лише в окремих громадах
    if (hromadasStr) {
      try {
        const hromadas = JSON.parse(hromadasStr);
        if (hromadas.length > 0) {
          tooltipHromadasList.style.display = 'block';
          tooltipHromadasList.textContent = `Тривога в громадах: ${hromadas.join(', ')}`;
        } else {
          tooltipHromadasList.style.display = 'none';
        }
      } catch (err) {
        tooltipHromadasList.style.display = 'none';
      }
    } else {
      tooltipHromadasList.style.display = 'none';
    }

    if (startedAt) {
      const timeStr = new Date(startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      tooltipTimeStarted.textContent = `Початок: ${timeStr}`;
      tooltipTimeStarted.style.display = 'block';
    } else {
      tooltipTimeStarted.style.display = 'none';
    }
  } else {
    tooltipStatusBadge.classList.add('safe');
    tooltipStatusIcon.innerHTML = icons.safe;
    tooltipStatusText.textContent = 'Немає тривоги';
    tooltipHromadasList.style.display = 'none';
    tooltipTimeStarted.style.display = 'none';
  }

  mapRegionTooltip.style.display = 'block';
  positionTooltip(e);
}

function positionTooltip(e) {
  if (!mapRegionTooltip || !internalMapContainer) return;

  const containerRect = internalMapContainer.getBoundingClientRect();
  const x = e.clientX - containerRect.left;
  const y = e.clientY - containerRect.top;

  mapRegionTooltip.style.left = `${x}px`;
  mapRegionTooltip.style.top = `${y}px`;
}

// ==========================================================================
// 2. ДИНАМІЧНЕ ЗАБАРВЛЕННЯ ВЕКТОРНОЇ КАРТИ ТРИВОГ (ОБЛАСТІ, РАЙОНИ, ГРОМАДИ)
// ==========================================================================
function applyAlertsToVectorMap(alerts) {
  currentAlertsList = Array.isArray(alerts) ? alerts : [];
  if (!districtsLayer) return;

  const allDistrictPaths = districtsLayer.querySelectorAll('.map-district');

  // 1. Очищення попереднього стану
  allDistrictPaths.forEach(p => {
    p.classList.remove('alert', 'yellow', 'artillery');
    p.classList.add('safe');
    p.removeAttribute('data-alert-type');
    p.removeAttribute('data-alert-level');
    p.removeAttribute('data-started-at');
    p.removeAttribute('data-active-hromadas');
  });

  // Карта для збору громад по районах: raionUid -> string[]
  const hromadasByRaion = new Map();
  // Множина активних районів для підрахунку
  const activeRaionUids = new Set();
  const activeOblastUids = new Set();

  for (const a of currentAlertsList) {
    const locUid = String(a.location_uid || a.uid || '');
    const locTitle = (a.location_title || a.title || '').toLowerCase().trim();
    const locOblast = (a.location_oblast || '').toLowerCase().trim();
    const locType = (a.location_type || '').toLowerCase();
    const alertLevel = a.alert_level || 'red';
    const alertType = a.alert_type || 'air_raid';
    const startedAt = a.started_at || a.startedAt || '';

    // А) Обласна тривога (state / oblast): поширюється на всі райони області
    if (locType === 'state' || locType === 'oblast' || (!locType && !a.location_raion)) {
      allDistrictPaths.forEach(p => {
        const obUid = p.getAttribute('data-oblast-uid');
        const obTitle = (p.getAttribute('data-oblast-title') || '').toLowerCase().trim();
        const distUid = p.getAttribute('data-uid');

        if (obUid === locUid || distUid === locUid || (locOblast && obTitle.includes(locOblast)) || (locTitle && obTitle.includes(locTitle))) {
          p.classList.remove('safe');
          if (alertType === 'artillery_shelling') p.classList.add('artillery');
          else if (alertLevel === 'yellow') p.classList.add('yellow');
          else p.classList.add('alert');

          p.setAttribute('data-alert-type', alertType);
          p.setAttribute('data-alert-level', alertLevel);
          p.setAttribute('data-started-at', startedAt);
          activeRaionUids.add(distUid);
          activeOblastUids.add(obUid || locUid);
        }
      });
      continue;
    }

    // Б) Районна тривога (district / raion): забарвлює конкретний район
    if (locType === 'district' || locType === 'raion') {
      allDistrictPaths.forEach(p => {
        const distUid = p.getAttribute('data-uid');
        const distTitle = (p.getAttribute('data-title') || '').toLowerCase().trim();

        if (distUid === locUid || (locTitle && distTitle.includes(locTitle))) {
          p.classList.remove('safe');
          if (alertType === 'artillery_shelling') p.classList.add('artillery');
          else if (alertLevel === 'yellow') p.classList.add('yellow');
          else p.classList.add('alert');

          p.setAttribute('data-alert-type', alertType);
          p.setAttribute('data-alert-level', alertLevel);
          p.setAttribute('data-started-at', startedAt);
          activeRaionUids.add(distUid);
          activeOblastUids.add(p.getAttribute('data-oblast-uid') || '');
        }
      });
      continue;
    }

    // В) Тривога в окремій громаді (hromada): знаходить батьківський район
    let targetRaionUid = null;
    let targetOblastUid = null;

    if (hromadaToRaionMap.has(locUid)) {
      const locInfo = hromadaToRaionMap.get(locUid);
      targetRaionUid = locInfo.raionUid;
      targetOblastUid = locInfo.oblastUid;
    } else if (allLocationsCache.length > 0) {
      const found = allLocationsCache.find(l => String(l.uid) === locUid || (locTitle && l.title && l.title.toLowerCase().trim() === locTitle));
      if (found && found.raionUid) {
        targetRaionUid = String(found.raionUid);
        targetOblastUid = String(found.oblastUid || '');
      }
    }

    if (targetRaionUid) {
      if (!hromadasByRaion.has(targetRaionUid)) {
        hromadasByRaion.set(targetRaionUid, []);
      }
      hromadasByRaion.get(targetRaionUid).push(a.location_title || a.title || 'Громада');

      allDistrictPaths.forEach(p => {
        const distUid = p.getAttribute('data-uid');
        if (distUid === targetRaionUid) {
          p.classList.remove('safe');
          if (alertType === 'artillery_shelling') p.classList.add('artillery');
          else if (alertLevel === 'yellow') p.classList.add('yellow');
          else p.classList.add('alert');

          p.setAttribute('data-alert-type', alertType);
          p.setAttribute('data-alert-level', alertLevel);
          p.setAttribute('data-started-at', startedAt);
          activeRaionUids.add(distUid);
          activeOblastUids.add(targetOblastUid || p.getAttribute('data-oblast-uid') || '');
        }
      });
    }
  }

  // Запис переліку громад в атрибути районів
  for (const [rUid, hList] of hromadasByRaion.entries()) {
    allDistrictPaths.forEach(p => {
      if (p.getAttribute('data-uid') === rUid) {
        p.setAttribute('data-active-hromadas', JSON.stringify(hList));
      }
    });
  }

  // Оновлення лічильника у верхній панелі карти
  const activeCount = activeRaionUids.size;
  const oblastsCount = activeOblastUids.size;

  if (internalAlertsSummary) {
    const mapStatsPill = internalAlertsSummary.closest('.map-stats-pill');
    if (activeCount > 0) {
      if (mapStatsPill) mapStatsPill.classList.add('has-alerts');
      internalAlertsSummary.textContent = `Тривога: ${activeCount} районів у ${oblastsCount} областях`;
    } else {
      if (mapStatsPill) mapStatsPill.classList.remove('has-alerts');
      internalAlertsSummary.textContent = 'Україна: тривог немає';
    }
  }

  // Оновлення бейджа на вкладці "Вбудована"
  if (tabInternalAlertBadge) {
    if (activeCount > 0) {
      tabInternalAlertBadge.textContent = activeCount;
      tabInternalAlertBadge.style.display = 'inline-flex';
    } else {
      tabInternalAlertBadge.style.display = 'none';
    }
  }
}

// ==========================================================================
// 3. ПЕРЕМИКАННЯ ВКЛАДОК КАРТ
// ==========================================================================
function setActiveTabUI(tabId) {
  currentActiveTab = tabId;

  // Оновлення активної кнопки вкладки
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Перемикання видимості контейнерів
  if (tabId === 'internal') {
    if (internalMapContainer) internalMapContainer.style.display = 'flex';
    if (mapPlaceholder) mapPlaceholder.style.display = 'none';
    if (mapProgressBar) mapProgressBar.classList.remove('active');
  } else {
    if (internalMapContainer) internalMapContainer.style.display = 'none';
    if (mapPlaceholder) mapPlaceholder.style.display = 'flex';
  }
}

// ==========================================================================
// 4. ОНОВЛЕННЯ СТАТУСУ ШАПКИ ЗАСТОСУНКУ
// ==========================================================================
function updateUI(status) {
  if (!status) return;

  statusLocation.textContent = status.locationTitle || 'Україна';

  // Оновлення нейтральної іконки зв'язку та швидкого тултіпа
  if (connectionStatus && fastTooltipText) {
    let tooltipMsg = '';
    const timeStr = status.lastChecked ? ` · ${status.lastChecked}` : '';

    if (status.isOffline) {
      connectionStatus.className = 'connection-status offline';
      if (status.offlineReason === 'no_internet') {
        tooltipMsg = `Офлайн · Немає інтернету${timeStr}`;
      } else if (status.offlineReason === 'primary_down') {
        tooltipMsg = `Офлайн · Сервер тривог недоступний${timeStr}`;
      } else {
        tooltipMsg = `Офлайн · Немає зв’язку${timeStr}`;
      }
    } else if (status.fallbackActive && status.activeProvider) {
      connectionStatus.className = 'connection-status';
      const provName = getProviderDisplayName(status.activeProvider);
      tooltipMsg = `Резервне API: ${provName}${timeStr}`;
    } else if (status.isRealtime) {
      connectionStatus.className = 'connection-status';
      tooltipMsg = `Підключено наживо (0s)${timeStr}`;
    } else {
      connectionStatus.className = 'connection-status';
      tooltipMsg = `Підключено через сервер${timeStr}`;
    }
    fastTooltipText.textContent = tooltipMsg;
    connectionStatus.title = tooltipMsg;
  }

  // Єдиний об'єднаний статус-бейдж: стан + характер загрози + час початку
  statusBadge.className = 'status-badge';
  if (appHeader) {
    appHeader.classList.remove('has-alert', 'alert-yellow', 'artillery');
  }

  if (status.isOffline) {
    statusBadge.classList.add('offline');
    statusIcon.innerHTML = icons.offline;
    if (status.offlineReason === 'no_internet') {
      statusText.textContent = 'Офлайн (немає інтернету)';
    } else {
      statusText.textContent = 'Офлайн (немає зв’язку)';
    }
  } else if (status.isAlert) {
    const isYellow = status.alertLevel === 'yellow';
    const threatInfo = status.threatInfo;
    const scopeNote = status.alertScope ? ` (${status.alertScope})` : '';
    const timeStr = status.startedAt ? new Date(status.startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
    const timeSuffix = timeStr ? ` (з ${timeStr})` : '';

    let threatName = 'Повітряна тривога';
    let iconKey = 'alert';

    if (threatInfo && threatInfo.hasThreats && threatInfo.badgeLabel) {
      threatName = threatInfo.badgeLabel;
      iconKey = threatInfo.iconType || 'alert';
    } else if (status.alertType === 'artillery_shelling') {
      threatName = 'Загроза артобстрілу';
      iconKey = 'artillery';
    } else if (isYellow) {
      threatName = 'Дронова загроза';
      iconKey = 'drone';
    }

    if (status.alertType === 'artillery_shelling' || iconKey === 'artillery') {
      statusBadge.classList.add('artillery');
      if (appHeader) appHeader.classList.add('has-alert', 'artillery');
    } else if (isYellow || threatInfo?.level === 'yellow') {
      statusBadge.classList.add('alert-yellow');
      if (appHeader) appHeader.classList.add('has-alert', 'alert-yellow');
    } else {
      statusBadge.classList.add('alert');
      if (appHeader) appHeader.classList.add('has-alert');
    }

    if (threatInfo?.iconTypes && threatInfo.iconTypes.length > 1) {
      statusIcon.innerHTML = threatInfo.iconTypes
        .map(key => threatIcons[key] || icons[key] || '')
        .filter(Boolean)
        .join('');
    } else {
      statusIcon.innerHTML = threatIcons[iconKey] || icons[iconKey] || icons.alert;
    }
    statusText.textContent = `${threatName}${scopeNote}${timeSuffix}`;
  } else {
    statusBadge.classList.add('safe');
    statusIcon.innerHTML = icons.safe;
    statusText.textContent = 'Немає тривоги';
  }

  // Оновлення векторної карти при наявності allAlerts у статусі
  if (Array.isArray(status.allAlerts)) {
    applyAlertsToVectorMap(status.allAlerts);
  }
}

function setMapLoadingState(state, errorMsg = '') {
  if (currentActiveTab === 'internal') {
    if (mapProgressBar) mapProgressBar.classList.remove('active');
    if (mapPlaceholder) mapPlaceholder.style.display = 'none';
    return;
  }

  if (state === 'loading') {
    if (mapProgressBar) mapProgressBar.classList.add('active');
    if (mapLoadingState) mapLoadingState.style.display = 'flex';
    if (mapErrorState) mapErrorState.style.display = 'none';
    if (mapPlaceholder) mapPlaceholder.style.display = 'flex';
  } else if (state === 'ready') {
    if (mapProgressBar) mapProgressBar.classList.remove('active');
    if (mapLoadingState) mapLoadingState.style.display = 'none';
    if (mapErrorState) mapErrorState.style.display = 'none';
    if (mapPlaceholder) mapPlaceholder.style.display = 'none';
  } else if (state === 'failed') {
    if (mapProgressBar) mapProgressBar.classList.remove('active');
    if (mapLoadingState) mapLoadingState.style.display = 'none';
    if (mapPlaceholder) mapPlaceholder.style.display = 'flex';
    if (mapErrorState) {
      mapErrorState.style.display = 'flex';
      if (mapErrorDescription && errorMsg) {
        mapErrorDescription.textContent = errorMsg;
      }
    }
  }
}

function playAudio(soundType, soundId, volume = 80) {
  try {
    if (!audioPlayer) return;
    const file = soundType === 'alert'
      ? (soundId ? `alert-${soundId}.wav` : 'alert.wav')
      : (soundId ? `all-clear-${soundId}.wav` : 'all-clear.wav');

    audioPlayer.src = `../../../assets/audio/${file}`;
    audioPlayer.currentTime = 0;
    audioPlayer.volume = Math.max(0, Math.min(1, (volume !== undefined ? volume : 80) / 100));
    audioPlayer.play().catch((err) => {
      console.warn('Не вдалося автоматично відтворити звук:', err.message);
    });
  } catch (err) {
    console.error('Помилка аудіо:', err);
  }
}

// ==========================================================================
// 5. СЛУХАЧІ ПОДІЙ ТА ІНІЦІАЛІЗАЦІЯ
// ==========================================================================
btnSettings.addEventListener('click', () => {
  if (window.alertAPI && window.alertAPI.openSettings) {
    window.alertAPI.openSettings();
  }
});

const statusLocationWrapper = document.getElementById('statusLocationWrapper');
if (statusLocationWrapper) {
  statusLocationWrapper.addEventListener('click', () => {
    if (window.alertAPI && window.alertAPI.openSettings) {
      window.alertAPI.openSettings();
    }
  });
}

if (btnRetryMap) {
  btnRetryMap.addEventListener('click', () => {
    setMapLoadingState('loading');
    if (window.alertAPI && window.alertAPI.reloadMap) {
      window.alertAPI.reloadMap();
    }
  });
}

// Векторний перемикач теми інтерфейсу у верхній шапці вікна (без емодзі та без обертання)
if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const nextDark = !currentThemeIsDark;
    applyTheme(nextDark);
    if (window.alertAPI && window.alertAPI.toggleTheme) {
      window.alertAPI.toggleTheme(nextDark);
    }
  });
}

// Закриття висувної панелі історії адмінодиниці
if (btnHistoryClose) {
  btnHistoryClose.addEventListener('click', () => {
    closeHistoryDrawer();
  });
}

// Клік на порожнє поле карти знімає виділення та ховає панель історії
if (ukraineVectorSvg) {
  ukraineVectorSvg.addEventListener('click', (e) => {
    if (!e.target.closest('.map-district')) {
      closeHistoryDrawer();
    }
  });
}

function applyTheme(isDark) {
  currentThemeIsDark = Boolean(isDark);
  if (currentThemeIsDark) {
    document.documentElement.classList.add('theme-dark');
    document.documentElement.classList.remove('theme-light');
  } else {
    document.documentElement.classList.add('theme-light');
    document.documentElement.classList.remove('theme-dark');
  }
}

// Перемикання вкладок нижньої панелі
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.getAttribute('data-tab');
    if (!tabId || tabId === currentActiveTab) return;
    setActiveTabUI(tabId);
    if (window.alertAPI && window.alertAPI.selectMapTab) {
      window.alertAPI.selectMapTab(tabId);
    }
  });
});

// Ініціалізація карти в DOM
initVectorMap();

// Підключення до Electron IPC
if (window.alertAPI) {
  window.alertAPI.onStatusUpdate((status) => {
    updateUI(status);
  });

  window.alertAPI.onPlayAudio(({ soundType, soundId, volume }) => {
    playAudio(soundType, soundId, volume);
  });

  if (window.alertAPI.onMapLoadingState) {
    window.alertAPI.onMapLoadingState(({ state, errorMsg }) => {
      setMapLoadingState(state, errorMsg);
    });
  }

  // Оновлення всіх активних тривог для векторної карти
  if (window.alertAPI.onAllAlertsUpdate) {
    window.alertAPI.onAllAlertsUpdate((alerts) => {
      applyAlertsToVectorMap(alerts);
    });
  }

  // Синхронізація теми оформлення
  if (window.alertAPI.onThemeUpdated) {
    window.alertAPI.onThemeUpdated(({ isDark }) => {
      applyTheme(isDark);
    });
  }

  if (window.alertAPI.getTheme) {
    window.alertAPI.getTheme().then((themeInfo) => {
      if (themeInfo && typeof themeInfo.isDark === 'boolean') {
        applyTheme(themeInfo.isDark);
      }
    }).catch(() => {});
  }

  // Завантаження активної вкладки
  if (window.alertAPI.getActiveMapTab) {
    window.alertAPI.getActiveMapTab().then((tabId) => {
      if (tabId) {
        setActiveTabUI(tabId);
      }
    }).catch(() => {});
  }

  // Завантаження початкового стану
  window.alertAPI.getCurrentStatus().then((status) => {
    updateUI(status);
  }).catch((err) => {
    console.warn('Помилка завантаження стану:', err);
  });

  // Отримання масиву всіх тривог при старті
  if (window.alertAPI.getAllAlerts) {
    window.alertAPI.getAllAlerts().then((alerts) => {
      if (Array.isArray(alerts) && alerts.length > 0) {
        applyAlertsToVectorMap(alerts);
      }
    }).catch(() => {});
  }
}
