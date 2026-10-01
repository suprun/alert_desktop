const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '1.0.0';

const args = process.argv.slice(2);
let mode = 'win';

if (args.includes('--web')) mode = 'web';
else if (args.includes('--linux')) mode = 'linux';
else if (args.includes('--mac')) mode = 'mac';
else if (args.includes('--all')) mode = 'all';
else if (args.includes('--win-x64')) mode = 'win-x64';
else if (args.includes('--win-arm64')) mode = 'win-arm64';
else if (args.includes('--win')) mode = 'win';

function ensureWindowsIcon() {
  const icoPath = path.join(rootDir, 'assets', 'icons', 'app-icon.ico');
  if (!fs.existsSync(icoPath)) {
    console.log('1. Генерація assets/icons/app-icon.ico...');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    spawnSync(npxCmd, ['electron', 'scripts/generate_ico.js'], { cwd: rootDir, stdio: 'inherit', shell: true });
  } else {
    console.log('1. Windows ICO іконка наявна.');
  }
}

function runBuilder(builderArgs) {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  console.log(`\nВиконання: npx electron-builder ${builderArgs.join(' ')}`);
  const res = spawnSync(npxCmd, ['electron-builder', ...builderArgs], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });
  if (res.status !== 0) {
    console.error(`ПОМИЛКА: Збірка [${builderArgs.join(' ')}] завершилася з кодом ${res.status}`);
    process.exit(res.status || 1);
  }
}

async function build() {
  console.log(`=== Збірка дистрибутивів AlertDesktop v${version} (режим: ${mode}) ===\n`);

  switch (mode) {
    case 'win': {
      ensureWindowsIcon();
      console.log('\n2. Компіляція Windows інсталяторів (Universal + x64 + ARM64 + Web)...');
      runBuilder(['--win']);
      break;
    }
    case 'win-x64': {
      ensureWindowsIcon();
      console.log('\n2. Компіляція Windows x64 інсталятора...');
      runBuilder(['--win', '--x64']);
      break;
    }
    case 'win-arm64': {
      ensureWindowsIcon();
      console.log('\n2. Компіляція Windows ARM64 інсталятора...');
      runBuilder(['--win', '--arm64']);
      break;
    }
    case 'web': {
      ensureWindowsIcon();
      console.log('\n2. Компіляція Windows NSIS Web-інсталятора...');
      runBuilder(['--win', '--target', 'nsis-web']);
      break;
    }
    case 'linux': {
      console.log('\n2. Компіляція дистрибутивів Linux (AppImage + DEB)...');
      runBuilder(['--linux']);
      break;
    }
    case 'mac': {
      if (process.platform !== 'darwin') {
        console.warn('\n⚠️  УВАГА: Компіляція валідних macOS DMG/PKG вимагає середовища macOS.');
        console.warn('   Збірка під macOS автоматично налаштована через GitHub Actions (.github/workflows/release.yml)');
        console.warn('   на офіційному раннері macos-latest з підтримкою True Universal binary.\n');
      }
      runBuilder(['--mac']);
      break;
    }
    case 'all': {
      ensureWindowsIcon();
      if (process.platform === 'win32') {
        console.log('\nЗбірка для Windows та спроба збірки для Linux...');
        runBuilder(['--win']);
        runBuilder(['--linux']);
      } else if (process.platform === 'darwin') {
        runBuilder(['--mac']);
      } else {
        runBuilder(['--linux']);
      }
      break;
    }
  }

  console.log(`\n========================================`);
  console.log(`УСПІХ! Збірка для режиму '${mode}' завершена.`);
  console.log(`Артефакти розміщено у папці: dist/`);
  console.log(`========================================\n`);
}

build().catch((err) => {
  console.error('Непередбачена помилка збірки:', err);
  process.exit(1);
});
