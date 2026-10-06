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
const selectedHighlightLayer = document.getElementById('selectedHighlightLayer');
const oblastLabelsLayer = document.getElementById('oblastLabelsLayer');
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

// Елементи пігулкового тосту оновлень
const updatePillToast = document.getElementById('updatePillToast');
const updatePillMessage = document.getElementById('updatePillMessage');
const btnPillDownload = document.getElementById('btnPillDownload');
const btnPillInstall = document.getElementById('btnPillInstall');
const btnPillDismiss = document.getElementById('btnPillDismiss');
let isPillToastDismissed = false;
let lastPillVersion = null;
const settingsUpdateBadge = document.getElementById('settingsUpdateBadge');
let lastUpdateStatus = null;

// Поточний стан
let currentActiveTab = 'internal';
let currentThemeIsDark = true;
let allLocationsCache = [];
let hromadaToRaionMap = new Map();
let currentAlertsList = [];
let activeDrawerDistrictUid = null;
let drawerLiveRefreshTimer = null;
let lastRenderedDrawerState = null;

const statusIconNames = {
  safe: 'shield-check',
  alert: 'siren',
  artillery: 'circle-alert',
  yellow: 'shield-alert',
  offline: 'wifi-off'
};

const threatIconNames = {
  drone: 'drone',
  missile: 'missile',
  ballistic: 'ballistic',
  aviation: 'aviation',
  artillery: 'target',
  general: 'triangle-alert',
  chemical: 'flask',
  nuclear: 'radiation'
};

function createUiIcon(iconName, size = 14) {
  const icon = document.createElement('span');
  icon.className = `ui-icon icon-${iconName} icon-size-${size}`;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function renderUiIcons(container, iconNames, size = 18) {
  if (!container) return;
  const names = Array.isArray(iconNames) ? iconNames : [iconNames];
  const iconsToRender = names.filter(Boolean).map(name => createUiIcon(name, size));
  container.replaceChildren(...iconsToRender);
}

function iconMarkup(iconName, size = 14) {
  return `<span class="ui-icon icon-${iconName} icon-size-${size}" aria-hidden="true"></span>`;
}

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
  if (selectedHighlightLayer) selectedHighlightLayer.innerHTML = '';
  if (oblastLabelsLayer) oblastLabelsLayer.innerHTML = '';

  // Об'єднуємо складені контури районів (ексклави/острови) за UID в єдині геометрії
  const consolidatedRegions = [];
  const regionMap = new Map();

  for (const reg of MAP_REGIONS) {
    const uidStr = String(reg.uid);
    if (!regionMap.has(uidStr)) {
      const copy = { ...reg };
      regionMap.set(uidStr, copy);
      consolidatedRegions.push(copy);
    } else {
      const existing = regionMap.get(uidStr);
      existing.d = `${existing.d} ${reg.d}`;
      if (reg.mask && !existing.mask) existing.mask = reg.mask;
    }
  }

  // Створення елементів районів
  const fragment = document.createDocumentFragment();
  for (const reg of consolidatedRegions) {
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

  // Створення текстових підписів назв областей (Overlay)
  const labelsLayer = oblastLabelsLayer || document.getElementById('oblastLabelsLayer');
  if (labelsLayer && typeof MAP_OBLAST_LABELS !== 'undefined') {
    const labelFragment = document.createDocumentFragment();
    for (const ob of MAP_OBLAST_LABELS) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'map-oblast-label');
      text.setAttribute('x', ob.x);
      text.setAttribute('y', ob.y);
      text.setAttribute('data-uid', ob.uid || '');
      if (ob.fontSize) {
        text.style.fontSize = `${ob.fontSize}px`;
      }
      text.textContent = ob.name;
      labelFragment.appendChild(text);
    }
    labelsLayer.appendChild(labelFragment);
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

function refreshOpenHistoryDrawer(isBackground = true) {
  if (!regionHistoryDrawer || !regionHistoryDrawer.classList.contains('open') || !activeDrawerDistrictUid) {
    return;
  }
  if (!districtsLayer) return;

  const currentEl = districtsLayer.querySelector(`.map-district[data-uid="${activeDrawerDistrictUid}"]`);
  if (!currentEl) return;

  const uid = activeDrawerDistrictUid;
  const title = currentEl.getAttribute('data-title') || 'Адмінодиниця';
  const oblastUid = currentEl.getAttribute('data-oblast-uid') || '';
  const oblastTitle = currentEl.getAttribute('data-oblast-title') || '';
  const alertType = currentEl.getAttribute('data-alert-type') || '';
  const alertLevel = currentEl.getAttribute('data-alert-level') || '';
  const startedAt = currentEl.getAttribute('data-started-at') || '';
  const isAlert = currentEl.classList.contains('alert') || currentEl.classList.contains('yellow') || currentEl.classList.contains('artillery');

  if (historyRegionTitle) historyRegionTitle.textContent = title;
  if (historyOblastTitle) historyOblastTitle.textContent = oblastTitle ? `${oblastTitle}` : '';

  if (!isBackground && historyDrawerBody) {
    historyDrawerBody.innerHTML = `
      <div class="drawer-loading">
        <div class="drawer-spinner"></div>
        <span>Завантаження історії...</span>
      </div>
    `;
  }

  if (window.alertAPI && window.alertAPI.getRegionHistory) {
    window.alertAPI.getRegionHistory({ regionUid: uid, oblastUid })
      .then((data) => {
        if (regionHistoryDrawer && regionHistoryDrawer.classList.contains('open') && activeDrawerDistrictUid === uid) {
          const loadingEl = historyDrawerBody ? historyDrawerBody.querySelector('.drawer-loading') : null;
          if (loadingEl) {
            loadingEl.classList.add('fade-out');
            setTimeout(() => {
              if (activeDrawerDistrictUid === uid) {
                renderRegionHistory(data, { uid, title, oblastTitle, isAlert, alertType, alertLevel, startedAt });
              }
            }, 120);
          } else {
            renderRegionHistory(data, { uid, title, oblastTitle, isAlert, alertType, alertLevel, startedAt });
          }
        }
      })
      .catch((err) => {
        if (!isBackground && historyDrawerBody) {
          historyDrawerBody.innerHTML = `<div class="drawer-loading"><span>Помилка завантаження історії (${escapeHtml(err.message)})</span></div>`;
        }
      });
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

  activeDrawerDistrictUid = uid;
  lastRenderedDrawerState = null;

  // Виділення району на карті
  if (districtsLayer) {
    districtsLayer.querySelectorAll('.map-district.selected').forEach(p => p.classList.remove('selected'));
  }
  el.classList.add('selected');

  // Неподільний шар підсвічування поверх меж та сусідніх районів (малюється на поверхні всього SVG)
  if (selectedHighlightLayer) {
    const d = el.getAttribute('d');
    selectedHighlightLayer.innerHTML = `<path d="${d}" class="map-district-highlight-outline" />`;
  }

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

  // Запуск фонового live-таймера для регулярного оновлення відкритої панелі
  if (drawerLiveRefreshTimer) {
    clearInterval(drawerLiveRefreshTimer);
  }
  drawerLiveRefreshTimer = setInterval(() => {
    refreshOpenHistoryDrawer(true);
  }, 10000);

  // Запит історії через IPC (Gateway -> Fallback)
  if (window.alertAPI && window.alertAPI.getRegionHistory) {
    window.alertAPI.getRegionHistory({ regionUid: uid, oblastUid })
      .then((data) => {
        if (regionHistoryDrawer && regionHistoryDrawer.classList.contains('open') && activeDrawerDistrictUid === uid) {
          const loadingEl = historyDrawerBody ? historyDrawerBody.querySelector('.drawer-loading') : null;
          if (loadingEl) {
            loadingEl.classList.add('fade-out');
            setTimeout(() => {
              if (activeDrawerDistrictUid === uid) {
                renderRegionHistory(data, { uid, title, oblastTitle, isAlert, alertType, alertLevel, startedAt });
              }
            }, 120);
          } else {
            renderRegionHistory(data, { uid, title, oblastTitle, isAlert, alertType, alertLevel, startedAt });
          }
        }
      })
      .catch((err) => {
        if (historyDrawerBody) {
          historyDrawerBody.innerHTML = `<div class="drawer-loading"><span>Помилка завантаження історії (${escapeHtml(err.message)})</span></div>`;
        }
      });
  }
}

function closeHistoryDrawer() {
  activeDrawerDistrictUid = null;
  lastRenderedDrawerState = null;
  if (drawerLiveRefreshTimer) {
    clearInterval(drawerLiveRefreshTimer);
    drawerLiveRefreshTimer = null;
  }
  if (regionHistoryDrawer) {
    regionHistoryDrawer.classList.remove('open');
    regionHistoryDrawer.setAttribute('aria-hidden', 'true');
  }
  if (districtsLayer) {
    districtsLayer.querySelectorAll('.map-district.selected').forEach(p => p.classList.remove('selected'));
  }
  if (selectedHighlightLayer) {
    selectedHighlightLayer.innerHTML = '';
  }
}

function renderRegionHistory(data, meta) {
  if (!historyDrawerBody) return;
  try {
    const { isAlert, alertType, alertLevel, startedAt } = meta;

  // 1. Поточний статус безпеки
  let statusCardClass = 'safe';
  let statusTitle = 'Немає тривоги';
  let statusSubtitle = 'Наразі загрози не зафіксовано';
  let statusIconName = statusIconNames.safe;

  if (isAlert) {
    if (alertType === 'artillery_shelling') {
      statusCardClass = 'artillery';
      statusTitle = 'Загроза артобстрілу';
      statusIconName = threatIconNames.artillery;
    } else if (alertLevel === 'yellow' || alertType === 'drone') {
      statusCardClass = 'yellow';
      statusTitle = 'Дронова загроза';
      statusIconName = threatIconNames.drone;
    } else if (alertType === 'missile') {
      statusCardClass = 'alert';
      statusTitle = 'Ракетна загроза';
      statusIconName = threatIconNames.missile;
    } else if (alertType === 'aviation') {
      statusCardClass = 'alert';
      statusTitle = 'Загроза тактичної авіації';
      statusIconName = threatIconNames.aviation;
    } else {
      statusCardClass = 'alert';
      statusTitle = 'Повітряна тривога';
      statusIconName = statusIconNames.alert;
    }
    if (startedAt) {
      const timeStr = new Date(startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      statusSubtitle = `Триває з ${timeStr}`;
    } else {
      statusSubtitle = 'Активна тривога';
    }
  }


  // 2. Статистика за сьогодні
  function pluralizeUa(n, one, few, many) {
    const abs = Math.abs(Math.round(n));
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
    if (mod10 === 1) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
    return `${n} ${many}`;
  }

  function formatDurationMinutes(min, startDate, endDate) {
    if (min === null || min === undefined || isNaN(min)) return '';
    if (min <= 0) return '0 хв';
    if (min < 1) return '< 1 хв';
    if (min < 60) return `${Math.round(min)} хв`;

    // До 24 годин: лаконічний формат "X год" або "X год Y хв"
    if (min < 1440) {
      const hours = Math.floor(min / 60);
      const remainderMin = Math.round(min % 60);
      if (remainderMin === 0) return `${hours} год`;
      return `${hours} год ${remainderMin} хв`;
    }

    // 1 доба або більше: конвертація в дні, місяці, роки з українськими відмінками
    let years = 0;
    let months = 0;
    let days = 0;
    let hours = 0;
    let minutes = 0;

    if (startDate && endDate) {
      let start = startDate instanceof Date ? startDate : new Date(typeof startDate === 'number' && startDate < 1e11 ? startDate * 1000 : startDate);
      let end = endDate instanceof Date ? endDate : new Date(typeof endDate === 'number' && endDate < 1e11 ? endDate * 1000 : endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (start > end) {
          const tmp = start;
          start = end;
          end = tmp;
        }

        years = end.getFullYear() - start.getFullYear();
        months = end.getMonth() - start.getMonth();
        days = end.getDate() - start.getDate();
        hours = end.getHours() - start.getHours();
        minutes = end.getMinutes() - start.getMinutes();

        if (minutes < 0) {
          hours -= 1;
          minutes += 60;
        }
        if (hours < 0) {
          days -= 1;
          hours += 24;
        }
        if (days < 0) {
          months -= 1;
          const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
          days += prevMonth.getDate();
        }
        if (months < 0) {
          years -= 1;
          months += 12;
        }
      }
    }

    if (years === 0 && months === 0 && days === 0) {
      const totalDays = Math.floor(min / 1440);
      hours = Math.floor((min % 1440) / 60);
      minutes = Math.round(min % 60);

      years = Math.floor(totalDays / 365);
      const remDays = totalDays % 365;
      months = Math.floor(remDays / 30);
      days = remDays % 30;
    }

    const parts = [];
    if (years > 0) {
      parts.push(pluralizeUa(years, 'рік', 'роки', 'років'));
      if (months > 0) {
        parts.push(pluralizeUa(months, 'місяць', 'місяці', 'місяців'));
      }
      if (days > 0) {
        parts.push(pluralizeUa(days, 'день', 'дні', 'днів'));
      }
    } else if (months > 0) {
      parts.push(pluralizeUa(months, 'місяць', 'місяці', 'місяців'));
      if (days > 0) {
        parts.push(pluralizeUa(days, 'день', 'дні', 'днів'));
      }
      if (days === 0 && hours > 0) {
        parts.push(pluralizeUa(hours, 'година', 'години', 'годин'));
      }
    } else {
      // Тільки дні (менше місяця)
      parts.push(pluralizeUa(days, 'день', 'дні', 'днів'));
      if (hours > 0) {
        parts.push(pluralizeUa(hours, 'година', 'години', 'годин'));
      }
      if (days < 2 && hours === 0 && minutes > 0) {
        parts.push(pluralizeUa(minutes, 'хвилина', 'хвилини', 'хвилин'));
      }
    }

    return parts.join(' ');
  }

  function formatDateTime(dateInput) {
    if (!dateInput) return '';
    const date = dateInput instanceof Date ? dateInput : new Date(typeof dateInput === 'number' && dateInput < 1e11 ? dateInput * 1000 : dateInput);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const timeStr = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === now.toDateString()) {
      return `Сьогодні, ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Вчора, ${timeStr}`;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    if (date.getFullYear() !== now.getFullYear()) {
      return `${day}.${month}.${date.getFullYear()}, ${timeStr}`;
    }
    return `${day}.${month}, ${timeStr}`;
  }

  const todayStats = data && (data.todayStats || data.today_stats);
  let count = todayStats ? (todayStats.alertCount ?? todayStats.alert_count ?? 0) : 0;
  let totalMin = todayStats ? (todayStats.totalDurationMin ?? todayStats.total_duration_min ?? 0) : 0;

  // Якщо тривога активна прямо зараз, обов'язково враховуємо її в сьогоднішній статистиці
  let currentElapsedMin = 0;
  if (isAlert) {
    if (count === 0) count = 1;
    if (startedAt) {
      const startTs = new Date(startedAt).getTime();
      if (!isNaN(startTs) && startTs > 0) {
        currentElapsedMin = Math.max(1, Math.round((Date.now() - startTs) / 60000));
      }
    }
    if (totalMin === 0 && currentElapsedMin > 0) {
      totalMin = currentElapsedMin;
    }
  }

  let durationText = '';
  if (totalMin > 0) {
    durationText = formatDurationMinutes(totalMin);
  } else if (todayStats && (todayStats.durationFormatted || todayStats.duration_formatted) && count > 0) {
    const rawFmt = todayStats.durationFormatted || todayStats.duration_formatted;
    durationText = (rawFmt === '< 1 хв' && totalMin === 0) ? '' : rawFmt;
  }

  let statsValueHtml = '';
  if (count === 0) {
    statsValueHtml = 'Сьогодні тривог не зафіксовано';
  } else {
    const countText = `${count} ${count === 1 ? 'тривога' : (count >= 2 && count <= 4 ? 'тривоги' : 'тривог')}`;
    statsValueHtml = durationText ? `${countText} · ${durationText}` : countText;
  }

  // 3. Недавні тривоги
  let alertsListClean = (data && (data.recentAlerts || data.recent_alerts)) ? [...(data.recentAlerts || data.recent_alerts)] : [];

  // Якщо є дублікат підрахунку в статистиці через паралельний запис
  if (isAlert && count > 1 && alertsListClean.length <= 1) {
    count = 1;
    totalMin = currentElapsedMin > 0 ? currentElapsedMin : totalMin;
    const countText = '1 тривога';
    const durStr = formatDurationMinutes(totalMin);
    statsValueHtml = durStr ? `${countText} · ${durStr}` : countText;
  }


  // Якщо тривога активна прямо зараз, синхронізуємо або додаємо її до списку без дублювання
  if (isAlert) {
    // Знаходимо всі активні записи
    const activeIndices = [];
    alertsListClean.forEach((a, idx) => {
      if (a.isActive || a.is_active || !a.finishedAt || !a.finished_at) {
        activeIndices.push(idx);
      }
    });

    let currentThreatType = 1;
    let currentThreatLabel = 'Повітряна тривога';

    if (alertLevel === 'yellow' || alertType === 'drone') {
      currentThreatType = 4;
      currentThreatLabel = 'Дронова загроза';
    } else if (alertType === 'artillery_shelling') {
      currentThreatType = 2;
      currentThreatLabel = 'Загроза артобстрілу';
    } else if (alertType === 'missile') {
      currentThreatType = 3;
      currentThreatLabel = 'Ракетна загроза';
    } else if (alertType === 'aviation') {
      currentThreatType = 5;
      currentThreatLabel = 'Загроза тактичної авіації';
    }

    if (activeIndices.length > 0) {
      const primaryIdx = activeIndices[0];
      const activeItem = alertsListClean[primaryIdx];
      activeItem.threatType = currentThreatType;
      activeItem.threatLabel = currentThreatLabel;
      activeItem.threat_type = currentThreatType;
      activeItem.threat_label = currentThreatLabel;
      activeItem.isActive = true;
      activeItem.is_active = true;
      activeItem.finishedAt = null;
      activeItem.finished_at = null;
      activeItem.finishedText = 'Триває';
      activeItem.finished_text = 'Триває';
      if (currentElapsedMin > 0) {
        const formatted = formatDurationMinutes(currentElapsedMin, startedAt, Date.now());
        activeItem.durationText = formatted;
        activeItem.duration_text = formatted;
      }
      // Видаляємо надлишкові паралельні активні записи (якщо прийшли окремо з області та району)
      if (activeIndices.length > 1) {
        const removeSet = new Set(activeIndices.slice(1));
        alertsListClean = alertsListClean.filter((_, idx) => !removeSet.has(idx));
        // Якщо всі активні записи виявились дублікатами однієї поточної тривоги
        if (alertsListClean.length === 1 && count > 1) {
          count = 1;
          totalMin = currentElapsedMin > 0 ? currentElapsedMin : totalMin;
          const countText = '1 тривога';
          const durStr = formatDurationMinutes(totalMin);
          statsValueHtml = durStr ? `${countText} · ${durStr}` : countText;
        }
      }
    } else {
      alertsListClean.unshift({
        id: `active_${Date.now()}`,
        startedAt: startedAt ? Math.floor(new Date(startedAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
        finishedAt: null,
        isActive: true,
        threatType: currentThreatType,
        threatLabel: currentThreatLabel,
        startedText: startedAt ? formatDateTime(startedAt) : 'Сьогодні, щойно',
        finishedText: 'Триває',
        durationText: currentElapsedMin > 0 ? formatDurationMinutes(currentElapsedMin, startedAt, Date.now()) : ''
      });
    }
  }

  let timelineItemsHtml = '';

  if (alertsListClean.length > 0) {
    timelineItemsHtml = alertsListClean.map(a => {
      const threatLabel = a.threatLabel || a.threat_label || 'Повітряна тривога';
      let threatClass = 'alert';
      let iconName = statusIconNames.alert;

      const tType = a.threatType || a.threat_type;
      if (tType === 2 || String(tType).includes('artillery')) {
        threatClass = 'artillery';
        iconName = threatIconNames.artillery;
      } else if (tType === 4 || String(tType).includes('drone')) {
        threatClass = 'yellow';
        iconName = threatIconNames.drone;
      } else if (tType === 3 || String(tType).includes('missile')) {
        iconName = threatIconNames.missile;
      } else if (tType === 5 || String(tType).includes('aviation')) {
        iconName = threatIconNames.aviation;
      }

      const startedStr = a.startedText || a.started_text || (a.startedAt ? formatDateTime(a.startedAt) : '');
      const finishedStr = a.finishedText || a.finished_text || (a.finishedAt ? formatDateTime(a.finishedAt) : (a.isActive ? 'Триває' : ''));
      const timeRange = finishedStr ? `${startedStr} — ${finishedStr}` : startedStr;
      let durationStr = a.durationText || a.duration_text || '';
      if (!durationStr && a.durationMin) {
        durationStr = formatDurationMinutes(a.durationMin, a.startedAt, a.finishedAt);
      } else if (durationStr && durationStr.includes('год') && a.durationMin && a.durationMin >= 1440) {
        durationStr = formatDurationMinutes(a.durationMin, a.startedAt, a.finishedAt);
      }
      const msgHtml = a.message ? `<div class="history-item-msg">${escapeHtml(a.message)}</div>` : '';

      return `
        <div class="history-item">
          <div class="history-item-header">
            <span class="history-item-threat ${threatClass}">
              ${iconMarkup(iconName)}
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
    timelineItemsHtml = `
      <div class="history-empty-state">
        <span class="empty-history-icon">${iconMarkup(statusIconNames.safe, 24)}</span>
        <span class="empty-history-title">Спокійна обстановка</span>
        <span class="empty-history-desc">За останній період тривог не надходило.</span>
      </div>
    `;
  }

  // Визначаємо, чи відбулися суттєві зміни порівняно з попереднім відображенням
  const firstAlert = alertsListClean[0];
  const firstAlertId = firstAlert ? (firstAlert.id || firstAlert.startedAt) : null;
  const currentCoreState = {
    districtUid: activeDrawerDistrictUid,
    isAlert: !!isAlert,
    statusCardClass,
    statusTitle,
    count,
    alertsCount: alertsListClean.length,
    firstAlertId
  };

  const hasFundamentalChange = !lastRenderedDrawerState ||
    lastRenderedDrawerState.districtUid !== currentCoreState.districtUid ||
    lastRenderedDrawerState.isAlert !== currentCoreState.isAlert ||
    lastRenderedDrawerState.statusCardClass !== currentCoreState.statusCardClass ||
    lastRenderedDrawerState.statusTitle !== currentCoreState.statusTitle ||
    lastRenderedDrawerState.count !== currentCoreState.count ||
    lastRenderedDrawerState.alertsCount !== currentCoreState.alertsCount ||
    lastRenderedDrawerState.firstAlertId !== currentCoreState.firstAlertId;

  lastRenderedDrawerState = currentCoreState;
  const animClass = hasFundamentalChange ? ' drawer-animate-in' : '';

  const statusCardHtml = `
    <div class="history-status-card ${statusCardClass}${animClass}">
      <span class="status-icon">${iconMarkup(statusIconName, 18)}</span>
      <div class="history-status-info">
        <span class="history-status-title">${statusTitle}</span>
        <span class="history-status-subtitle">${statusSubtitle}</span>
      </div>
    </div>
  `;

  const statsCardHtml = `
    <div class="history-stats-card${animClass}">
      <span class="history-stats-heading">Сьогодні</span>
      <span class="history-stats-values">${statsValueHtml}</span>
    </div>
  `;

  const timelineSectionHtml = `
    <div class="history-timeline-section${animClass}">
      <h4 class="history-section-title">Останні тривоги</h4>
      <div class="history-timeline-list">
        ${timelineItemsHtml}
      </div>
    </div>
  `;

    const prevScrollTop = historyDrawerBody.scrollTop;
    historyDrawerBody.innerHTML = statusCardHtml + statsCardHtml + timelineSectionHtml;
    if (!hasFundamentalChange) {
      historyDrawerBody.scrollTop = prevScrollTop;
    }
  } catch (renderErr) {
    console.error('[Renderer] Помилка рендерингу історії регіону:', renderErr);
    if (historyDrawerBody) {
      historyDrawerBody.innerHTML = `
        <div class="history-status-card ${meta && meta.isAlert ? 'alert' : 'safe'} drawer-animate-in">
          <span class="status-icon">${iconMarkup(meta && meta.isAlert ? statusIconNames.alert : statusIconNames.safe, 18)}</span>
          <div class="history-status-info">
            <span class="history-status-title">${meta && meta.isAlert ? 'Повітряна тривога' : 'Немає тривоги'}</span>
            <span class="history-status-subtitle">${meta && meta.isAlert ? 'Активна тривога' : 'Наразі загрози не зафіксовано'}</span>
          </div>
        </div>
        <div class="history-empty-state drawer-animate-in">
          <span class="empty-history-desc">Не вдалося завантажити деталі історії (${escapeHtml(renderErr.message)}).</span>
        </div>
      `;
    }
  }
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
      renderUiIcons(tooltipStatusIcon, threatIconNames.artillery, 14);
      tooltipStatusText.textContent = 'Загроза артобстрілу';
    } else if (targetEl.classList.contains('yellow') || alertLevel === 'yellow') {
      tooltipStatusBadge.classList.add('yellow');
      renderUiIcons(tooltipStatusIcon, threatIconNames.drone, 14);
      tooltipStatusText.textContent = 'Дронова загроза';
    } else {
      tooltipStatusBadge.classList.add('alert');
      renderUiIcons(tooltipStatusIcon, statusIconNames.alert, 18);
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
    renderUiIcons(tooltipStatusIcon, statusIconNames.safe, 18);
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
        const obTitle = (p.getAttribute('data-oblast-title') || '').toLowerCase().trim();
        const obUid = p.getAttribute('data-oblast-uid');

        const isExactUidMatch = distUid === locUid;
        const isExactTitleMatch = locTitle && (distTitle === locTitle) && (!locOblast || obTitle.includes(locOblast) || (a.location_oblast_uid && obUid === String(a.location_oblast_uid)));

        if (isExactUidMatch || isExactTitleMatch) {
          p.classList.remove('safe');
          if (alertType === 'artillery_shelling') p.classList.add('artillery');
          else if (alertLevel === 'yellow') p.classList.add('yellow');
          else p.classList.add('alert');

          p.setAttribute('data-alert-type', alertType);
          p.setAttribute('data-alert-level', alertLevel);
          p.setAttribute('data-started-at', startedAt);
          activeRaionUids.add(distUid);
          activeOblastUids.add(obUid || '');
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

  // Оновлення бічної панелі наживо при зміні карти тривог
  if (activeDrawerDistrictUid && regionHistoryDrawer && regionHistoryDrawer.classList.contains('open')) {
    refreshOpenHistoryDrawer(true);
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
      tooltipMsg = `Підключено наживо${timeStr}`;
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
    renderUiIcons(statusIcon, statusIconNames.offline, 18);
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
      const combinedIconNames = threatInfo.iconTypes
        .map(key => threatIconNames[key] || statusIconNames[key])
        .filter(Boolean);
      renderUiIcons(statusIcon, combinedIconNames, 14);
    } else {
      renderUiIcons(statusIcon, threatIconNames[iconKey] || statusIconNames[iconKey] || statusIconNames.alert, 18);
    }
    statusText.textContent = `${threatName}${scopeNote}${timeSuffix}`;
  } else {
    statusBadge.classList.add('safe');
    renderUiIcons(statusIcon, statusIconNames.safe, 18);
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
    const shouldScrollToAbout = Boolean(lastUpdateStatus && lastUpdateStatus.updateDownloaded);
    window.alertAPI.openSettings({ scrollTo: shouldScrollToAbout ? 'about' : null });
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

// Визначаємо початкову активну вкладку негайно (синхронно / URL query), щоб усунути спалах вбудованої карти
const urlParams = new URLSearchParams(window.location.search);
const queryTab = urlParams.get('initialTab');
const syncTab = (window.alertAPI && typeof window.alertAPI.getActiveMapTabSync === 'function')
  ? window.alertAPI.getActiveMapTabSync()
  : null;
const initialTab = syncTab || queryTab || 'internal';
setActiveTabUI(initialTab);

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
    }).catch(() => { });
  }

  // Синхронізація зміни вкладки з боку головного процесу
  if (window.alertAPI.onMapTabChanged) {
    window.alertAPI.onMapTabChanged(({ activeTab }) => {
      if (activeTab) {
        setActiveTabUI(activeTab);
      }
    });
  }

  // Завантаження активної вкладки (проміс як фолбек)
  if (window.alertAPI.getActiveMapTab) {
    window.alertAPI.getActiveMapTab().then((tabId) => {
      if (tabId) {
        setActiveTabUI(tabId);
      }
    }).catch(() => { });
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
    }).catch(() => { });
  }

  // Завантаження довідника локацій для коректної прив'язки громад до районів
  if (window.alertAPI.getLocations) {
    window.alertAPI.getLocations().then((locs) => {
      if (Array.isArray(locs) && locs.length > 0) {
        allLocationsCache = locs;
        hromadaToRaionMap.clear();
        for (const l of locs) {
          if (l.uid && l.raionUid) {
            hromadaToRaionMap.set(String(l.uid), {
              raionUid: String(l.raionUid),
              oblastUid: String(l.oblastUid || '')
            });
          }
        }
        if (currentAlertsList && currentAlertsList.length > 0) {
          applyAlertsToVectorMap(currentAlertsList);
        }
      }
    }).catch(() => { });
  }

  // Ініціалізація та відстеження статусу оновлень
  if (window.alertAPI && typeof window.alertAPI.getUpdateStatus === 'function') {
    window.alertAPI.getUpdateStatus().then((status) => {
      renderUpdatePillToast(status);
    }).catch(() => {});
  }

  if (window.alertAPI && typeof window.alertAPI.onUpdateStatusChanged === 'function') {
    window.alertAPI.onUpdateStatusChanged((status) => {
      renderUpdatePillToast(status);
    });
  }

  if (window.alertAPI && typeof window.alertAPI.onUpdateDownloadProgress === 'function') {
    window.alertAPI.onUpdateDownloadProgress((progressObj) => {
      if (updatePillToast && !isPillToastDismissed) {
        updatePillToast.style.display = 'inline-flex';
        const pct = Math.round(progressObj.percent || 0);
        if (updatePillMessage) updatePillMessage.textContent = `Завантаження оновлення... ${pct}%`;
        if (btnPillDownload) btnPillDownload.style.display = 'none';
        if (btnPillInstall) btnPillInstall.style.display = 'none';
      }
    });
  }
}

// Функція відображення пігулкового тосту оновлень
function renderUpdatePillToast(status) {
  updateSettingsBadge(status);
  if (!updatePillToast || !status) return;

  const version = status.availableVersion || status.downloadedVersion;
  if (version && version !== lastPillVersion) {
    lastPillVersion = version;
    isPillToastDismissed = false;
  }

  if (isPillToastDismissed) {
    updatePillToast.style.display = 'none';
    return;
  }

  if (status.updateDownloaded) {
    updatePillToast.style.display = 'inline-flex';
    if (updatePillMessage) updatePillMessage.textContent = `Оновлення v${status.downloadedVersion} готове до встановлення`;
    if (btnPillDownload) btnPillDownload.style.display = 'none';
    if (btnPillInstall) {
      btnPillInstall.style.display = 'inline-block';
      btnPillInstall.disabled = false;
    }
  } else if (status.isDownloading) {
    updatePillToast.style.display = 'inline-flex';
    const pct = Math.round(status.downloadPercent || 0);
    if (updatePillMessage) updatePillMessage.textContent = `Завантаження оновлення... ${pct}%`;
    if (btnPillDownload) btnPillDownload.style.display = 'none';
    if (btnPillInstall) btnPillInstall.style.display = 'none';
  } else if (status.needsManualDownload) {
    updatePillToast.style.display = 'inline-flex';
    if (updatePillMessage) updatePillMessage.textContent = `Доступне оновлення v${status.availableVersion}`;
    if (btnPillDownload) {
      btnPillDownload.style.display = 'inline-block';
      btnPillDownload.disabled = false;
    }
    if (btnPillInstall) btnPillInstall.style.display = 'none';
  } else {
    updatePillToast.style.display = 'none';
  }
}

// Функція оновлення зеленого індикатора сповіщення на кнопці налаштувань
function updateSettingsBadge(status) {
  lastUpdateStatus = status;
  const badge = document.getElementById('settingsUpdateBadge');
  if (!btnSettings || !badge) return;
  const hasUpdateToInstall = Boolean(status && status.updateDownloaded);
  badge.style.display = hasUpdateToInstall ? 'block' : 'none';
  if (hasUpdateToInstall) {
    btnSettings.setAttribute('title', `Налаштування (доступне оновлення v${status.downloadedVersion} для встановлення)`);
  } else {
    btnSettings.setAttribute('title', 'Налаштування');
  }
}

if (btnPillDownload) {
  btnPillDownload.addEventListener('click', async () => {
    btnPillDownload.disabled = true;
    if (updatePillMessage) updatePillMessage.textContent = 'Початок завантаження...';
    try {
      if (window.alertAPI && typeof window.alertAPI.downloadUpdate === 'function') {
        const res = await window.alertAPI.downloadUpdate();
        renderUpdatePillToast(res);
      }
    } catch (_) {
      btnPillDownload.disabled = false;
    }
  });
}

if (btnPillInstall) {
  btnPillInstall.addEventListener('click', () => {
    btnPillInstall.disabled = true;
    if (window.alertAPI && typeof window.alertAPI.installUpdate === 'function') {
      window.alertAPI.installUpdate();
    }
  });
}

if (btnPillDismiss) {
  btnPillDismiss.addEventListener('click', () => {
    isPillToastDismissed = true;
    if (updatePillToast) updatePillToast.style.display = 'none';
  });
}
