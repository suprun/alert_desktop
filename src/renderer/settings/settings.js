const locationSearchInput = document.getElementById('locationSearchInput');
const locationDropdown = document.getElementById('locationDropdown');
const locationList = document.getElementById('locationList');
const locationNoResults = document.getElementById('locationNoResults');
const btnClearLocation = document.getElementById('btnClearLocation');
const comboboxWrapper = document.getElementById('comboboxWrapper');
const selectedLocationBadge = document.getElementById('selectedLocationBadge');
const selectedBadgeText = document.getElementById('selectedBadgeText');
const selectedBadgeType = document.getElementById('selectedBadgeType');
const selectOblast = document.getElementById('selectOblast');
const selectRaion = document.getElementById('selectRaion');
const selectHromada = document.getElementById('selectHromada');

const chkSoundEnabled = document.getElementById('chkSoundEnabled');
const soundControls = document.getElementById('soundControls');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const btnPlayTest = document.getElementById('btnPlayTest');
const playIcon = document.getElementById('playIcon');
const playText = document.getElementById('playText');
const chkAutoStart = document.getElementById('chkAutoStart');
const chkDevMode = document.getElementById('chkDevMode');
const devSettingsControls = document.getElementById('devSettingsControls');
const btnResetToProxy = document.getElementById('btnResetToProxy');
const inputServerUrl = document.getElementById('inputServerUrl');
const inputApiKey = document.getElementById('inputApiKey');
const btnCancel = document.getElementById('btnCancel');
const btnSave = document.getElementById('btnSave');
const audioTest = document.getElementById('audioTest');

const DEFAULT_PROXY_URL = 'https://api.applink.pp.ua/v1/alerts/active.json';

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

// Перемикання режиму розробника
function updateDevModeState() {
  if (!chkDevMode || !devSettingsControls) return;
  const isDev = chkDevMode.checked;
  devSettingsControls.style.display = isDev ? 'flex' : 'none';
}

if (chkDevMode) {
  chkDevMode.addEventListener('change', updateDevModeState);
}

if (btnResetToProxy) {
  btnResetToProxy.addEventListener('click', () => {
    inputServerUrl.value = DEFAULT_PROXY_URL;
    inputApiKey.value = '';
  });
}

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

// Функції пошукового Combobox та ієрархії
function populateOblasts() {
  if (!selectOblast) return;
  const oblasts = allLocations.filter(l => l.type === 'Область' || (l.type && l.type.includes('спеціальним')));
  oblasts.sort((a, b) => {
    if (a.uid === '31') return -1;
    if (b.uid === '31') return 1;
    return a.title.localeCompare(b.title, 'uk');
  });
  selectOblast.innerHTML = '<option value="">(Оберіть область / місто)</option>' +
    oblasts.map(o => `<option value="${o.uid}">${o.title}</option>`).join('');
}

function populateRaions(oblastUid) {
  if (!selectRaion) return;
  if (!oblastUid) {
    selectRaion.innerHTML = '<option value="">(Оберіть район)</option>';
    selectRaion.disabled = true;
    if (selectHromada) {
      selectHromada.innerHTML = '<option value="">(Оберіть громаду)</option>';
      selectHromada.disabled = true;
    }
    return;
  }

  const raions = allLocations.filter(l => l.type === 'Район' && String(l.oblastUid) === String(oblastUid));
  if (raions.length === 0) {
    selectRaion.innerHTML = '<option value="">(Немає районів)</option>';
    selectRaion.disabled = true;
    if (selectHromada) {
      selectHromada.innerHTML = '<option value="">(Немає громад)</option>';
      selectHromada.disabled = true;
    }
  } else {
    raions.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    selectRaion.innerHTML = '<option value="">(Оберіть район)</option>' +
      raions.map(r => `<option value="${r.uid}">${r.title}</option>`).join('');
    selectRaion.disabled = false;
  }
}

function populateHromadas(raionUid) {
  if (!selectHromada) return;
  if (!raionUid) {
    selectHromada.innerHTML = '<option value="">(Оберіть громаду)</option>';
    selectHromada.disabled = true;
    return;
  }

  const hromadas = allLocations.filter(l => l.type === 'Громада' && String(l.raionUid) === String(raionUid));
  if (hromadas.length === 0) {
    selectHromada.innerHTML = '<option value="">(Немає громад)</option>';
    selectHromada.disabled = true;
  } else {
    hromadas.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    selectHromada.innerHTML = '<option value="">(Оберіть громаду)</option>' +
      hromadas.map(h => `<option value="${h.uid}">${h.title}</option>`).join('');
    selectHromada.disabled = false;
  }
}

function selectLocation(loc, syncHierarchy = true) {
  if (!loc) return;
  selectedUid = String(loc.uid);
  selectedTitle = loc.title;
  selectedType = loc.type || '';

  locationSearchInput.value = loc.title;
  selectedBadgeText.textContent = loc.title;
  selectedBadgeType.textContent = loc.type || '';
  selectedLocationBadge.style.display = 'flex';
  btnClearLocation.style.display = 'flex';

  if (syncHierarchy && selectOblast) {
    if (loc.type === 'Область' || (loc.type && loc.type.includes('спеціальним'))) {
      selectOblast.value = String(loc.uid);
      populateRaions(loc.uid);
      if (selectRaion) selectRaion.value = '';
      if (selectHromada) {
        selectHromada.innerHTML = '<option value="">(Оберіть громаду)</option>';
        selectHromada.disabled = true;
      }
    } else if (loc.type === 'Район') {
      selectOblast.value = String(loc.oblastUid || '');
      populateRaions(loc.oblastUid);
      if (selectRaion) selectRaion.value = String(loc.uid);
      populateHromadas(loc.uid);
      if (selectHromada) selectHromada.value = '';
    } else if (loc.type === 'Громада') {
      selectOblast.value = String(loc.oblastUid || '');
      populateRaions(loc.oblastUid);
      if (selectRaion) selectRaion.value = String(loc.raionUid || '');
      populateHromadas(loc.raionUid);
      if (selectHromada) selectHromada.value = String(loc.uid);
    }
  }

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
  selectedLocationBadge.style.display = 'none';
  if (selectOblast) selectOblast.value = '';
  populateRaions(null);
  locationSearchInput.focus();
  openDropdown();
});

// Слухачі подій для ієрархічних списків вибору
if (selectOblast) {
  selectOblast.addEventListener('change', () => {
    const oUid = selectOblast.value;
    if (!oUid) {
      populateRaions(null);
      return;
    }
    populateRaions(oUid);
    if (selectHromada) {
      selectHromada.innerHTML = '<option value="">(Оберіть громаду)</option>';
      selectHromada.disabled = true;
    }

    const oLoc = allLocations.find(l => String(l.uid) === String(oUid));
    if (oLoc) {
      selectLocation(oLoc, false);
    }
  });
}

if (selectRaion) {
  selectRaion.addEventListener('change', () => {
    const rUid = selectRaion.value;
    if (!rUid) {
      populateHromadas(null);
      const oLoc = allLocations.find(l => String(l.uid) === String(selectOblast.value));
      if (oLoc) {
        selectLocation(oLoc, false);
      }
      return;
    }
    populateHromadas(rUid);

    const rLoc = allLocations.find(l => String(l.uid) === String(rUid));
    if (rLoc) {
      selectLocation(rLoc, false);
    }
  });
}

if (selectHromada) {
  selectHromada.addEventListener('change', () => {
    const hUid = selectHromada.value;
    if (!hUid) {
      const rLoc = allLocations.find(l => String(l.uid) === String(selectRaion.value));
      if (rLoc) {
        selectLocation(rLoc, false);
      }
      return;
    }

    const hLoc = allLocations.find(l => String(l.uid) === String(hUid));
    if (hLoc) {
      selectLocation(hLoc, false);
    }
  });
}

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
    populateOblasts();

    // 2. Завантаження поточної конфігурації
    const cfg = await window.settingsAPI.getConfig();

    if (cfg.locationUid) {
      selectedUid = String(cfg.locationUid);
      const found = allLocations.find(l => String(l.uid) === selectedUid);
      if (found) {
        selectLocation(found, true);
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
    chkDevMode.checked = Boolean(cfg.devMode);
    inputServerUrl.value = cfg.serverUrl || DEFAULT_PROXY_URL;
    inputApiKey.value = cfg.apiKey || '';

    updateSoundControlsState();
    updateDevModeState();

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

  const isDevMode = chkDevMode ? chkDevMode.checked : false;

  const newConfig = {
    locationUid: selectedUid,
    locationTitle: selectedTitle,
    soundEnabled: chkSoundEnabled.checked,
    volume: parseInt(volumeSlider.value, 10),
    autoStart: chkAutoStart.checked,
    devMode: isDevMode,
    serverUrl: isDevMode ? (inputServerUrl.value.trim() || DEFAULT_PROXY_URL) : DEFAULT_PROXY_URL,
    apiKey: isDevMode ? inputApiKey.value.trim() : (inputApiKey.value.trim() || '')
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
