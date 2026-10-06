const fs = require('fs');
const path = require('path');

const uiDir = path.join(__dirname, '..', 'assets', 'icons', 'ui');
const tabsDir = path.join(__dirname, '..', 'assets', 'icons', 'tabs');

if (!fs.existsSync(uiDir)) {
  fs.mkdirSync(uiDir, { recursive: true });
}
if (!fs.existsSync(tabsDir)) {
  fs.mkdirSync(tabsDir, { recursive: true });
}

const icons = {
  'gear': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  'play': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  'pause': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  'shield-check': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  'siren': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21h14"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 6.3 1.4-1.4"/><line x1="12" y1="2" x2="12" y2="4"/></svg>`,
  'bell': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  'bell-off': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  'volume': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  'wrench': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10h3V7L6.5 3.5a6 6 0 0 1 8 8L17 14h-3v3l3.5 3.5a6 6 0 0 1-8-8L7 10z"/></svg>`
};

const tabIcons = {
  'tab-internal': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  'tab-alertsinua': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="17" width="14" height="4" rx="1.5" stroke-width="1.8"/><path d="M6.5 17c0-3.5 2-8.5 5.5-8.5s5.5 5 5.5 8.5" stroke-width="1.8"/><path d="M10 13a2 2 0 0 1 2-2" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="4.5" y1="6" x2="6.5" y2="8"/><line x1="19.5" y1="6" x2="17.5" y2="8"/><line x1="2" y1="13.5" x2="4.5" y2="13.5"/><line x1="19.5" y1="13.5" x2="22" y2="13.5"/></svg>`,
  'tab-ukrainealarm': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5" stroke-width="1.8"/><path d="M19.97 10.85L19.86 10.24L19.47 10.34L18.16 9.89L18.08 10.12L17.42 9.44L16.84 9.8L15.83 9.74L15.3 8.64L14.59 8.7L14.42 8.14L14.69 8.05L14.04 7.21L12.95 7.34L12.74 7.74L11.77 7.81L11.36 8.86L11.11 8.58L10.43 8.76L10.27 8.44L9.94 8.74L9.5 8.38L9.06 8.66L8.54 8.27L6.95 7.93L6.17 8.02L6.13 8.29L5.5 8.51L5.85 9.78L4.6 11.07L4.72 11.84L4.48 11.73L4.0 12.61L4.59 13.19L6.17 13.36L6.48 13.71L7.69 13.36L8.28 12.8L8.98 12.72L9.74 13.26L10.05 13.18L10.47 13.53L10.41 14.14L10.75 14.21L10.79 14.77L11.38 15.45L10.28 15.39L10.27 16.06L9.59 16.77L9.72 17.01L9.99 17.15L10.66 16.85L10.99 17.13L10.87 16.42L11.01 16.66L11.66 15.94L11.36 15.54L11.7 15.88L12.24 15.18L12.06 14.54L12.4 15.21L12.67 14.88L12.54 15.17L12.9 15.16L12.96 14.63L13.04 15.14L13.43 15.25L12.59 15.25L13.09 15.43L12.83 15.63L13.55 15.86L14.55 15.67L14.68 16.07L14.17 16.18L13.56 16.75L14.53 17.04L14.52 17.81L15.07 18.04L16.5 16.91L17.35 16.88L17.48 16.37L16.37 16.61L15.7 15.58L15.74 16.01L16.38 16.7L15.93 16.63L16.04 16.4L15.63 15.92L15.37 16.12L15.54 15.86L15.08 15.91L14.68 15.54L15.42 15.54L15.39 15.86L15.97 15.08L16.13 15.35L16.1 14.78L16.28 15.11L17.11 14.62L17.43 14.74L18.11 14.03L18.6 14.03L18.75 13.21L19.12 12.8L19.96 12.69L19.72 11.45L19.93 11.3L19.62 11.15L19.97 10.85Z" fill="currentColor" stroke="none"/></svg>`,
  'tab-neptun': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2.5L13.7 5.8L13.3 15.5L15.8 15.5L15.8 8.4L18.5 5.8L18.5 14.1C18.5 16.6 16.5 18.5 13.5 18.5L13.5 21L10.5 21L10.5 18.5C7.5 18.5 5.5 16.6 5.5 14.1L5.5 5.8L8.2 8.4L8.2 15.5L10.7 15.5L10.3 5.8Z"/></svg>`
};

for (const [name, svg] of Object.entries(icons)) {
  fs.writeFileSync(path.join(uiDir, `${name}.svg`), svg.trim());
}

for (const [name, svg] of Object.entries(tabIcons)) {
  fs.writeFileSync(path.join(tabsDir, `${name}.svg`), svg.trim());
  fs.writeFileSync(path.join(uiDir, `${name}.svg`), svg.trim());
}

console.log('UI and Tab icons generated successfully.');
