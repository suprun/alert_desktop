const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  try {
    const pngPath = path.join(__dirname, '..', 'assets', 'icons', 'app-icon.png');
    const icoPath = path.join(__dirname, '..', 'assets', 'icons', 'app-icon.ico');

    if (!fs.existsSync(pngPath)) {
      console.error('Source icon not found:', pngPath);
      process.exit(1);
    }

    const baseImg = nativeImage.createFromPath(pngPath);
    const sizes = [16, 32, 48, 64, 128, 256];
    const images = [];

    for (const size of sizes) {
      const resized = baseImg.resize({ width: size, height: size, quality: 'best' });
      images.push({
        size,
        buffer: resized.toPNG()
      });
    }

    // Створюємо бінарний буфер ICO формату
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
      entry.writeUInt32LE(img.buffer.length, 8); // bytes in res
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
    console.log(`OK: Generated ${icoPath} with ${count} resolutions (16..256px), size: ${icoBuffer.length} bytes`);
    process.exit(0);
  } catch (err) {
    console.error('Error generating ICO:', err);
    process.exit(1);
  }
});
