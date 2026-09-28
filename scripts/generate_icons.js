const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Linear SVG definitions
  const svgs = {
    'tray-normal': `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>`,
    'tray-air-raid': `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`,
    'tray-artillery': `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`,
    'tray-offline': `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>`,
    'app-icon': `
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#0f172a" stroke="#334155"/>
        <path d="M12 18s5-2.5 5-6.5V7l-5-2-5 2v4.5c0 4 5 6.5 5 6.5z" stroke="#38bdf8" stroke-width="1.6"/>
        <path d="m10 11.5 1.5 1.5 3-3" stroke="#38bdf8" stroke-width="1.6"/>
      </svg>`
  };

  for (const [name, svg] of Object.entries(svgs)) {
    // Save SVG file
    fs.writeFileSync(path.join(iconsDir, `${name}.svg`), svg.trim());
    
    // Convert to PNG using Electron nativeImage
    const buffer = Buffer.from(svg.trim());
    const image = nativeImage.createFromBuffer(buffer);
    fs.writeFileSync(path.join(iconsDir, `${name}.png`), image.toPNG());
    console.log(`Generated ${name}.svg and ${name}.png`);
  }

  app.quit();
});
