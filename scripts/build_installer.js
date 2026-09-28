const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { packager } = require('@electron/packager');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '1.0.0';

async function build() {
  console.log(`=== Збірка інсталятора AlertDesktop v${version} ===\n`);

  // 1. Пошук компілятора Inno Setup 6 (ISCC.exe)
  function findISCC() {
    const candidatePaths = [
      'iscc',
      'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
      'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
      'C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe',
      'C:\\Program Files\\Inno Setup 5\\ISCC.exe'
    ];

    for (const candidate of candidatePaths) {
      try {
        const res = spawnSync(candidate, ['/?'], { stdio: 'ignore' });
        if (res.status === 0 || res.status === 1) {
          return candidate;
        }
      } catch (_) {}
    }
    return null;
  }

  const isccPath = findISCC();
  if (!isccPath) {
    console.error('ПОМИЛКА: Inno Setup компилятор (ISCC.exe) не знайдено!');
    console.error('Будь ласка, завантажте та встановіть Inno Setup 6: https://jrsoftware.org/isdl.php');
    process.exit(1);
  }
  console.log(`1. Inno Setup знайдено: ${isccPath}`);

  // 2. Перевірка наявності Windows ICO іконки
  const icoPath = path.join(rootDir, 'assets', 'icons', 'app-icon.ico');
  if (!fs.existsSync(icoPath)) {
    console.log('2. Генерація assets/icons/app-icon.ico...');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    spawnSync(npxCmd, ['electron', 'scripts/generate_ico.js'], { cwd: rootDir, stdio: 'inherit', shell: true });
  } else {
    console.log('2. Windows ICO іконка наявна.');
  }

  // 3. Пакування Electron застосунку (розпакований win32-x64)
  console.log('3. Пакування Electron додатку через @electron/packager API...');
  try {
    const appPaths = await packager({
      dir: rootDir,
      name: 'AlertDesktop',
      platform: 'win32',
      arch: 'x64',
      out: path.join(rootDir, 'dist', 'unpacked'),
      overwrite: true,
      asar: true,
      icon: icoPath,
      ignore: [
        /^\/dist($|\/)/,
        /^\/scripts($|\/)/,
        /^\/installer($|\/)/,
        /^\/\.git($|\/)/,
        /^\/\.env($|\/)/
      ]
    });
    console.log(`Пакування завершено успішно: ${appPaths[0]}`);
  } catch (err) {
    console.error('ПОМИЛКА пакування Electron додатку:', err.message);
    process.exit(1);
  }

  // 4. Компіляція інсталятора через Inno Setup
  console.log('\n4. Компіляція інсталятора через Inno Setup...');
  const issFile = path.join(rootDir, 'installer', 'setup.iss');
  const isccArgs = [`/DAppVersion=${version}`, issFile];

  const isccResult = spawnSync(isccPath, isccArgs, { cwd: rootDir, stdio: 'inherit' });
  if (isccResult.status !== 0) {
    console.error('ПОМИЛКА: Збірка інсталятора Inno Setup завершилася з помилкою.');
    process.exit(1);
  }

  const setupExePath = path.join(rootDir, 'dist', `AlertDesktop-Setup-v${version}.exe`);
  if (fs.existsSync(setupExePath)) {
    const sizeMb = (fs.statSync(setupExePath).size / (1024 * 1024)).toFixed(2);
    console.log(`\n========================================`);
    console.log(`УСПІХ! Інсталятор успішно створено:`);
    console.log(`Файл: ${setupExePath}`);
    console.log(`Розмір: ${sizeMb} MB`);
    console.log(`========================================\n`);
  } else {
    console.log(`\nІнсталятор успішно створено у папці dist/`);
  }
}

build().catch((err) => {
  console.error('Непередбачена помилка збірки:', err);
  process.exit(1);
});
