const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'assets', 'icons', 'app-icon.svg');
const pngPath = path.join(rootDir, 'assets', 'icons', 'app-icon.png');
const icoPath = path.join(rootDir, 'assets', 'icons', 'app-icon.ico');

app.whenReady().then(async () => {
  try {
    console.log('1. Читання SVG іконки:', svgPath);
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    // Створюємо offscreen BrowserWindow розміром 512x512
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        offscreen: true
      }
    });

    // Завантажуємо SVG як Data URL
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
    await win.loadURL(svgDataUrl);

    // Знімаємо сторінку у високій роздільності
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
    const pngBuffer = image.toPNG();
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`[✓] Створено ${pngPath} (розмір: 512x512, вага: ${pngBuffer.length} байт)`);

    win.destroy();

    // 2. Генерація ICO з різними роздільностями (16..256px)
    console.log('2. Генерація ICO файлу:', icoPath);
    const baseImg = nativeImage.createFromBuffer(pngBuffer);
    const sizes = [16, 32, 48, 64, 128, 256];
    const images = [];

    for (const size of sizes) {
      const resized = baseImg.resize({ width: size, height: size, quality: 'best' });
      images.push({
        size,
        buffer: resized.toPNG()
      });
    }

    const count = images.length;
    const headerSize = 6;
    const dirEntrySize = 16;
    let offset = headerSize + (count * dirEntrySize);

    const entries = [];
    for (const img of images) {
      const entry = Buffer.alloc(dirEntrySize);
      entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width
      entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
      entry.writeUInt8(0, 2); // color count
      entry.writeUInt8(0, 3); // reserved
      entry.writeUInt16LE(1, 4); // planes
      entry.writeUInt16LE(32, 6); // bit count
      entry.writeUInt32LE(img.buffer.length, 8); // bytes
      entry.writeUInt32LE(offset, 12); // image offset
      entries.push(entry);
      offset += img.buffer.length;
    }

    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // image type (1 = icon)
    header.writeUInt16LE(count, 4); // count of images

    const icoBuffer = Buffer.concat([header, ...entries, ...images.map(img => img.buffer)]);
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`[✓] Створено ${icoPath} (роздільності: 16..256px, вага: ${icoBuffer.length} байт)`);

    console.log('\nУСПІХ: Іконки оновлено.');
    app.exit(0);
  } catch (err) {
    console.error('Помилка при генерації іконок:', err);
    app.exit(1);
  }
});
