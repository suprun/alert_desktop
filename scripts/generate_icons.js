const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Загальні параметри круглих дисків (Full-Bleed 22px на холсті 24px)
  // r=10.8 дає діаметр 21.6px з ідеальним відступом 0.7px для згладжування без обрізання
  const icons = [
    // 1. Нормальний стан (немає тривоги / відбій) - зелений диск із великою білою галочкою
    {
      name: 'tray-normal',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#16a34a" stroke="#15803d" stroke-width="1"/>
          <path d="m7.2 12.2 3.3 3.4 6.5-6.8" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    },
    // 2. Червона тривога (загальна) - червоний диск із великим білим знаком оклику
    {
      name: 'tray-air-raid',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#dc2626" stroke="#b91c1c" stroke-width="1"/>
          <path d="M12 6.5v7.2M12 17.2v.5" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        </svg>`
    },
    // 3. Дронова загроза (БПЛА / Шахед) - жовтий диск із контрастним графітовим силуетом дельта-крила Shahed
    {
      name: 'tray-drone',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#eab308" stroke="#a16207" stroke-width="1"/>
          <path d="M12 5.8 L18.8 17.2 L14.5 15.6 L12 16.8 L9.5 15.6 L5.2 17.2 Z" fill="#0f172a"/>
          <path d="M5.2 14.8v2.4M18.8 14.8v2.4" stroke="#0f172a" stroke-width="1.3" stroke-linecap="round"/>
        </svg>`
    },
    // 4. Жовта тривога (аліас для зворотної сумісності)
    {
      name: 'tray-air-raid-yellow',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#eab308" stroke="#a16207" stroke-width="1"/>
          <path d="M12 5.8 L18.8 17.2 L14.5 15.6 L12 16.8 L9.5 15.6 L5.2 17.2 Z" fill="#0f172a"/>
          <path d="M5.2 14.8v2.4M18.8 14.8v2.4" stroke="#0f172a" stroke-width="1.3" stroke-linecap="round"/>
        </svg>`
    },
    // 5. Жовтий рівень (аліас для зворотної сумісності)
    {
      name: 'tray-yellow',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#eab308" stroke="#a16207" stroke-width="1"/>
          <path d="M12 5.8 L18.8 17.2 L14.5 15.6 L12 16.8 L9.5 15.6 L5.2 17.2 Z" fill="#0f172a"/>
          <path d="M5.2 14.8v2.4M18.8 14.8v2.4" stroke="#0f172a" stroke-width="1.3" stroke-linecap="round"/>
        </svg>`
    },
    // 6. Ракетна загроза (крилата ракета) - червоний диск із білим діагональним силуетом крилатої ракети
    {
      name: 'tray-missile',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#dc2626" stroke="#b91c1c" stroke-width="1"/>
          <g transform="translate(12, 12) rotate(-45)">
            <path d="M0 -8.5 C-1.2 -6 -1.3 -3 -1.3 7.5 L1.3 7.5 C1.3 -3 1.2 -6 0 -8.5 Z" fill="#ffffff"/>
            <path d="M-6.5 -0.5 L6.5 -0.5 L5.5 1.2 L-5.5 1.2 Z" fill="#ffffff"/>
            <path d="M-3.6 5.5 L3.6 5.5 L3 7 L-3 7 Z" fill="#ffffff"/>
          </g>
        </svg>`
    },
    // 7. Загроза балістики - темно-бордовий диск із білою вертикальною балістичною ракетою та полум'ям
    {
      name: 'tray-ballistic',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#991b1b" stroke="#7f1d1d" stroke-width="1"/>
          <path d="M12 4.2 C11.1 5.8 10.5 7.8 10.5 10.5 V15.5 H7.8 L10.5 13 V15.5 H13.5 V13 L16.2 15.5 H13.5 V10.5 C13.5 7.8 12.9 5.8 12 4.2 Z" fill="#ffffff"/>
          <path d="M11 16.5 L12 19.5 L13 16.5 L12 17.2 Z" fill="#facc15"/>
        </svg>`
    },
    // 8. Загроза КАБ / тактичної авіації - червоний диск із білим силуетом бойового літака
    {
      name: 'tray-aviation',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#dc2626" stroke="#b91c1c" stroke-width="1"/>
          <path d="M12 4.6 L13.4 9.8 L18.8 12.8 V14.2 L13.4 12.6 V16.2 L15.5 17.6 V18.6 L12 17.6 L8.5 18.6 V17.6 L10.6 16.2 V12.6 L5.2 14.2 V12.8 L10.6 9.8 Z" fill="#ffffff"/>
        </svg>`
    },
    // 9. Комбінована загроза (Ракети + Дрони) - розділений диск (червоний + жовтий)
    {
      name: 'tray-combo-missile-drone',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 1.2 A10.8 10.8 0 0 0 12 22.8 Z" fill="#dc2626" stroke="#b91c1c" stroke-width="0.8"/>
          <path d="M12 1.2 A10.8 10.8 0 0 1 12 22.8 Z" fill="#eab308" stroke="#a16207" stroke-width="0.8"/>
          <line x1="12" y1="1.2" x2="12" y2="22.8" stroke="#0f172a" stroke-width="0.8" opacity="0.35"/>
          <g transform="translate(6.6, 12) rotate(-35) scale(0.65)">
            <path d="M0 -8.5 C-1.2 -6 -1.3 -3 -1.3 7.5 L1.3 7.5 C1.3 -3 1.2 -6 0 -8.5 Z" fill="#ffffff"/>
            <path d="M-6 -0.5 L6 -0.5 L5 1.2 L-5 1.2 Z" fill="#ffffff"/>
            <path d="M-3.5 5.5 L3.5 5.5 L3 7 L-3 7 Z" fill="#ffffff"/>
          </g>
          <g transform="translate(17.2, 12) scale(0.68)">
            <path d="M0 -6.5 L6.2 5.5 L2.5 4 L0 5.2 L-2.5 4 L-6.2 5.5 Z" fill="#0f172a"/>
            <path d="M-6.2 3.2v2.3 M6.2 3.2v2.3" stroke="#0f172a" stroke-width="1.2" stroke-linecap="round"/>
          </g>
        </svg>`
    },
    // 10. Комбінована загроза (універсальний аліас)
    {
      name: 'tray-combo',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 1.2 A10.8 10.8 0 0 0 12 22.8 Z" fill="#dc2626" stroke="#b91c1c" stroke-width="0.8"/>
          <path d="M12 1.2 A10.8 10.8 0 0 1 12 22.8 Z" fill="#eab308" stroke="#a16207" stroke-width="0.8"/>
          <line x1="12" y1="1.2" x2="12" y2="22.8" stroke="#0f172a" stroke-width="0.8" opacity="0.35"/>
          <g transform="translate(6.6, 12) rotate(-35) scale(0.65)">
            <path d="M0 -8.5 C-1.2 -6 -1.3 -3 -1.3 7.5 L1.3 7.5 C1.3 -3 1.2 -6 0 -8.5 Z" fill="#ffffff"/>
            <path d="M-6 -0.5 L6 -0.5 L5 1.2 L-5 1.2 Z" fill="#ffffff"/>
            <path d="M-3.5 5.5 L3.5 5.5 L3 7 L-3 7 Z" fill="#ffffff"/>
          </g>
          <g transform="translate(17.2, 12) scale(0.68)">
            <path d="M0 -6.5 L6.2 5.5 L2.5 4 L0 5.2 L-2.5 4 L-6.2 5.5 Z" fill="#0f172a"/>
            <path d="M-6.2 3.2v2.3 M6.2 3.2v2.3" stroke="#0f172a" stroke-width="1.2" stroke-linecap="round"/>
          </g>
        </svg>`
    },
    // 11. Загроза артобстрілу - помаранчевий диск із білим спалахом вибуху
    {
      name: 'tray-artillery',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#ea580c" stroke="#c2410c" stroke-width="1"/>
          <path d="M12 5.2 L13.6 8.8 L17.5 7.2 L16 11 L19.2 12.8 L15.8 14.2 L16.8 18 L13.2 16.5 L12 20 L10.8 16.5 L7.2 18 L8.2 14.2 L4.8 12.8 L8 11 L6.5 7.2 L10.4 8.8 Z" fill="#ffffff"/>
          <circle cx="12" cy="12.5" r="2.2" fill="#ea580c"/>
        </svg>`
    },
    // 10. Вуличні бої - темно-помаранчевий диск із тактичним прицілом
    {
      name: 'tray-urban-fights',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#c2410c" stroke="#9a3412" stroke-width="1"/>
          <circle cx="12" cy="12" r="5.2" stroke="#ffffff" stroke-width="1.8"/>
          <circle cx="12" cy="12" r="1.6" fill="#ffffff"/>
          <line x1="12" y1="3.8" x2="12" y2="7.2" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="12" y1="16.8" x2="12" y2="20.2" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="3.8" y1="12" x2="7.2" y2="12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="16.8" y1="12" x2="20.2" y2="12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
        </svg>`
    },
    // 11. Хімічна небезпека - фіолетовий диск із хімічною колбою
    {
      name: 'tray-chemical',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#7c3aed" stroke="#6d28d9" stroke-width="1"/>
          <path d="M10.5 5.8 H13.5 V9 L17.2 15.8 C17.7 16.7 17 17.8 16 17.8 H8 C7 17.8 6.3 16.7 6.8 15.8 L10.5 9 Z" fill="#ffffff"/>
          <rect x="9.5" y="4.8" width="5" height="1.8" rx="0.8" fill="#ffffff"/>
          <circle cx="12" cy="14.5" r="1.2" fill="#7c3aed"/>
          <circle cx="10" cy="15.5" r="0.8" fill="#7c3aed"/>
          <circle cx="14" cy="15.2" r="0.8" fill="#7c3aed"/>
        </svg>`
    },
    // 12. Радіаційна загроза - золотавий диск із графітовим трилисником радіації
    {
      name: 'tray-nuclear',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#eab308" stroke="#a16207" stroke-width="1"/>
          <circle cx="12" cy="12" r="2.2" fill="#0f172a"/>
          <path d="M12 8.5 A4 4 0 0 1 15.46 10.5 L18.06 9 A7 7 0 0 0 12 5.5 V8.5 Z" fill="#0f172a"/>
          <path d="M14.5 13.5 A4 4 0 0 1 11.04 15.5 L11.04 18.5 A7 7 0 0 0 17.1 15 L14.5 13.5 Z" fill="#0f172a"/>
          <path d="M9.5 13.5 L6.9 15 A7 7 0 0 0 12.96 18.5 V15.5 A4 4 0 0 1 9.5 13.5 Z" fill="#0f172a"/>
        </svg>`
    },
    // 13. Офлайн (немає зв'язку) - сірий диск із перекресленою рискою
    {
      name: 'tray-offline',
      size: 32,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.8" fill="#64748b" stroke="#334155" stroke-width="1"/>
          <circle cx="12" cy="12" r="5" stroke="#ffffff" stroke-width="1.8" opacity="0.6"/>
          <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round"/>
        </svg>`
    },
    // 14. Головна іконка додатку (app-icon)
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
