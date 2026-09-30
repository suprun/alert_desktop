const appHeader = document.getElementById('appHeader');
const statusBadge = document.getElementById('statusBadge');
const statusIcon = document.getElementById('statusIcon');
const statusLocation = document.getElementById('statusLocation');
const statusText = document.getElementById('statusText');
const connectionStatus = document.getElementById('connectionStatus');
const fastTooltipText = document.getElementById('fastTooltipText');
const btnSettings = document.getElementById('btnSettings');
const mapProgressBar = document.getElementById('mapProgressBar');
const mapLoadingState = document.getElementById('mapLoadingState');
const mapErrorState = document.getElementById('mapErrorState');
const mapErrorDescription = document.getElementById('mapErrorDescription');
const btnRetryMap = document.getElementById('btnRetryMap');
const audioPlayer = document.getElementById('audioPlayer');

// Лінійні SVG іконки статусів
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
    </svg>`
};

function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('theme-dark');
  } else {
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.classList.add('theme-light');
  }
}

function updateUI(status) {
  if (!status) return;

  statusLocation.textContent = status.locationTitle || 'Україна';

  // Оновлення нейтральної іконки зв'язку та швидкого тултіпа
  if (connectionStatus && fastTooltipText) {
    let tooltipMsg = '';
    if (status.isOffline) {
      connectionStatus.className = 'connection-status offline';
      const timeStr = status.lastChecked ? ` · ${status.lastChecked}` : '';
      tooltipMsg = `Офлайн · Немає зв’язку${timeStr}`;
    } else if (status.isRealtime) {
      connectionStatus.className = 'connection-status';
      const timeStr = status.lastChecked ? ` · ${status.lastChecked}` : '';
      tooltipMsg = `Підключено наживо (0s)${timeStr}`;
    } else {
      connectionStatus.className = 'connection-status';
      const timeStr = status.lastChecked ? ` · ${status.lastChecked}` : '';
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
    statusText.textContent = 'Офлайн (немає зв’язку)';
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

    statusIcon.innerHTML = threatIcons[iconKey] || icons[iconKey] || icons.alert;
    statusText.textContent = `${threatName}${scopeNote}${timeSuffix}`;
  } else {
    statusBadge.classList.add('safe');
    statusIcon.innerHTML = icons.safe;
    statusText.textContent = 'Немає тривоги';
  }
}

function setMapLoadingState(state, errorMsg = '') {
  if (state === 'loading') {
    if (mapProgressBar) mapProgressBar.classList.add('active');
    if (mapLoadingState) mapLoadingState.style.display = 'flex';
    if (mapErrorState) mapErrorState.style.display = 'none';
  } else if (state === 'ready') {
    if (mapProgressBar) mapProgressBar.classList.remove('active');
    if (mapLoadingState) mapLoadingState.style.display = 'none';
    if (mapErrorState) mapErrorState.style.display = 'none';
  } else if (state === 'failed') {
    if (mapProgressBar) mapProgressBar.classList.remove('active');
    if (mapLoadingState) mapLoadingState.style.display = 'none';
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

// Слухачі подій
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

  // Завантаження початкового стану
  window.alertAPI.getCurrentStatus().then((status) => {
    updateUI(status);
  }).catch((err) => {
    console.warn('Помилка завантаження стану:', err);
  });

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
}
