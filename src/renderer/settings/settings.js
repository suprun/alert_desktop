const selectedLocationBadge = document.getElementById('selectedLocationBadge');
const selectedBadgeText = document.getElementById('selectedBadgeText');
const selectedBadgeType = document.getElementById('selectedBadgeType');
const selectOblast = document.getElementById('selectOblast');
const selectRaion = document.getElementById('selectRaion');
const selectHromada = document.getElementById('selectHromada');

const chkSoundAlertEnabled = document.getElementById('chkSoundAlertEnabled');
const alertSoundControls = document.getElementById('alertSoundControls');
const selectAlertSound = document.getElementById('selectAlertSound');
const btnPlayAlertTest = document.getElementById('btnPlayAlertTest');
const playAlertIcon = document.getElementById('playAlertIcon');
const playAlertText = document.getElementById('playAlertText');

const chkSoundAllClearEnabled = document.getElementById('chkSoundAllClearEnabled');
const allClearSoundControls = document.getElementById('allClearSoundControls');
const selectAllClearSound = document.getElementById('selectAllClearSound');
const btnPlayAllClearTest = document.getElementById('btnPlayAllClearTest');
const playAllClearIcon = document.getElementById('playAllClearIcon');
const playAllClearText = document.getElementById('playAllClearText');

const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const chkAutoStart = document.getElementById('chkAutoStart');
const chkDevMode = document.getElementById('chkDevMode');
const devSettingsControls = document.getElementById('devSettingsControls');
const radioProviderGateway = document.getElementById('radioProviderGateway');
const radioProviderUkraineAlarm = document.getElementById('radioProviderUkraineAlarm');
const radioProviderAlertsInUa = document.getElementById('radioProviderAlertsInUa');
const radioProviderUbilling = document.getElementById('radioProviderUbilling');
const radioProviderNeptun = document.getElementById('radioProviderNeptun');
const radioProviderJaam = document.getElementById('radioProviderJaam');
const apiProviderRadios = document.querySelectorAll('input[name="apiProviderRadio"]');
const inputServerUrl = document.getElementById('inputServerUrl');
const inputApiKey = document.getElementById('inputApiKey');
const chkEnableFallback = document.getElementById('chkEnableFallback');
const btnCancel = document.getElementById('btnCancel');
const btnSave = document.getElementById('btnSave');
const audioTest = document.getElementById('audioTest');

const DEFAULT_PROXY_URL = 'https://api.applink.pp.ua/v1/alerts/active.json';
const URL_UKRAINE_ALARM = 'https://api.ukrainealarm.com/api/v3/alerts';
const URL_ALERTS_IN_UA = 'https://api.alerts.in.ua/v1/alerts/active.json';
const URL_UBILLING = 'https://ubilling.net.ua/aerialalerts/';
const URL_NEPTUN = 'https://neptun.in.ua/api/v1/alerts';
const URL_JAAM = 'https://jaam.net.ua/alerts_statuses_v3.json';

const playSvg = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`;

const pauseSvg = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>`;

let activeTestType = null; // 'alert' | 'all-clear' | null
let allLocations = [];
let selectedUid = '31';
let selectedTitle = 'м. Київ';
let selectedType = 'Місто з спеціальним статусом';

function stopAudioTest() {
  if (audioTest) {
    audioTest.pause();
    audioTest.currentTime = 0;
  }
  activeTestType = null;
  if (playAlertIcon) playAlertIcon.innerHTML = playSvg;
  if (playAlertText) playAlertText.textContent = 'Перевірити';
  if (playAllClearIcon) playAllClearIcon.innerHTML = playSvg;
  if (playAllClearText) playAllClearText.textContent = 'Перевірити';
}

function updateSoundControlsState() {
  const alertEnabled = chkSoundAlertEnabled.checked;
  const allClearEnabled = chkSoundAllClearEnabled.checked;

  if (alertEnabled) {
    alertSoundControls.classList.remove('disabled');
    selectAlertSound.disabled = false;
    btnPlayAlertTest.disabled = false;
  } else {
    alertSoundControls.classList.add('disabled');
    selectAlertSound.disabled = true;
    btnPlayAlertTest.disabled = true;
    if (activeTestType === 'alert') stopAudioTest();
  }

  if (allClearEnabled) {
    allClearSoundControls.classList.remove('disabled');
    selectAllClearSound.disabled = false;
    btnPlayAllClearTest.disabled = false;
  } else {
    allClearSoundControls.classList.add('disabled');
    selectAllClearSound.disabled = true;
    btnPlayAllClearTest.disabled = true;
    if (activeTestType === 'all-clear') stopAudioTest();
  }

  volumeSlider.disabled = !alertEnabled && !allClearEnabled;
}

// Зміна чекбоксів звуку
chkSoundAlertEnabled.addEventListener('change', updateSoundControlsState);
chkSoundAllClearEnabled.addEventListener('change', updateSoundControlsState);

function getSelectedApiProvider() {
  const checked = document.querySelector('input[name="apiProviderRadio"]:checked');
  return checked ? checked.value : 'gateway';
}

function updateApiProviderState() {
  const provider = getSelectedApiProvider();
  if (inputServerUrl) {
    inputServerUrl.readOnly = true;
    inputServerUrl.disabled = false;
  }

  if (provider === 'gateway') {
    if (inputServerUrl) {
      inputServerUrl.value = DEFAULT_PROXY_URL;
      inputServerUrl.placeholder = DEFAULT_PROXY_URL;
    }
    if (inputApiKey) {
      inputApiKey.disabled = true;
      inputApiKey.value = '';
      inputApiKey.placeholder = 'Токен не потрібен для вбудованого шлюзу';
    }
  } else if (provider === 'ukrainealarm') {
    if (inputServerUrl) {
      inputServerUrl.value = URL_UKRAINE_ALARM;
      inputServerUrl.placeholder = URL_UKRAINE_ALARM;
    }
    if (inputApiKey) {
      inputApiKey.disabled = false;
      inputApiKey.placeholder = 'Введіть токен UkraineAlarm';
    }
  } else if (provider === 'alertsinua') {
    if (inputServerUrl) {
      inputServerUrl.value = URL_ALERTS_IN_UA;
      inputServerUrl.placeholder = URL_ALERTS_IN_UA;
    }
    if (inputApiKey) {
      inputApiKey.disabled = false;
      inputApiKey.placeholder = 'Введіть токен alerts.in.ua';
    }
  } else if (provider === 'ubilling') {
    if (inputServerUrl) {
      inputServerUrl.value = URL_UBILLING;
      inputServerUrl.placeholder = URL_UBILLING;
    }
    if (inputApiKey) {
      inputApiKey.disabled = true;
      inputApiKey.value = '';
      inputApiKey.placeholder = 'Токен не потрібен для Ubilling API';
    }
  } else if (provider === 'neptun') {
    if (inputServerUrl) {
      inputServerUrl.value = URL_NEPTUN;
      inputServerUrl.placeholder = URL_NEPTUN;
    }
    if (inputApiKey) {
      inputApiKey.disabled = true;
      inputApiKey.value = '';
      inputApiKey.placeholder = 'Токен не потрібен для NEPTUN API';
    }
  } else if (provider === 'jaam') {
    if (inputServerUrl) {
      inputServerUrl.value = URL_JAAM;
      inputServerUrl.placeholder = URL_JAAM;
    }
    if (inputApiKey) {
      inputApiKey.disabled = true;
      inputApiKey.value = '';
      inputApiKey.placeholder = 'Токен не потрібен для JAAM API';
    }
  }
}

// Перемикання режиму розробника
function updateDevModeState() {
  if (!chkDevMode || !devSettingsControls) return;
  const isDev = chkDevMode.checked;
  devSettingsControls.style.display = isDev ? 'flex' : 'none';
  if (isDev) {
    updateApiProviderState();
  }
}

if (chkDevMode) {
  chkDevMode.addEventListener('change', updateDevModeState);
}

apiProviderRadios.forEach(radio => {
  radio.addEventListener('change', updateApiProviderState);
});

// Безпечне відкриття зовнішніх посилань на документацію API, репозиторій та політики
document.querySelectorAll('.external-api-link, .about-link, .about-meta-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const href = link.getAttribute('href');
    if (href && window.settingsAPI && window.settingsAPI.openExternal) {
      window.settingsAPI.openExternal(href);
    }
  });
});

// Зміна слайдера гучності
volumeSlider.addEventListener('input', () => {
  const val = volumeSlider.value;
  volumeValue.textContent = `${val}%`;
  if (audioTest && activeTestType) {
    audioTest.volume = val / 100;
  }
});

// Кнопка тесту звуку тривоги
btnPlayAlertTest.addEventListener('click', () => {
  if (activeTestType === 'alert') {
    stopAudioTest();
  } else {
    stopAudioTest();
    const soundId = selectAlertSound.value || 'siren';
    audioTest.src = `../../../assets/audio/alert-${soundId}.wav`;
    audioTest.volume = Math.max(0, Math.min(1, volumeSlider.value / 100));
    audioTest.currentTime = 0;
    audioTest.play().then(() => {
      activeTestType = 'alert';
      playAlertIcon.innerHTML = pauseSvg;
      playAlertText.textContent = 'Зупинити';
    }).catch((err) => {
      console.warn('Не вдалося відтворити тестовий звук тривоги:', err.message);
      stopAudioTest();
    });
  }
});

// Кнопка тесту звуку відбою
btnPlayAllClearTest.addEventListener('click', () => {
  if (activeTestType === 'all-clear') {
    stopAudioTest();
  } else {
    stopAudioTest();
    const soundId = selectAllClearSound.value || 'chime';
    audioTest.src = `../../../assets/audio/all-clear-${soundId}.wav`;
    audioTest.volume = Math.max(0, Math.min(1, volumeSlider.value / 100));
    audioTest.currentTime = 0;
    audioTest.play().then(() => {
      activeTestType = 'all-clear';
      playAllClearIcon.innerHTML = pauseSvg;
      playAllClearText.textContent = 'Зупинити';
    }).catch((err) => {
      console.warn('Не вдалося відтворити тестовий звук відбою:', err.message);
      stopAudioTest();
    });
  }
});

audioTest.addEventListener('ended', stopAudioTest);
audioTest.addEventListener('error', stopAudioTest);

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

  selectedBadgeText.textContent = loc.title;
  selectedBadgeType.textContent = loc.type || '';
  selectedBadgeType.className = 'location-item-type selected-badge-type';
  if (loc.type === 'Область' || (loc.type && loc.type.includes('спеціальним'))) {
    selectedBadgeType.classList.add('oblast');
  } else if (loc.type === 'Район') {
    selectedBadgeType.classList.add('raion');
  } else if (loc.type) {
    selectedBadgeType.classList.add('hromada');
  }
  selectedLocationBadge.style.display = 'flex';

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
}





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


// Завантаження початкових даних
async function init() {
  try {
    if (!window.settingsAPI) return;

    try {
      const version = await window.settingsAPI.getAppVersion();
      const versionEl = document.querySelector('.about-version');
      if (versionEl && version) versionEl.textContent = `v${version}`;
    } catch (err) {
      console.error('Не вдалося отримати версію застосунку:', err);
    }

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
        selectedBadgeText.textContent = cfg.locationTitle;
        selectedBadgeType.textContent = '';
        selectedBadgeType.className = 'location-item-type selected-badge-type';
        selectedLocationBadge.style.display = 'flex';
      }
    } else {
      // Якщо локацію ще не обрано
      selectedLocationBadge.style.display = 'none';
    }

    const alertOn = cfg.soundAlertEnabled !== undefined ? cfg.soundAlertEnabled : (cfg.soundEnabled !== false);
    const allClearOn = cfg.soundAllClearEnabled !== undefined ? cfg.soundAllClearEnabled : (cfg.soundEnabled !== false);

    chkSoundAlertEnabled.checked = alertOn;
    chkSoundAllClearEnabled.checked = allClearOn;

    if (cfg.alertSound && selectAlertSound) {
      selectAlertSound.value = cfg.alertSound;
    }
    if (cfg.allClearSound && selectAllClearSound) {
      selectAllClearSound.value = cfg.allClearSound;
    }

    volumeSlider.value = cfg.volume !== undefined ? cfg.volume : 80;
    volumeValue.textContent = `${volumeSlider.value}%`;
    chkAutoStart.checked = Boolean(cfg.autoStart);
    chkDevMode.checked = Boolean(cfg.devMode);
    if (chkEnableFallback) {
      chkEnableFallback.checked = cfg.enableFallback !== false;
    }

    const provider = cfg.apiProvider || (cfg.devMode ? 'ukrainealarm' : 'gateway');
    if (provider === 'ukrainealarm' && radioProviderUkraineAlarm) {
      radioProviderUkraineAlarm.checked = true;
    } else if (provider === 'alertsinua' && radioProviderAlertsInUa) {
      radioProviderAlertsInUa.checked = true;
    } else if (provider === 'ubilling' && radioProviderUbilling) {
      radioProviderUbilling.checked = true;
    } else if (provider === 'neptun' && radioProviderNeptun) {
      radioProviderNeptun.checked = true;
    } else if (provider === 'jaam' && radioProviderJaam) {
      radioProviderJaam.checked = true;
    } else if (radioProviderGateway) {
      radioProviderGateway.checked = true;
    }

    if (provider === 'gateway') {
      inputServerUrl.value = '';
    } else {
      inputServerUrl.value = cfg.serverUrl || '';
    }
    inputApiKey.value = cfg.apiKey || '';

    updateSoundControlsState();
    updateDevModeState();
    updateApiProviderState();

    // 3. Синхронізація теми оформлення
    if (window.settingsAPI.onThemeUpdated) {
      window.settingsAPI.onThemeUpdated(({ isDark }) => {
        applyTheme(isDark);
      });
    }

    if (window.settingsAPI.getTheme) {
      try {
        const themeInfo = await window.settingsAPI.getTheme();
        if (themeInfo && typeof themeInfo.isDark === 'boolean') {
          applyTheme(themeInfo.isDark);
        }
      } catch (e) {
        // ignore theme error
      }
    }

    // Сповіщаємо головний процес про повну готовність інтерфейсу
    if (window.settingsAPI && typeof window.settingsAPI.notifyReady === 'function') {
      window.settingsAPI.notifyReady();
    }

  } catch (err) {
    console.error('Помилка ініціалізації налаштувань:', err);
    if (window.settingsAPI && typeof window.settingsAPI.notifyReady === 'function') {
      window.settingsAPI.notifyReady();
    }
  }
}

function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('theme-dark');
  } else {
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.classList.add('theme-light');
  }
}

// Збереження налаштувань
btnSave.addEventListener('click', async () => {
  if (!window.settingsAPI) return;

  stopAudioTest();

  const isDevMode = chkDevMode ? chkDevMode.checked : false;
  const currentProvider = isDevMode ? getSelectedApiProvider() : 'gateway';

  let finalServerUrl = DEFAULT_PROXY_URL;
  let finalApiKey = '';

  if (isDevMode) {
    if (currentProvider === 'gateway') {
      finalServerUrl = DEFAULT_PROXY_URL;
      finalApiKey = '';
    } else if (currentProvider === 'ubilling') {
      finalServerUrl = URL_UBILLING;
      finalApiKey = '';
    } else if (currentProvider === 'neptun') {
      finalServerUrl = URL_NEPTUN;
      finalApiKey = '';
    } else if (currentProvider === 'jaam') {
      finalServerUrl = URL_JAAM;
      finalApiKey = '';
    } else if (currentProvider === 'ukrainealarm') {
      finalServerUrl = URL_UKRAINE_ALARM;
      finalApiKey = inputApiKey.value.trim();
    } else if (currentProvider === 'alertsinua') {
      finalServerUrl = URL_ALERTS_IN_UA;
      finalApiKey = inputApiKey.value.trim();
    }
  }

  const newConfig = {
    locationUid: selectedUid,
    locationTitle: selectedTitle,
    soundEnabled: chkSoundAlertEnabled.checked || chkSoundAllClearEnabled.checked,
    soundAlertEnabled: chkSoundAlertEnabled.checked,
    soundAllClearEnabled: chkSoundAllClearEnabled.checked,
    alertSound: selectAlertSound ? selectAlertSound.value : 'siren',
    allClearSound: selectAllClearSound ? selectAllClearSound.value : 'chime',
    volume: parseInt(volumeSlider.value, 10),
    autoStart: chkAutoStart.checked,
    devMode: isDevMode,
    apiProvider: currentProvider,
    enableFallback: chkEnableFallback ? chkEnableFallback.checked : true,
    serverUrl: finalServerUrl,
    apiKey: finalApiKey
  };

  await window.settingsAPI.saveConfig(newConfig);
  window.settingsAPI.closeSettings();
});

// Скасування / закриття
btnCancel.addEventListener('click', () => {
  stopAudioTest();
  if (window.settingsAPI) {
    window.settingsAPI.closeSettings();
  }
});

init();
