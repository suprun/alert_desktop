const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pngPath = path.join(rootDir, 'assets', 'icons', 'app-icon.png');
const outDir = path.join(rootDir, 'build', 'appx');

app.whenReady().then(async () => {
  try {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    console.log('1. Завантаження базової іконки:', pngPath);
    const baseImg = nativeImage.createFromPath(pngPath);

    // 1. Генерація квадратних тайлів через nativeImage.resize (найвища якість без GPU навантаження)
    const squareSizes = [
      { name: 'StoreLogo.png', size: 50 },
      { name: 'Square44x44Logo.png', size: 44 },
      { name: 'Square150x150Logo.png', size: 150 },
      { name: 'Square310x310Logo.png', size: 310 }
    ];

    for (const item of squareSizes) {
      const resized = baseImg.resize({ width: item.size, height: item.size, quality: 'best' });
      const targetPath = path.join(outDir, item.name);
      fs.writeFileSync(targetPath, resized.toPNG());
      console.log(`[✓] Створено ${item.name} (${item.size}x${item.size})`);
    }

    // 2. Генерація прямокутних тайлів (Wide310x150 та SplashScreen) через один BrowserWindow
    console.log('2. Генерація прямокутних тайлів (Wide та Splash)...');
    const base64Png = baseImg.toPNG().toString('base64');
    const dataUri = `data:image/png;base64,${base64Png}`;

    const win = new BrowserWindow({
      width: 700,
      height: 400,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        offscreen: true
      }
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: transparent; }
    #wide {
      width: 310px;
      height: 150px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #wide img {
      width: 120px;
      height: 120px;
    }
    #splash {
      width: 620px;
      height: 300px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #splash img {
      width: 180px;
      height: 180px;
    }
  </style>
</head>
<body>
  <div id="wide"><img src="${dataUri}" /></div>
  <div id="splash"><img src="${dataUri}" /></div>
</body>
</html>`;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Захоплення Wide310x150Logo
    const wideCapture = await win.webContents.capturePage({ x: 0, y: 0, width: 310, height: 150 });
    fs.writeFileSync(path.join(outDir, 'Wide310x150Logo.png'), wideCapture.toPNG());
    console.log('[✓] Створено Wide310x150Logo.png (310x150)');

    // Захоплення SplashScreen (знаходиться під блоком wide)
    const splashCapture = await win.webContents.capturePage({ x: 0, y: 150, width: 620, height: 300 });
    fs.writeFileSync(path.join(outDir, 'SplashScreen.png'), splashCapture.toPNG());
    console.log('[✓] Створено SplashScreen.png (620x300)');

    win.destroy();
    console.log('Усі ресурси AppX/MSIX успішно згенеровано у build/appx/');
    app.exit(0);
  } catch (err) {
    console.error('Помилка генерації AppX ресурсів:', err);
    app.exit(1);
  }
});
