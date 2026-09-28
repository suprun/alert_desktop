const statusBadge = document.getElementById('statusBadge');
const statusIcon = document.getElementById('statusIcon');
const statusLocation = document.getElementById('statusLocation');
const statusText = document.getElementById('statusText');
const lastUpdated = document.getElementById('lastUpdated');
const btnSettings = document.getElementById('btnSettings');
const audioAlert = document.getElementById('audioAlert');
const audioAllClear = document.getElementById('audioAllClear');

// Лінійні SVG іконки
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

function updateUI(status) {
  if (!status) return;

  statusLocation.textContent = status.locationTitle || 'Україна';

  if (status.lastChecked) {
    lastUpdated.textContent = `Оновлено: ${status.lastChecked}`;
  }

  statusBadge.className = 'status-badge';

  if (status.isOffline) {
    statusBadge.classList.add('offline');
    statusIcon.innerHTML = icons.offline;
    statusText.textContent = 'Офлайн (немає зв’язку)';
  } else if (status.isAlert) {
    const isYellow = status.alertLevel === 'yellow';
    if (status.alertType === 'artillery_shelling') {
      statusBadge.classList.add('artillery');
      statusIcon.innerHTML = icons.artillery;
      statusText.textContent = 'Загроза артобстрілу!';
    } else if (isYellow) {
      statusBadge.classList.add('alert-yellow');
      statusIcon.innerHTML = icons.yellow;
      const timeStr = status.startedAt ? new Date(status.startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
      let threatMsg = '';
      if (Array.isArray(status.threats) && status.threats.length > 0 && status.threats[0].source_message) {
        threatMsg = ` [${status.threats[0].source_message}]`;
      }
      statusText.textContent = `Жовтий рівень загрози!${threatMsg}${timeStr ? ` (з ${timeStr})` : ''}`;
    } else {
      statusBadge.classList.add('alert');
      statusIcon.innerHTML = icons.alert;
      const timeStr = status.startedAt ? new Date(status.startedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
      statusText.textContent = `Повітряна тривога!${timeStr ? ` (з ${timeStr})` : ''}`;
    }
  } else {
    statusBadge.classList.add('safe');
    statusIcon.innerHTML = icons.safe;
    statusText.textContent = 'Немає тривоги';
  }
}

function playAudio(soundType, volume = 80) {
  try {
    const audio = soundType === 'alert' ? audioAlert : audioAllClear;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, (volume || 80) / 100));
      audio.play().catch((err) => {
        console.warn('Не вдалося автоматично відтворити звук:', err.message);
      });
    }
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

if (window.alertAPI) {
  window.alertAPI.onStatusUpdate((status) => {
    updateUI(status);
  });

  window.alertAPI.onPlayAudio(({ soundType, volume }) => {
    playAudio(soundType, volume);
  });

  // Завантаження початкового стану
  window.alertAPI.getCurrentStatus().then((status) => {
    updateUI(status);
  }).catch((err) => {
    console.warn('Помилка завантаження стану:', err);
  });
}
