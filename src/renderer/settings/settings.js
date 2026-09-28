const locationSelect = document.getElementById('locationSelect');
const chkSoundEnabled = document.getElementById('chkSoundEnabled');
const soundControls = document.getElementById('soundControls');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const btnPlayTest = document.getElementById('btnPlayTest');
const playIcon = document.getElementById('playIcon');
const playText = document.getElementById('playText');
const chkAutoStart = document.getElementById('chkAutoStart');
const inputServerUrl = document.getElementById('inputServerUrl');
const inputApiKey = document.getElementById('inputApiKey');
const btnCancel = document.getElementById('btnCancel');
const btnSave = document.getElementById('btnSave');
const audioTest = document.getElementById('audioTest');

const playSvg = `
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`;

const pauseSvg = `
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>`;

let isPlaying = false;

function setPlayingState(playing) {
  isPlaying = playing;
  if (isPlaying) {
    playIcon.innerHTML = pauseSvg;
    playText.textContent = 'Зупинити';
  } else {
    playIcon.innerHTML = playSvg;
    playText.textContent = 'Перевірити звук';
  }
}

function updateSoundControlsState() {
  const enabled = chkSoundEnabled.checked;
  if (enabled) {
    soundControls.classList.remove('disabled');
    volumeSlider.disabled = false;
    btnPlayTest.disabled = false;
  } else {
    soundControls.classList.add('disabled');
    volumeSlider.disabled = true;
    btnPlayTest.disabled = true;
    if (isPlaying) {
      audioTest.pause();
      audioTest.currentTime = 0;
      setPlayingState(false);
    }
  }
}

// Зміна чекбоксу звуку
chkSoundEnabled.addEventListener('change', () => {
  updateSoundControlsState();
});

// Зміна слайдера гучності
volumeSlider.addEventListener('input', () => {
  const val = volumeSlider.value;
  volumeValue.textContent = `${val}%`;
  if (isPlaying) {
    audioTest.volume = val / 100;
  }
});

// Кнопка Play/Pause для тесту аудіо
btnPlayTest.addEventListener('click', () => {
  if (isPlaying) {
    audioTest.pause();
    audioTest.currentTime = 0;
    setPlayingState(false);
  } else {
    audioTest.volume = Math.max(0, Math.min(1, volumeSlider.value / 100));
    audioTest.currentTime = 0;
    audioTest.play().then(() => {
      setPlayingState(true);
    }).catch((err) => {
      console.warn('Не вдалося відтворити тестовий звук:', err.message);
      setPlayingState(false);
    });
  }
});

audioTest.addEventListener('ended', () => {
  setPlayingState(false);
});

// Завантаження початкових даних
async function init() {
  try {
    if (!window.settingsAPI) return;

    // Завантаження довідника локацій
    const locations = await window.settingsAPI.getLocations();
    locationSelect.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.disabled = true;
    defaultOpt.textContent = 'Оберіть область або місто...';
    locationSelect.appendChild(defaultOpt);

    for (const loc of locations) {
      const opt = document.createElement('option');
      opt.value = loc.uid;
      opt.textContent = loc.title;
      locationSelect.appendChild(opt);
    }

    // Завантаження збереженої конфігурації
    const cfg = await window.settingsAPI.getConfig();

    if (cfg.locationUid) {
      locationSelect.value = String(cfg.locationUid);
    } else {
      defaultOpt.selected = true;
    }

    chkSoundEnabled.checked = cfg.soundEnabled !== false;
    volumeSlider.value = cfg.volume !== undefined ? cfg.volume : 80;
    volumeValue.textContent = `${volumeSlider.value}%`;
    chkAutoStart.checked = Boolean(cfg.autoStart);
    inputServerUrl.value = cfg.serverUrl || 'https://devs.alerts.in.ua/api/v1/alerts/active.json';
    inputApiKey.value = cfg.apiKey || '';

    updateSoundControlsState();

  } catch (err) {
    console.error('Помилка ініціалізації налаштувань:', err);
  }
}

// Збереження налаштувань
btnSave.addEventListener('click', async () => {
  if (!window.settingsAPI) return;

  const selectedOption = locationSelect.options[locationSelect.selectedIndex];
  const locationUid = locationSelect.value;
  const locationTitle = (selectedOption && !selectedOption.disabled) ? selectedOption.textContent : 'Україна';

  const newConfig = {
    locationUid,
    locationTitle,
    soundEnabled: chkSoundEnabled.checked,
    volume: parseInt(volumeSlider.value, 10),
    autoStart: chkAutoStart.checked,
    serverUrl: inputServerUrl.value.trim() || 'https://devs.alerts.in.ua/api/v1/alerts/active.json',
    apiKey: inputApiKey.value.trim()
  };

  await window.settingsAPI.saveConfig(newConfig);
  window.settingsAPI.closeSettings();
});

// Скасування / закриття
btnCancel.addEventListener('click', () => {
  if (isPlaying) {
    audioTest.pause();
    audioTest.currentTime = 0;
  }
  if (window.settingsAPI) {
    window.settingsAPI.closeSettings();
  }
});

init();
