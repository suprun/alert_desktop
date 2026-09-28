const { app } = require('electron');
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

console.log('All smoke checks passed successfully!');
process.exit(0);
