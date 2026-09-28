const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fontUrls = {
  'Inter-Regular.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/cyrillic-400-normal.woff2',
  'Inter-Medium.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/cyrillic-500-normal.woff2',
  'Inter-SemiBold.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/cyrillic-600-normal.woff2',
  'Inter-Regular-latin.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff2',
  'Inter-Medium-latin.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.woff2',
  'Inter-SemiBold-latin.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.woff2'
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function run() {
  for (const [filename, url] of Object.entries(fontUrls)) {
    const dest = path.join(fontsDir, filename);
    console.log(`Downloading ${filename}...`);
    try {
      await download(url, dest);
      console.log(`Saved ${filename}`);
    } catch (err) {
      console.error(`Error downloading ${filename}:`, err.message);
    }
  }
}

run();
