const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const config = require('../src/main/config');
const api = require('../src/main/api');
const locations = require('../src/main/locations.json');

console.log('Smoke test: Checking components initialization...');

// 1. Check locations
if (!Array.isArray(locations) || locations.length === 0) {
  console.error('FAIL: locations.json is empty or invalid');
  process.exit(1);
}
console.log(`OK: locations loaded (${locations.length} items)`);

// 1.1 Check icons
const requiredIcons = [
  'tray-normal.png',
  'tray-air-raid.png',
  'tray-air-raid-yellow.png',
  'tray-yellow.png',
  'tray-drone.png',
  'tray-missile.png',
  'tray-ballistic.png',
  'tray-aviation.png',
  'tray-combo-missile-drone.png',
  'tray-artillery.png',
  'tray-urban-fights.png',
  'tray-chemical.png',
  'tray-nuclear.png',
  'tray-offline.png',
  'app-icon.png'
];
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
for (const icon of requiredIcons) {
  const p = path.join(iconsDir, icon);
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
    console.error(`FAIL: icon ${icon} is missing or 0 bytes`);
    process.exit(1);
  }
}
console.log(`OK: all ${requiredIcons.length} icons exist and are non-empty`);

// 1.2 Check audio presets
const requiredAudio = [
  'alert-siren.wav',
  'alert-pulse.wav',
  'alert-chime.wav',
  'alert-radar.wav',
  'alert.wav',
  'all-clear-chime.wav',
  'all-clear-bell.wav',
  'all-clear-marimba.wav',
  'all-clear-gong.wav',
  'all-clear.wav'
];
const audioDir = path.join(__dirname, '..', 'assets', 'audio');
for (const audio of requiredAudio) {
  const p = path.join(audioDir, audio);
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
    console.error(`FAIL: audio preset ${audio} is missing or 0 bytes`);
    process.exit(1);
  }
}
console.log(`OK: all ${requiredAudio.length} audio presets exist and are non-empty`);

// 2. Check config
const cfg = config.getAll();
if (!cfg.pollingInterval || !cfg.serverUrl) {
  console.error('FAIL: config defaults missing');
  process.exit(1);
}
console.log('OK: config loaded successfully');

// 3. Check API service
const state = api.getCurrentState();
if (state === undefined || state.isAlert === undefined) {
  console.error('FAIL: api state structure invalid');
  process.exit(1);
}
console.log('OK: api service initialized');

// 4. Check Autostart module
const autostart = require('../src/main/autostart');
if (typeof autostart.setAutoStart !== 'function' || typeof autostart.isEnabled !== 'function') {
  console.error('FAIL: autostart module methods missing');
  process.exit(1);
}
console.log(`OK: autostart module initialized (currently enabled: ${autostart.isEnabled()})`);

// 5. Check Updater module
const updater = require('../src/main/updater');
if (typeof updater.checkForUpdates !== 'function' || typeof updater.init !== 'function') {
  console.error('FAIL: updater module methods missing');
  process.exit(1);
}
console.log('OK: updater module initialized');

console.log('All smoke checks passed successfully!');
process.exit(0);
