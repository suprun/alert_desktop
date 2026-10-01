const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const tag = `v${version}`;

console.log('====================================================');
console.log(` Ініціалізація випуску релізу AlertDesktop ${tag}`);
console.log('====================================================\n');

// 1. Перевірка незбережених змін у git
try {
  const status = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' }).trim();
  if (status) {
    console.warn('⚠️  УВАГА: У робочій директорії є незакомічені зміни:');
    console.warn(status);
    console.warn('\nРекомендується спочатку закомітити всі зміни перед створенням тегу релізу.\n');
  }
} catch (e) {
  console.warn('Не вдалося перевірити git status:', e.message);
}

// 2. Перевірка наявності такого тегу
try {
  const existingTags = execSync(`git tag -l "${tag}"`, { cwd: rootDir, encoding: 'utf8' }).trim();
  if (existingTags === tag) {
    console.log(`[*] Тег ${tag} вже існує.`);
  } else {
    console.log(`[+] Створення анотованого тегу: ${tag}...`);
    execSync(`git tag -a "${tag}" -m "Release ${tag}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`[✓] Тег ${tag} успішно створено.`);
  }
} catch (e) {
  console.error(`[-] Помилка при створенні тегу ${tag}:`, e.message);
  process.exit(1);
}

// 3. Відправка тегу на GitHub
try {
  console.log(`\n[+] Відправка тегу ${tag} у віддалений репозиторій origin...`);
  execSync(`git push origin "${tag}"`, { cwd: rootDir, stdio: 'inherit' });
  console.log(`\n====================================================`);
  console.log(`[✓] ТЕГ ${tag} УСПІШНО ОПУБЛІКОВАНО НА GITHUB!`);
  console.log('====================================================');
  console.log('GitHub Actions автоматично розпочав мультиплатформенну');
  console.log('збірку інсталяторів (Windows, macOS, Linux) у хмарі:');
  console.log('  👉 Переглянути статус збірки: https://github.com/suprun/alert_desktop/actions');
  console.log('  👉 Сторінка релізів:          https://github.com/suprun/alert_desktop/releases');
  console.log('====================================================\n');
} catch (e) {
  console.error(`\n[-] Не вдалося відправити тег на GitHub:`, e.message);
  console.error(`Ви можете відправити його вручну командою: git push origin ${tag}`);
  process.exit(1);
}
