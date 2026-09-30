const fs = require('fs');
const path = require('path');

/**
 * Створює буфер нестисненого 24-бітного BMP файлу
 * @param {number} width - ширина в пікселях
 * @param {number} height - висота в пікселях
 * @param {Function} pixelShader - функція (x, y) => [r, g, b], де y від 0 (верх) до height-1 (низ)
 * @returns {Buffer}
 */
function createBmp(width, height, pixelShader) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const padding = rowSize - width * 3;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;

  const buf = Buffer.alloc(fileSize);

  // --- BMP Header (14 байт) ---
  buf.write('BM', 0); // Signature
  buf.writeUInt32LE(fileSize, 2); // File size
  buf.writeUInt32LE(0, 6); // Reserved
  buf.writeUInt32LE(54, 10); // Offset to pixel data

  // --- DIB Header / BITMAPINFOHEADER (40 байт) ---
  buf.writeUInt32LE(40, 14); // Header size
  buf.writeInt32LE(width, 18); // Width
  buf.writeInt32LE(height, 22); // Height (bottom-to-top)
  buf.writeUInt16LE(1, 26); // Planes
  buf.writeUInt16LE(24, 28); // Bits per pixel (24 bit)
  buf.writeUInt32LE(0, 30); // Compression (BI_RGB)
  buf.writeUInt32LE(pixelDataSize, 34); // Image size
  buf.writeInt32LE(2835, 38); // X pixels per meter (~72 DPI)
  buf.writeInt32LE(2835, 42); // Y pixels per meter
  buf.writeUInt32LE(0, 46); // Total colors
  buf.writeUInt32LE(0, 50); // Important colors

  // --- Піксельні дані (BGR, знизу-вгору) ---
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelShader(x, y);
      buf[offset++] = b;
      buf[offset++] = g;
      buf[offset++] = r;
    }
    for (let p = 0; p < padding; p++) {
      buf[offset++] = 0;
    }
  }

  return buf;
}

function generateGraphics() {
  const outDir = path.resolve(__dirname, '..', 'assets', 'installer');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const width = 164;
  const height = 314;

  console.log('Генерація графічних банерів NSIS інсталятора (164x314)...');

  // 1. Installer Sidebar (Банер майстра встановлення: градієнт alerts.in.ua + радар/щит)
  const installerSidebar = createBmp(width, height, (x, y) => {
    const t = y / height;
    // Базовий темний благородний градієнт #16181d -> #232730
    let r = Math.round(22 + (35 - 22) * t);
    let g = Math.round(24 + (39 - 24) * t);
    let b = Math.round(29 + (48 - 29) * t);

    // Тонка бічна акцентна смуга зліва (фірмовий синьо-золотий відблиск)
    if (x < 3) {
      if (y < height * 0.5) {
        return [0, 91, 187]; // Синій
      } else {
        return [255, 213, 0]; // Золотий
      }
    }

    // Стилізовані концентричні кола радара тривоги у верхній частині
    const cx = 82;
    const cy = 95;
    const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));

    // Центральний щит / диск (радіус 28)
    if (dist <= 26) {
      // Внутрішній щит #2b303c
      const shieldGlow = Math.max(0, 1 - dist / 26);
      r = Math.min(255, Math.round(45 + 25 * shieldGlow));
      g = Math.min(255, Math.round(50 + 25 * shieldGlow));
      b = Math.min(255, Math.round(62 + 35 * shieldGlow));

      // Золотий контур щита
      if (dist >= 24 && dist <= 26) {
        return [230, 180, 40];
      }

      // Центральна піктограма трикутника/радара
      const dy = y - cy;
      const dx = Math.abs(x - cx);
      if (dy >= -10 && dy <= 10 && dx <= (10 - dy) * 0.6) {
        return [255, 220, 60];
      }
    } else {
      // Кільця радара
      const rings = [38, 52, 68, 86];
      for (const ring of rings) {
        if (Math.abs(dist - ring) < 1.0) {
          const ringAlpha = Math.max(0, 1 - ring / 95) * 0.35;
          r = Math.min(255, Math.round(r + 60 * ringAlpha));
          g = Math.min(255, Math.round(g + 90 * ringAlpha));
          b = Math.min(255, Math.round(b + 140 * ringAlpha));
        }
      }
    }

    // Нижня плашка з тонким розділювачем
    if (y === 240) {
      return [48, 54, 66];
    }

    // Легкий шум / віньєтка по краях
    const edgeVignette = Math.pow(x / width, 2) * 15;
    r = Math.max(0, Math.round(r - edgeVignette));
    g = Math.max(0, Math.round(g - edgeVignette));
    b = Math.max(0, Math.round(b - edgeVignette));

    return [r, g, b];
  });

  const installerSidebarPath = path.join(outDir, 'installerSidebar.bmp');
  fs.writeFileSync(installerSidebarPath, installerSidebar);
  console.log(`✔ Створено: ${installerSidebarPath} (${installerSidebar.length} bytes)`);

  // 2. Uninstaller Sidebar (Банер майстра деінсталяції: спокійніший темно-нейтральний тон)
  const uninstallerSidebar = createBmp(width, height, (x, y) => {
    const t = y / height;
    let r = Math.round(20 + (30 - 20) * t);
    let g = Math.round(22 + (33 - 22) * t);
    let b = Math.round(26 + (38 - 26) * t);

    // Смужка нейтрального металевого відтінку зліва
    if (x < 3) {
      return [80, 85, 95];
    }

    // Центральне коло
    const cx = 82;
    const cy = 95;
    const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));

    if (dist <= 26) {
      if (dist >= 24 && dist <= 26) {
        return [110, 115, 125];
      }
      r = 38;
      g = 42;
      b = 48;
    } else if (Math.abs(dist - 42) < 1.0 || Math.abs(dist - 60) < 1.0) {
      r += 15;
      g += 18;
      b += 22;
    }

    return [r, g, b];
  });

  const uninstallerSidebarPath = path.join(outDir, 'uninstallerSidebar.bmp');
  fs.writeFileSync(uninstallerSidebarPath, uninstallerSidebar);
  console.log(`✔ Створено: ${uninstallerSidebarPath} (${uninstallerSidebar.length} bytes)`);
}

generateGraphics();
