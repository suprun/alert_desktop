const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(rootDir, ...parts), 'utf8');

const mainHtml = read('src', 'renderer', 'main', 'index.html');
const settingsHtml = read('src', 'renderer', 'settings', 'settings.html');
const mainRenderer = read('src', 'renderer', 'main', 'renderer.js');
const settingsRenderer = read('src', 'renderer', 'settings', 'settings.js');
const settingsCss = read('src', 'renderer', 'settings', 'settings.css');
const iconsCss = read('src', 'renderer', 'shared', 'icons.css');
const preloadMap = read('src', 'preload', 'preload-map.js');
const windowManager = read('src', 'main', 'window.js');
const docsHtml = read('docs', 'index.html');
const docsApp = read('docs', 'app.js');
const docsCss = read('docs', 'style.css');

assert.strictEqual((mainHtml.match(/<svg\b/g) || []).length, 1, 'У головному HTML дозволено лише кореневий SVG інтерактивної карти');
assert.ok(mainHtml.includes('<svg id="ukraineVectorSvg"'), 'Єдиний inline SVG має бути інтерактивною картою України');
assert.ok(!/<svg\b/.test(settingsHtml), 'У settings.html не повинно бути inline SVG');

assert.strictEqual((docsHtml.match(/<svg\b/g) || []).length, 1, 'GitHub Pages HTML may only keep the interactive map SVG inline');
assert.ok(docsHtml.includes('class="ukraine-admin-map"'), 'The remaining GitHub Pages inline SVG must be the interactive Ukraine map');
assert.ok(!/<svg\b|data:image\/svg/i.test(docsApp), 'GitHub Pages JavaScript must not contain inline SVG geometry');
assert.ok(docsHtml.includes('topbar-macos-left') && docsHtml.includes('topbar-linux-left'), 'GitHub Pages must contain separate macOS and Linux top bars');
assert.ok(docsHtml.includes('linux-window-title') && docsHtml.includes('linux-window-controls'), 'Linux mockup must contain a GNOME title and right-side window controls');
assert.ok(docsCss.includes('.os-linux .desktop-toast-card') && docsCss.includes('transform: translate(-50%, -18px)'), 'Linux notification must be positioned at the top center');
assert.ok(docsCss.includes('.os-macos .desktop-toast-card') && docsCss.includes('right: 20px'), 'macOS notification must remain in the top-right corner');
assert.ok(!/\.os-macos \.desktop-toast-card,\s*\.os-linux \.desktop-toast-card/.test(docsCss), 'macOS and Linux toast positioning must not share one rule');

for (const iconName of [
  'network-wireless', 'volume-system', 'power-system',
  'window-minimize', 'window-maximize', 'window-close',
  'microsoft-store', 'snap-store', 'flathub'
]) {
  assert.ok(docsHtml.includes(`icon-${iconName}`), `GitHub Pages markup must use the GNOME icon ${iconName}`);
}

const storeLinks = [
  'https://apps.microsoft.com/search?query=AlertDesktop',
  'https://snapcraft.io/alert-desktop',
  'https://flathub.org/apps/ua.in.alerts.desktop'
];
for (const storeUrl of storeLinks) {
  const escapedUrl = storeUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.ok(new RegExp(`<a[^>]+href="${escapedUrl}"[^>]+target="_blank"[^>]+rel="noopener noreferrer"`).test(docsHtml), `${storeUrl} must open safely in a new tab`);
  assert.ok(docsApp.includes(storeUrl), `${storeUrl} must be available to the OS-aware hero CTA`);
}

assert.ok(docsHtml.includes('sudo snap install alert-desktop'), 'Linux card must show the Snap installation command');
assert.ok(docsHtml.includes('flatpak install flathub ua.in.alerts.desktop'), 'Linux card must show the Flathub installation command');
assert.strictEqual((docsHtml.match(/platform-store-option platform-option-divider/g) || []).length, 2, 'Linux store blocks must have dashed separators after AppImage and Snap Store');
assert.ok(!docsHtml.includes('id="link-linux-snap"') && !docsHtml.includes('id="link-linux-flatpak"'), 'Store buttons must replace duplicate direct Snap and Flatpak links');
assert.ok(docsApp.includes("label = `Завантажити зі Snap Store`") && docsApp.includes("smartStoreBtnText.textContent = 'Завантажити з Flathub'"), 'Linux hero must prioritize Snap Store and Flathub');
assert.ok(docsApp.includes("smartStoreBtn.hidden = true"), 'macOS hero must keep the second store button hidden');
assert.ok(docsApp.includes('window.previewOS = previewOS') && docsApp.includes('setupSmartCTA(os, previewDownloads, previewVersion)'), 'previewOS must update the complete OS-aware hero CTA');
assert.ok(docsHtml.includes('id="smartStoreBtnIcon" class="site-icon icon-microsoft-store icon-size-24"'), 'Microsoft Store hero icon must use the enlarged size');
assert.ok(docsHtml.includes('class="site-icon icon-microsoft-store icon-size-20"'), 'Microsoft Store card icon must use the enlarged size');
assert.ok(docsApp.includes("setSiteIcon(smartStoreBtnIcon, 'microsoft-store', 24)"), 'Windows preview must preserve the enlarged Microsoft Store hero icon');
assert.ok(docsApp.includes("setSiteIcon(smartBtnIcon, 'download', 20)"), 'The primary hero button must always use the download icon');
assert.ok(!/setSiteIcon\(smartBtnIcon, '(?:windows|apple|snap-store)'/.test(docsApp), 'The primary hero button must not switch icons with the detected OS');
assert.ok(docsApp.includes('setupSmartCTA(detectOS(), DEFAULT_DOWNLOADS, FALLBACK_VERSION);'), 'OS-aware hero buttons must render before the release request completes');
assert.strictEqual((docsHtml.match(/release-version-tag version-pending/g) || []).length, 2, 'Dynamic release badges must start hidden without collapsing their layout space');
assert.ok(docsHtml.includes('id="smartBtnMeta" class="version-pending"'), 'Hero release metadata must start hidden');
assert.strictEqual((docsHtml.match(/version-pending/g) || []).length, 4, 'Both release badges, hero metadata, and its separator must share the pending state');
assert.ok(!docsHtml.includes('v1.0.46'), 'GitHub Pages must not contain the stale v1.0.46 fallback');
assert.ok(/\.version-pending\s*\{\s*visibility:\s*hidden;\s*\}/.test(docsCss), 'Pending release metadata must reserve its layout space');
assert.ok(docsApp.includes("document.querySelectorAll('.version-pending')") && docsApp.includes('revealReleaseVersion();'), 'Release metadata must be revealed after the release request settles');
assert.ok(!docsHtml.includes('id="link-win-msix"') && !docsApp.includes('winMsix'), 'Windows download card must not expose the removed MSIX option');
const windowsAltOrder = ['link-win-x64', 'link-win-arm64', 'link-win-universal', 'link-win-portable'];
const windowsAltPositions = windowsAltOrder.map(id => docsHtml.indexOf(`id="${id}"`));
assert.ok(windowsAltPositions.every(position => position >= 0), 'Windows card must contain all four requested alternative downloads');
assert.deepStrictEqual([...windowsAltPositions].sort((a, b) => a - b), windowsAltPositions, 'Windows alternative downloads must be ordered as x64, ARM64, Universal, Portable');
assert.strictEqual((docsHtml.match(/data-download-size=/g) || []).length, 9, 'Every GitHub release file button must show a compact file size');
for (const sizeKey of ['winWeb', 'win', 'winX64', 'winArm64', 'winPortable', 'macDmg', 'macZip', 'linuxAppImage', 'linuxDeb']) {
  assert.ok(docsHtml.includes(`data-download-size="${sizeKey}"`), `Missing file-size label for ${sizeKey}`);
}
assert.ok(docsApp.includes('asset.size') && docsApp.includes('formatFileSize'), 'GitHub release asset sizes must update the file buttons dynamically');
assert.ok(docsCss.includes('.download-file-size') && docsCss.includes('white-space: nowrap'), 'Compact file-size labels must not split across lines');

const docsAssetsDir = path.join(rootDir, 'docs', 'assets');
const docsIconRules = [...docsCss.matchAll(/\.icon-([a-z0-9-]+)\s*\{\s*--icon-url:\s*url\('([^']+)'\);\s*\}/g)];
assert.ok(docsIconRules.length >= 20, 'GitHub Pages CSS must register the complete standalone icon set');
for (const [, iconName, relativePath] of docsIconRules) {
  const assetPath = path.resolve(path.join(rootDir, 'docs'), relativePath);
  assert.ok(assetPath.startsWith(`${docsAssetsDir}${path.sep}`), `.icon-${iconName} must reference docs/assets`);
  assert.ok(fs.existsSync(assetPath), `Missing GitHub Pages icon asset for .icon-${iconName}: ${assetPath}`);
  const svgContent = fs.readFileSync(assetPath, 'utf8');
  assert.strictEqual((svgContent.match(/<svg\b/gi) || []).length, 1, `${assetPath} must contain exactly one SVG root`);
  assert.ok(/<svg\b[^>]*>[\s\S]*<\/svg>\s*$/i.test(svgContent), `${assetPath} must have a complete, non-self-closing SVG root`);
}

for (const [name, content] of [
  ['main renderer', mainRenderer],
  ['settings renderer', settingsRenderer],
  ['settings CSS', settingsCss]
]) {
  assert.ok(!/<svg\b/i.test(content), `${name} не повинен містити SVG-розмітку`);
  assert.ok(!/data:image\/svg\+xml[^;]*,%3Csvg/i.test(content), `${name} не повинен містити жорстко записаний SVG data URI`);
}

assert.ok(!preloadMap.includes('%3Csvg'), 'preload-map не повинен містити закодовану SVG-геометрію');
assert.ok(!preloadMap.includes("require('fs')"), 'sandbox preload не повинен напряму читати файлову систему');
assert.ok(windowManager.includes("loadUiIconDataUrl('external-link.svg')"), 'main process має читати канонічний external-link.svg');
assert.ok(windowManager.includes('additionalArguments: externalLinkIconDataUrl'), 'main process має передавати ресурс іконки sandbox preload');
assert.ok(mainHtml.includes('../shared/icons.css') && settingsHtml.includes('../shared/icons.css'), 'Обидва локальні вікна мають підключати спільний icons.css');
assert.ok(mainRenderer.includes('container.replaceChildren(...iconsToRender)'), 'Динамічні статусні іконки мають оновлюватися через replaceChildren');
assert.ok(settingsRenderer.includes("classList.remove('icon-play', 'icon-pause')"), 'Play/pause мають перемикатися CSS-класами');

const cssDir = path.join(rootDir, 'src', 'renderer', 'shared');
const iconRules = [...iconsCss.matchAll(/\.icon-([a-z0-9-]+)\s*\{\s*--icon-source:\s*url\('([^']+)'\);\s*\}/g)];
assert.ok(iconRules.length >= 40, 'Спільний реєстр повинен містити повний набір UI та tab-іконок');
for (const [, iconName, relativePath] of iconRules) {
  const assetPath = path.resolve(cssDir, relativePath);
  assert.ok(fs.existsSync(assetPath), `Для .icon-${iconName} відсутній ресурс ${assetPath}`);
  assert.ok(read(path.relative(rootDir, assetPath)).includes('<svg'), `${assetPath} має бути SVG-файлом`);
}

const requiredDynamicIcons = [
  'shield-check', 'siren', 'circle-alert', 'shield-alert', 'wifi-off',
  'drone', 'missile', 'ballistic', 'aviation', 'target', 'triangle-alert', 'flask', 'radiation'
];
const registeredNames = new Set(iconRules.map(([, name]) => name));
for (const iconName of requiredDynamicIcons) {
  assert.ok(registeredNames.has(iconName), `Динамічна іконка ${iconName} має бути зареєстрована`);
}

const uiDir = path.join(rootDir, 'assets', 'icons', 'ui');
const tabsDir = path.join(rootDir, 'assets', 'icons', 'tabs');
assert.ok(fs.existsSync(path.join(uiDir, 'menu.svg')), 'Burger/menu-іконка має бути в assets/icons/ui');
assert.ok(!fs.existsSync(path.join(uiDir, 'wrench.svg')), 'Застаріла wrench.svg має бути видалена');
assert.ok(!fs.existsSync(path.join(rootDir, 'scripts', 'generate_ui_icons.js')), 'Генератор із дубльованою SVG-геометрією має бути видалений');
assert.ok(mainHtml.includes('icon-menu'), 'Кнопка налаштувань має використовувати burger/menu-іконку');

const menuSvg = read('assets', 'icons', 'ui', 'menu.svg');
assert.strictEqual((menuSvg.match(/<line\b/g) || []).length, 3, 'Burger/menu-іконка має складатися з трьох ліній');
assert.strictEqual((settingsHtml.match(/class="select-chevron ui-icon icon-chevron-down/g) || []).length, 5, 'Кожен select має використовувати канонічний chevron-down');
assert.ok(!settingsCss.includes('background-image:'), 'Select не повинен містити inline background SVG');

const hashes = new Map();
for (const dir of [uiDir, tabsDir]) {
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.svg'))) {
    const filePath = path.join(dir, file);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    assert.ok(!hashes.has(hash), `Знайдено точний дублікат SVG: ${filePath} і ${hashes.get(hash)}`);
    hashes.set(hash, filePath);
  }
}

console.log('✔ Централізація UI-іконок валідна; інтерактивна карта залишилася inline');
