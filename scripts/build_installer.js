const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '1.0.0';

const args = process.argv.slice(2);
let mode = 'win';

if (args.includes('--msix-x64')) mode = 'msix-x64';
else if (args.includes('--msix-arm64')) mode = 'msix-arm64';
else if (args.includes('--msix')) mode = 'msix';
else if (args.includes('--portable-x64')) mode = 'portable-x64';
else if (args.includes('--portable-arm64')) mode = 'portable-arm64';
else if (args.includes('--portable')) mode = 'portable';
else if (args.includes('--snap-x64')) mode = 'snap-x64';
else if (args.includes('--snap-arm64')) mode = 'snap-arm64';
else if (args.includes('--snap')) mode = 'snap';
else if (args.includes('--flatpak-x64')) mode = 'flatpak-x64';
else if (args.includes('--flatpak-arm64')) mode = 'flatpak-arm64';
else if (args.includes('--flatpak')) mode = 'flatpak';
else if (args.includes('--web')) mode = 'web';
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

function ensureAppxAssets() {
  const storeLogoPath = path.join(rootDir, 'build', 'appx', 'StoreLogo.png');
  if (!fs.existsSync(storeLogoPath)) {
    console.log('1.1. Генерація AppX/MSIX візуальних ресурсів у build/appx/...');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    spawnSync(npxCmd, ['electron', 'scripts/generate_appx_assets.js'], { cwd: rootDir, stdio: 'inherit', shell: true });
  } else {
    console.log('1.1. AppX/MSIX ресурси наявні у build/appx/.');
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
    case 'msix': {
      ensureWindowsIcon();
      ensureAppxAssets();
      console.log('\n2. Компіляція Windows MSIX пакетів для Microsoft Store (x64 + ARM64)...');
      runBuilder(['--win', '--target', 'appx', '--x64', '--arm64']);
      break;
    }
    case 'msix-x64': {
      ensureWindowsIcon();
      ensureAppxAssets();
      console.log('\n2. Компіляція Windows x64 MSIX пакета для Microsoft Store...');
      runBuilder(['--win', '--target', 'appx', '--x64']);
      break;
    }
    case 'msix-arm64': {
      ensureWindowsIcon();
      ensureAppxAssets();
      console.log('\n2. Компіляція Windows ARM64 MSIX пакета для Microsoft Store...');
      runBuilder(['--win', '--target', 'appx', '--arm64']);
      break;
    }
    case 'portable': {
      ensureWindowsIcon();
      console.log('\n2. Компіляція Windows Portable (.exe без встановлення, x64 + ARM64)...');
      runBuilder(['--win', '--target', 'portable', '--x64', '--arm64']);
      break;
    }
    case 'portable-x64': {
      ensureWindowsIcon();
      console.log('\n2. Компіляція Windows x64 Portable (.exe)...');
      runBuilder(['--win', '--target', 'portable', '--x64']);
      break;
    }
    case 'portable-arm64': {
      ensureWindowsIcon();
      console.log('\n2. Компіляція Windows ARM64 Portable (.exe)...');
      runBuilder(['--win', '--target', 'portable', '--arm64']);
      break;
    }
    case 'snap': {
      console.log('\n2. Компіляція Snap пакетів для Linux (amd64 + arm64)...');
      runBuilder(['--linux', '--target', 'snap', '--x64', '--arm64']);
      break;
    }
    case 'snap-x64': {
      console.log('\n2. Компіляція Snap пакета для Linux (amd64)...');
      runBuilder(['--linux', '--target', 'snap', '--x64']);
      break;
    }
    case 'snap-arm64': {
      console.log('\n2. Компіляція Snap пакета для Linux (arm64)...');
      runBuilder(['--linux', '--target', 'snap', '--arm64']);
      break;
    }
    case 'flatpak': {
      console.log('\n2. Компіляція Flatpak пакетів для Linux (x64 + arm64)...');
      runBuilder(['--linux', '--target', 'flatpak', '--x64', '--arm64']);
      break;
    }
    case 'flatpak-x64': {
      console.log('\n2. Компіляція Flatpak пакета для Linux (x64)...');
      runBuilder(['--linux', '--target', 'flatpak', '--x64']);
      break;
    }
    case 'flatpak-arm64': {
      console.log('\n2. Компіляція Flatpak пакета для Linux (arm64)...');
      runBuilder(['--linux', '--target', 'flatpak', '--arm64']);
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
