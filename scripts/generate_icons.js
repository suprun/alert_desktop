const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const icons = [
    // 1. Нормальний стан (немає тривоги) - зелений щит із галочкою
    {
      name: 'tray-normal',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 21s7-3.5 7-9V5.5l-7-2.5-7 2.5V12c0 5.5 7 9 7 9z" fill="#22c55e" stroke="#15803d" stroke-width="1.2"/>
          <path d="m9 11.5 2 2 4-4" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    },
    // 2. Червона тривога (alert_level: red) - яскраво-червоний щит із білим знаком оклику
    {
      name: 'tray-air-raid',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 21s7-3.5 7-9V5.5l-7-2.5-7 2.5V12c0 5.5 7 9 7 9z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.2"/>
          <path d="M12 7.5v6M12 16.5v.5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
        </svg>`
    },
    // 3. Жовта тривога (alert_level: yellow) - насичений жовтий щит із контрастним темним знаком оклику
    {
      name: 'tray-air-raid-yellow',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 21s7-3.5 7-9V5.5l-7-2.5-7 2.5V12c0 5.5 7 9 7 9z" fill="#eab308" stroke="#a16207" stroke-width="1.2"/>
          <path d="M12 7.5v6M12 16.5v.5" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
        </svg>`
    },
    // 4. Жовтий рівень загрози (альтернативна універсальна назва)
    {
      name: 'tray-yellow',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 21s7-3.5 7-9V5.5l-7-2.5-7 2.5V12c0 5.5 7 9 7 9z" fill="#eab308" stroke="#a16207" stroke-width="1.2"/>
          <path d="M12 7.5v6M12 16.5v.5" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
        </svg>`
    },
    // 5. Загроза артобстрілу (artillery_shelling) - помаранчевий вибух
    {
      name: 'tray-artillery',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.5" fill="#f59e0b" stroke="#b45309" stroke-width="1.2"/>
          <path d="M12 5l1.5 4.5H18l-3.8 2.8 1.4 4.5L12 14l-3.6 2.8 1.4-4.5L6 9.5h4.5z" fill="#ffffff"/>
        </svg>`
    },
    // 6. Вуличні бої (urban_fights) - темно-помаранчевий приціл
    {
      name: 'tray-urban-fights',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.5" fill="#ea580c" stroke="#9a3412" stroke-width="1.2"/>
          <circle cx="12" cy="12" r="4.5" stroke="#ffffff" stroke-width="1.5"/>
          <line x1="12" y1="4" x2="12" y2="7.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="16.5" x2="12" y2="20" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <line x1="4" y1="12" x2="7.5" y2="12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <line x1="16.5" y1="12" x2="20" y2="12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        </svg>`
    },
    // 7. Хімічна небезпека (chemical) - фіолетовий трикутник
    {
      name: 'tray-chemical',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l9 16H3z" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M10 9v4a2 2 0 1 0 4 0V9h-4z" fill="#ffffff"/>
          <line x1="10" y1="9" x2="14" y2="9" stroke="#ffffff" stroke-width="1.5"/>
        </svg>`
    },
    // 8. Радіаційна загроза (nuclear) - золотавий трилисник радіації
    {
      name: 'tray-nuclear',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.5" fill="#eab308" stroke="#a16207" stroke-width="1.2"/>
          <circle cx="12" cy="12" r="2" fill="#0f172a"/>
          <path d="M12 8.5a4 4 0 0 1 3.46 2l2.6-1.5a7 7 0 0 0-6.06-3.5v3z" fill="#0f172a"/>
          <path d="M14.5 13.5a4 4 0 0 1-3.46 2v3a7 7 0 0 0 6.06-3.5l-2.6-1.5z" fill="#0f172a"/>
          <path d="M9.5 13.5l-2.6 1.5A7 7 0 0 0 13 18.5v-3a4 4 0 0 1-3.5-2z" fill="#0f172a"/>
        </svg>`
    },
    // 9. Офлайн (offline) - нейтрально-сірий перекреслений круг
    {
      name: 'tray-offline',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.5" fill="#64748b" stroke="#334155" stroke-width="1.2"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
        </svg>`
    },
    // 10. Головна іконка додатку (app-icon)
    {
      name: 'app-icon',
      size: 128,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
          <rect width="128" height="128" rx="28" fill="#0f172a"/>
          <rect x="4" y="4" width="120" height="120" rx="24" stroke="#1e293b" stroke-width="2"/>
          <path d="M64 104s36-18 36-46V32L64 18 28 32v26c0 28 36 46 36 46z" fill="#0078d4" stroke="#38bdf8" stroke-width="3"/>
          <path d="m48 62 12 12 24-24" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    }
  ];

  const win = new BrowserWindow({
    show: false,
    width: 200,
    height: 200,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true }
  });

  const baseHtmlPath = path.join(__dirname, 'icon_base.html');
  fs.writeFileSync(baseHtmlPath, '<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;"></body></html>');
  await win.loadFile(baseHtmlPath);

  for (const item of icons) {
    const cleanSvg = item.svg.trim().replace(/\r?\n\s*/g, ' ');
    await win.webContents.executeJavaScript(`
      document.body.innerHTML = \`${cleanSvg}\`;
    `);

    await new Promise(r => setTimeout(r, 100));

    const image = await win.webContents.capturePage({ x: 0, y: 0, width: item.size, height: item.size });
    const pngBuffer = image.toPNG();

    fs.writeFileSync(path.join(iconsDir, `${item.name}.png`), pngBuffer);
    fs.writeFileSync(path.join(iconsDir, `${item.name}.svg`), item.svg.trim());
    console.log(`Generated ${item.name}.png (${pngBuffer.length} bytes) and .svg`);
  }

  win.destroy();
  if (fs.existsSync(baseHtmlPath)) fs.unlinkSync(baseHtmlPath);

  app.quit();
});
