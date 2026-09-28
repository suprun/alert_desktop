const fs = require('fs');
const path = require('path');
const https = require('https');

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1XnTOzcPHd1LZUrarR1Fk43FUyl8Ae6a6M7pcwDRjNdA/export?format=csv&gid=0';
const LOCAL_FALLBACK = path.join('C:', 'Users', 'User', '.gemini', 'antigravity-ide', 'brain', 'ef680d5d-7b41-41d7-a340-86e237c99a2c', '.system_generated', 'steps', '131', 'content.md');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'main', 'locations.json');

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP status: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function run() {
  console.log('Fetching locations CSV from Google Spreadsheets...');
  let csvText = '';
  try {
    csvText = await fetchCSV(SPREADSHEET_URL);
  } catch (err) {
    console.warn(`Online fetch error (${err.message}), using cached download...`);
    if (fs.existsSync(LOCAL_FALLBACK)) {
      csvText = fs.readFileSync(LOCAL_FALLBACK, 'utf8');
    } else {
      throw err;
    }
  }

  const lines = csvText.split(/\r?\n/);
  const locations = [];
  let headerFound = false;

  let currentOblast = null;
  let currentRaion = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = parseCSVLine(trimmed);
    if (!headerFound) {
      if (parts[0] === 'UID' && parts[1] === 'Назва') {
        headerFound = true;
      }
      continue;
    }

    const uid = parts[0];
    const title = parts[1];
    const type = parts[2] || '';
    const notes = parts[3] || '';

    // Valid entry must have a numeric UID and non-empty title
    if (uid && /^\d+$/.test(uid) && title) {
      let itemOblastUid = null;
      let itemOblastTitle = null;
      let itemRaionUid = null;
      let itemRaionTitle = null;

      if (type.includes('спеціальним') || type === 'Область') {
        if (uid === '29' && currentOblast && currentOblast.uid === '8') {
          // Автономна Республіка Крим (ряд. 7) розміщена між Волинською обл. та її районами
          itemOblastUid = uid;
          itemOblastTitle = title;
        } else {
          currentOblast = { uid, title };
          currentRaion = null;
          itemOblastUid = uid;
          itemOblastTitle = title;
        }
      } else if (type === 'Район') {
        currentRaion = { uid, title };
        itemOblastUid = currentOblast ? currentOblast.uid : null;
        itemOblastTitle = currentOblast ? currentOblast.title : null;
        itemRaionUid = uid;
        itemRaionTitle = title;
      } else if (type === 'Громада') {
        itemOblastUid = currentOblast ? currentOblast.uid : null;
        itemOblastTitle = currentOblast ? currentOblast.title : null;
        itemRaionUid = currentRaion ? currentRaion.uid : null;
        itemRaionTitle = currentRaion ? currentRaion.title : null;
      }

      locations.push({
        uid: String(uid),
        title,
        type,
        oblastUid: itemOblastUid,
        oblastTitle: itemOblastTitle,
        raionUid: itemRaionUid,
        raionTitle: itemRaionTitle,
        notes: notes || undefined
      });
    }
  }

  // Sort locations:
  // 1. "Місто з спеціальним статусом" and "Область" first
  // 2. "Район" second
  // 3. "Громада" third
  // Alphabetically within each group
  const typeWeight = (t) => {
    if (t.includes('спеціальним') || t === 'Область') return 1;
    if (t === 'Район') return 2;
    if (t === 'Громада') return 3;
    return 4;
  };

  locations.sort((a, b) => {
    const wA = typeWeight(a.type);
    const wB = typeWeight(b.type);
    if (wA !== wB) return wA - wB;
    return a.title.localeCompare(b.title, 'uk');
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(locations, null, 2), 'utf8');
  console.log(`Successfully parsed and saved ${locations.length} locations to ${OUTPUT_FILE}`);
}

run().catch(err => {
  console.error('Error parsing locations:', err);
  process.exit(1);
});
