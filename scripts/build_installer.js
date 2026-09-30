const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '1.0.0';

async function build() {
  console.log(`=== Збірка NSIS інсталятора AlertDesktop v${version} ===\n`);

  // 1. Перевірка наявності Windows ICO іконки
  const icoPath = path.join(rootDir, 'assets', 'icons', 'app-icon.ico');
  if (!fs.existsSync(icoPath)) {
    console.log('1. Генерація assets/icons/app-icon.ico...');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    spawnSync(npxCmd, ['electron', 'scripts/generate_ico.js'], { cwd: rootDir, stdio: 'inherit', shell: true });
  } else {
    console.log('1. Windows ICO іконка наявна.');
  }

  // 2. Компіляція NSIS інсталятора через electron-builder
  console.log('\n2. Компіляція NSIS інсталятора через electron-builder...');
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const buildResult = spawnSync(npxCmd, ['electron-builder', '--win', '--x64'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });

  if (buildResult.status !== 0) {
    console.error('ПОМИЛКА: Збірка інсталятора через electron-builder завершилася з помилкою.');
    process.exit(buildResult.status || 1);
  }

  const setupExePath = path.join(rootDir, 'dist', `AlertDesktop-Setup-v${version}.exe`);
  if (fs.existsSync(setupExePath)) {
    const sizeMb = (fs.statSync(setupExePath).size / (1024 * 1024)).toFixed(2);
    console.log(`\n========================================`);
    console.log(`УСПІХ! NSIS інсталятор успішно створено:`);
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
