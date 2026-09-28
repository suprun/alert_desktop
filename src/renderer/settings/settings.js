const locationSearchInput = document.getElementById('locationSearchInput');
const locationDropdown = document.getElementById('locationDropdown');
const locationList = document.getElementById('locationList');
const locationNoResults = document.getElementById('locationNoResults');
const btnClearLocation = document.getElementById('btnClearLocation');
const comboboxWrapper = document.getElementById('comboboxWrapper');
const selectedLocationBadge = document.getElementById('selectedLocationBadge');
const selectedBadgeText = document.getElementById('selectedBadgeText');
const selectedBadgeType = document.getElementById('selectedBadgeType');

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
let allLocations = [];
let selectedUid = '31';
let selectedTitle = 'м. Київ';
let selectedType = 'Місто з спеціальним статусом';
let highlightedIndex = -1;

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

// Функції пошукового Combobox
function selectLocation(loc) {
  selectedUid = String(loc.uid);
  selectedTitle = loc.title;
  selectedType = loc.type || '';

  locationSearchInput.value = loc.title;
  selectedBadgeText.textContent = loc.title;
  selectedBadgeType.textContent = loc.type || '';
  selectedLocationBadge.style.display = 'flex';
  btnClearLocation.style.display = 'flex';

  closeDropdown();
}

function openDropdown() {
  renderDropdownResults(locationSearchInput.value.trim());
  locationDropdown.style.display = 'block';
}

function closeDropdown() {
  locationDropdown.style.display = 'none';
  highlightedIndex = -1;
}

function renderDropdownResults(query) {
  locationList.innerHTML = '';
  highlightedIndex = -1;

  let filtered = [];
  const q = query.toLowerCase();

  if (!q) {
    filtered = allLocations.slice(0, 60);
  } else {
    // Спочатку точні збіги та збіги на початку назви, потім підрядкові
    const startsWithMatches = [];
    const containsMatches = [];

    for (const loc of allLocations) {
      const titleLower = loc.title.toLowerCase();
      const notesLower = (loc.notes || '').toLowerCase();

      if (titleLower.startsWith(q)) {
        startsWithMatches.push(loc);
      } else if (titleLower.includes(q) || notesLower.includes(q)) {
        containsMatches.push(loc);
      }

      if (startsWithMatches.length + containsMatches.length >= 80) {
        break;
      }
    }

    filtered = [...startsWithMatches, ...containsMatches];
  }

  if (filtered.length === 0) {
    locationNoResults.style.display = 'block';
  } else {
    locationNoResults.style.display = 'none';

    filtered.forEach((loc, index) => {
      const item = document.createElement('div');
      item.className = 'location-item';
      if (String(loc.uid) === selectedUid) {
        item.classList.add('selected');
      }

      const titleEl = document.createElement('span');
      titleEl.className = 'location-item-title';
      titleEl.textContent = loc.title;

      const typeEl = document.createElement('span');
      typeEl.className = 'location-item-type';
      if (loc.type === 'Область' || (loc.type && loc.type.includes('спеціальним'))) {
        typeEl.classList.add('oblast');
      } else if (loc.type === 'Район') {
        typeEl.classList.add('raion');
      } else {
        typeEl.classList.add('hromada');
      }
      typeEl.textContent = loc.type || '';

      item.appendChild(titleEl);
      if (loc.type) {
        item.appendChild(typeEl);
      }

      item.addEventListener('click', () => {
        selectLocation(loc);
      });

      locationList.appendChild(item);
    });
  }
}

// Події поля пошуку
locationSearchInput.addEventListener('focus', () => {
  openDropdown();
});

locationSearchInput.addEventListener('input', () => {
  const hasText = Boolean(locationSearchInput.value.trim());
  btnClearLocation.style.display = hasText ? 'flex' : 'none';
  openDropdown();
});

btnClearLocation.addEventListener('click', (e) => {
  e.stopPropagation();
  locationSearchInput.value = '';
  btnClearLocation.style.display = 'none';
  locationSearchInput.focus();
  openDropdown();
});

// Клавіатурна навігація у списку результатів
locationSearchInput.addEventListener('keydown', (e) => {
  const items = locationList.querySelectorAll('.location-item');
  if (!items.length || locationDropdown.style.display === 'none') {
    if (e.key === 'ArrowDown') {
      openDropdown();
      e.preventDefault();
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightedIndex = (highlightedIndex + 1) % items.length;
    updateHighlightedItem(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
    updateHighlightedItem(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (highlightedIndex >= 0 && highlightedIndex < items.length) {
      items[highlightedIndex].click();
    }
  } else if (e.key === 'Escape') {
    closeDropdown();
  }
});

function updateHighlightedItem(items) {
  items.forEach((item, idx) => {
    if (idx === highlightedIndex) {
      item.classList.add('highlighted');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('highlighted');
    }
  });
}

// Закриття випадаючого списку при кліку поза межами
document.addEventListener('click', (e) => {
  if (!comboboxWrapper.contains(e.target)) {
    closeDropdown();
  }
});

// Завантаження початкових даних
async function init() {
  try {
    if (!window.settingsAPI) return;

    // 1. Завантаження повного довідника локацій
    allLocations = await window.settingsAPI.getLocations();

    // 2. Завантаження поточної конфігурації
    const cfg = await window.settingsAPI.getConfig();

    if (cfg.locationUid) {
      selectedUid = String(cfg.locationUid);
      const found = allLocations.find(l => String(l.uid) === selectedUid);
      if (found) {
        selectLocation(found);
      } else if (cfg.locationTitle) {
        selectedTitle = cfg.locationTitle;
        locationSearchInput.value = cfg.locationTitle;
        selectedBadgeText.textContent = cfg.locationTitle;
        selectedBadgeType.textContent = '';
        selectedLocationBadge.style.display = 'flex';
        btnClearLocation.style.display = 'flex';
      }
    } else {
      // Якщо локацію ще не обрано
      selectedLocationBadge.style.display = 'none';
      btnClearLocation.style.display = 'none';
    }

    chkSoundEnabled.checked = cfg.soundEnabled !== false;
    volumeSlider.value = cfg.volume !== undefined ? cfg.volume : 80;
    volumeValue.textContent = `${volumeSlider.value}%`;
    chkAutoStart.checked = Boolean(cfg.autoStart);
    inputServerUrl.value = cfg.serverUrl || 'https://api.alerts.in.ua/v1/alerts/active.json';
    inputApiKey.value = cfg.apiKey || '';

    updateSoundControlsState();

  } catch (err) {
    console.error('Помилка ініціалізації налаштувань:', err);
  }
}

// Збереження налаштувань
btnSave.addEventListener('click', async () => {
  if (!window.settingsAPI) return;

  // Якщо користувач ввів текст у поле вручну і не вибрав зі списку, шукаємо прямий збіг
  const inputText = locationSearchInput.value.trim().toLowerCase();
  if (inputText) {
    const match = allLocations.find(l => l.title.toLowerCase() === inputText);
    if (match) {
      selectedUid = String(match.uid);
      selectedTitle = match.title;
    }
  }

  const newConfig = {
    locationUid: selectedUid,
    locationTitle: selectedTitle,
    soundEnabled: chkSoundEnabled.checked,
    volume: parseInt(volumeSlider.value, 10),
    autoStart: chkAutoStart.checked,
    serverUrl: inputServerUrl.value.trim() || 'https://api.alerts.in.ua/v1/alerts/active.json',
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
