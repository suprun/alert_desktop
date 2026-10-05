# Структура проєкту alert_desktop

Десктопний клієнт моніторингу повітряних тривог в Україні на базі Electron.

## Дерево модулів та ресурсів

```text
alert_desktop/
├── .github/                              # CI/CD автоматизація GitHub Actions
│   └── workflows/
│       ├── ci.yml                        # Швидкий CI: синтаксис, тести та smoke-перевірки при push/PR
│       ├── pages.yml                     # Автоматизований деплой лендингу на GitHub Pages
│       └── release.yml                   # Мультиплатформенна збірка та реліз: обов'язкові NSIS / DMG / AppImage+DEB, опційні (continue-on-error) MSIX, Portable, Snap, Flatpak
├── .env                                  # Локальні змінні середовища та API-ключі (в .gitignore)
├── .env.example                          # Шаблон змінних середовища
├── .gitignore                            # Виключення з контролю версій Git
├── AGENTS.md                             # Інструкції та специфікація для AI-асистента
├── LICENSE                               # Ліцензія відкритого вихідного коду Apache License 2.0
├── NOTICE                                # Юридичні застереження щодо alerts.in.ua, торгових марок та безпеки
├── README.md                             # Головна документація проєкту, інструкції запуску та правовий статус
├── STRUCTURE.md                          # Повний опис структури файлів та архітектури
├── package.json                          # Конфігурація проєкту та npm-скрипти
├── package-lock.json                     # Фіксація версій залежностей
│
├── build/                                # Візуальні ресурси платформних бінарників
│   └── appx/                             # Плитки та логотипи для Windows AppX/MSIX та Microsoft Store
│       ├── StoreLogo.png                 # Логотип для каталогу Microsoft Store (50x50)
│       ├── Square44x44Logo.png           # Піктограма списку програм (44x44)
│       ├── Square150x150Logo.png         # Стандартна плитка меню «Пуск» (150x150)
│       ├── Square310x310Logo.png         # Велика плитка меню «Пуск» (310x310)
│       ├── Wide310x150Logo.png           # Широка плитка меню «Пуск» (310x150)
│       └── SplashScreen.png              # Заставка запуску UWP/WinRT (620x300)
│
├── assets/                               # Локальні ресурси (без зовнішніх CDN)
│   ├── audio/                            # Автономні системні звукові сигнали (WAV)
│   │   ├── alert-siren.wav / alert.wav   # Класична двохтонова сирена
│   │   ├── alert-pulse.wav               # Електронний пульс тривоги
│   │   ├── alert-chime.wav               # М'який офісний дзвін тривоги
│   │   ├── alert-radar.wav               # Радарний імпульс тривоги
│   │   ├── all-clear-chime.wav / .wav    # Гармонійний акорд відбою
│   │   ├── all-clear-bell.wav            # Подвійний дзвіночок відбою
│   │   ├── all-clear-marimba.wav         # Висхідна марімба відбою
│   │   └── all-clear-gong.wav            # Спокійний гонг відбою
│   ├── fonts/                            # Локальні файли шрифту Inter (Cyrillic + Latin)
│   │   ├── Inter-Regular.woff2
│   │   ├── Inter-Medium.woff2
│   │   └── Inter-SemiBold.woff2
│   └── icons/                            # Векторні SVG та растрові PNG іконки
│       ├── app-icon.ico                  # Багаторозмірна Windows-іконка (16..256px) для інсталятора та EXE
│       ├── app-icon.png / app-icon.svg   # Головна іконка застосунку
│       ├── tray-normal.png / .svg        # Іконка трею: тривоги немає (зелений диск із галочкою)
│       ├── tray-air-raid.png / .svg      # Іконка трею: червона повітряна тривога (червоний диск зі знаком !)
│       ├── tray-drone.png / .svg         # Іконка трею: загроза БПЛА / Шахед (жовтий диск із силуетом Shahed)
│       ├── tray-missile.png / .svg       # Іконка трею: ракетна загроза (червоний диск із крилатою ракетою)
│       ├── tray-ballistic.png / .svg     # Іконка трею: загроза балістики (бордовий диск із балістичною ракетою)
│       ├── tray-aviation.png / .svg      # Іконка трею: загроза КАБ / тактичної авіації (червоний диск із літаком)
│       ├── tray-combo-missile-drone.png / .svg # Іконка трею: комбінована загроза (розділений диск: ракета + дрон)
│       ├── tray-air-raid-yellow.png / .svg # Аліас для жовтого рівня загрози
│       ├── tray-artillery.png / .svg     # Іконка трею: загроза артобстрілу (помаранчевий диск із вибухом)
│       ├── tray-urban-fights.png / .svg  # Іконка трею: вуличні бої (темно-помаранчевий диск із прицілом)
│       ├── tray-chemical.png / .svg      # Іконка трею: хімічна небезпека (фіолетовий диск із колбою)
│       ├── tray-nuclear.png / .svg       # Іконка трею: радіаційна загроза (золотавий диск із трилисником)
│       ├── tray-offline.png / .svg       # Іконка трею: відсутність зв'язку (сірий диск із перекресленою рискою)
│       └── ui/                           # Лінійні системні піктограми інтерфейсу
│           ├── bell.svg / bell-off.svg   # Індикація звуку
│           ├── gear.svg                  # Кнопка налаштувань
│           ├── play.svg / pause.svg      # Кнопки тесту аудіо
│           ├── shield-check.svg          # Лінійна іконка безпеки
│           ├── siren.svg                 # Лінійна іконка тривоги
│           └── volume.svg                # Іконка повзунка гучності
│
├── docs/                                 # Офіційна веб-сторінка проєкту для GitHub Pages
│   ├── index.html                        # Семантичний лендинг із вибором інсталяторів, мапою України та ліцензією
│   ├── style.css                         # Дизайн-система (темна/світла теми, адаптивність, стилі векторної карти)
│   ├── app.js                            # Логіка визначення ОС, GitHub Releases API та перемикача тем
│   └── assets/                           # Графічні матеріали (векторна карта ukraine-map.svg, логотипи apple.svg, linux.svg, app-icon)
│
├── flathub/                              # Комплект для офіційної публікації у глобальному каталозі Flathub
│   ├── ua.in.alerts.desktop.yaml         # Маніфест збірки Flatpak
│   ├── ua.in.alerts.desktop.metainfo.xml # Метадані AppStream для магазинів застосунків (Discover, GNOME Software)
│   ├── ua.in.alerts.desktop.desktop      # XDG Desktop-файл запуску
│   └── README.md                         # Інструкція з відкриття Pull Request до flathub/flathub
│
├── installer/                            # Кастомні конфігураційні скрипти інсталятора
│   └── installer.nsh                     # Хуки NSIS (дефолтна українська мова в preInit, збереження мови, багатомовні діалоги UA/EN, автозапуск)
│
├── scripts/                              # Допоміжні скрипти генерації та обслуговування
│   ├── build_installer.js                # Мультиплатформенна збірка інсталяторів (--win, --win-x64, --win-arm64, --msix, --portable, --linux, --snap, --flatpak, --mac, --all)
│   ├── deploy_remote.py                  # Автоматизоване SSH/SFTP розгортання проксі-сервера на Ubuntu
│   ├── download_assets.js                # Завантаження шрифтів Inter у репозиторій
│   ├── generate_appx_assets.js           # Генерація плиток та логотипів AppX/MSIX для Windows і Microsoft Store
│   ├── generate_audio.js                 # Генерація чистих синтезованих звуків сирени/відбою
│   ├── generate_ico.js                   # Генерація Windows .ico з 6 роздільними здатностями
│   ├── generate_icons.js                 # Генерація PNG-іконок через Electron nativeImage
│   ├── generate_ui_icons.js              # Генерація лінійних SVG піктограм інтерфейсу
│   ├── install.sh                        # Універсальний Linux веб-інсталятор (x86_64 та ARM64 AppImage)
│   ├── parse_locations.js                # Завантаження та парсинг 1622 локацій з Google Spreadsheets
│   ├── release_tag.js                    # Автоматичне створення та публікація Git-тегу версії для запуску CI Release
│   ├── reset_config.js                   # Скидання та видалення файлу конфігурації у профілі користувача
│   ├── smoke_test.js                     # Smoke-тест ініціалізації компонентів
│   ├── test_threat_utils.js              # Unit-тести парсингу характеру загроз та анти-тавтології
│   ├── test_notifier.js                  # Unit-тести форматування часу та тривалості сповіщень Windows
│   ├── test_oblast_aggregation.js        # Unit-тести агрегації тривог по районах для обраної області
│   ├── test_updater.js                   # Unit-тести модуля UpdaterService (автооновлення)
│   ├── test_autostart_sync.js            # Unit-тести синхронізації автозапуску між ОС та config.json
│   ├── test_ubilling_adapter.js          # Unit-тести адаптера Ubilling Aerial Alerts API (нормалізація, мапінг регіонів, ієрархія)
│   ├── test_neptun_adapter.js            # Unit-тести адаптера NEPTUN API (нормалізація 136 районів/міст, WebSocket, ієрархія, загрози)
│   ├── test_jaam_adapter.js              # Unit-тести адаптера JAAM API (нормалізація версій v3/v2, часові мітки, ієрархія тривог)
│   ├── test_net_check.js                 # Unit-тести модуля перевірки зв'язку через Anycast IP Google та Cloudflare
│   ├── test_fallback_resilience.js       # Unit-тести стійкості Fallback API, пріоритетів джерел, суворого режиму та відновлення
│   └── test_maps_tabs.js                 # Unit-тести панелі вкладок, геоданих векторної карти, повної відсутності емодзі та перемикання карт
│
├── server/                               # Гібридний шлюз тривог на Python для Ubuntu (Webhook, WebSocket & Threats Enricher)
│   ├── .env.example                      # Шаблон конфігурації шлюзу (UkraineAlarm та alerts.in.ua токени, webhook URL, порт)
│   ├── requirements.txt                  # Залежності Python (FastAPI, Uvicorn, HTTPX)
│   ├── config.py                         # Парсер та валідатор конфігурації обох API
│   ├── proxy_service.py                  # Гібридний шлюз: прийом Webhook від UkraineAlarm + фонове збагачення threats від alerts.in.ua
│   ├── main.py                           # Точка входу FastAPI: Webhook (/api/v3/webhook), WebSocket (/ws), REST fallback
│   ├── README.md                         # Інструкція з налаштування, запуску та тестування на Ubuntu
│   ├── deploy/
│   │   └── install.sh                    # Скрипт автоматичного розгортання на сервері Ubuntu
│   └── systemd/
│       └── alert-proxy.service           # Unit-файл системної служби systemd
│
└── src/                                  # Вихідний код застосунку
    ├── main/                             # Головний процес (Node.js / Electron Main)
    │   ├── main.js                       # Точка входу: single instance lock, життєвий цикл, IPC маршрутизація вкладок і тривог
    │   ├── window.js                     # Менеджер головного вікна, пул переглядів веб-карт, розрахунок footerHeight (44px) та синхронізація тем
    │   ├── settings-window.js            # Менеджер діалогового вікна налаштувань
    │   ├── tray.js                       # Керування системним треєм (іконка, tooltip, меню, пункт оновлення)
    │   ├── updater.js                    # Сервіс перевірки та встановлення автооновлень (electron-updater / GitHub Releases)
    │   ├── threat-utils.js               # Нормалізація типів загроз (дрони, ракети тощо), усунення тавтології та генерація текстів
    │   ├── api.js                        # WebSocket зв'язок (0s) + HTTP fallback + багаторівневе резервування + список усіх активних тривог allAlerts
    │   ├── net-check.js                  # Швидка перевірка зв'язку з інтернетом через Anycast IP Google та Cloudflare (порти 53/443)
    │   ├── autostart.js                  # Менеджер автозапуску Windows (Electron API + HKCU Run)
    │   ├── config.js                     # Робота з config.json (збереження activeMapTab), .env та автозапуском ОС
    │   ├── notifier.js                   # Системні сповіщення Windows (Toast із часом знизу та тривалістю) і запуск звуку
    │   └── locations.json                # Повний довідник 1622 локацій України (UID, назви, типи)
    │
    ├── preload/                          # Безпечний ізольований Preload-шар (contextBridge)
    │   ├── preload-main.js               # API для головного вікна (статус, вибір вкладок, векторна тема, масив усіх тривог)
    │   ├── preload-settings.js           # API для вікна налаштувань (конфігурація, локації, тема)
    │   └── preload-map.js                # Блокування PiP та двостороння синхронізація тем для alerts.in.ua, map.ukrainealarm.com і neptun.in.ua
    │
    └── renderer/                         # Інтерфейс користувача (Renderer Process)
        ├── main/                         # Головне вікно застосунку
        │   ├── map-data.js               # Векторні геодані карти України: 148 районів/спецміст та 25 меж областей у точній сітці viewBox
        │   ├── index.html                # Розмітка: шапка, вбудована векторна карта, векторний перемикач теми та нижня панель вкладок без емодзі
        │   ├── style.css                 # Стилізація світлої/темної тем, векторних контурів районів, рівнів загроз, тултіпів та вкладок
        │   └── renderer.js               # Рендеринг векторної карти, багаторівневе забарвлення тривог (область/район/громада), перемикання вкладок
        └── settings/                     # Діалогове вікно налаштувань
            ├── settings.html             # Форма налаштувань (регіон, звук, автозапуск, API)
            ├── settings.css              # Стилізація Windows Fluent у світлій та темній темах
            └── settings.js               # Керування параметрами, тест звуку, синхронізація теми
```

## Основні архітектурні принципи

1. **Безпека:**
   - Суворе дотримання `contextIsolation: true` та `nodeIntegration: false`.
   - Інтерактивна мапа `https://alerts.in.ua/` ізольована у `WebContentsView` і не має доступу до середовища Node.js або коду додатку.
   - Зовнішні посилання відкриваються виключно у зовнішньому браузері користувача за замовчуванням.
2. **Системна інтеграція:**
   - Додаток працює у системному треї, згортається при натисканні 'X' на вікні.
   - Стан тривоги та тип загрози індикується іконкою трею та системною підказкою (tooltip).
   - Одинарний/подвійний клік на іконці трею перемикає видимість вікна.
   - Контекстне меню містить швидкі дії: "Показати карту", "Налаштування", "Перевірити оновлення...", динамічну кнопку встановлення оновлення та "Вихід".
3. **Автономність дизайну:**
   - Повна відсутність емодзі у інтерфейсі вікон.
   - Лінійні мінімалістичні векторні іконки.
   - Локальний шрифт Inter, збережений у репозиторії.
   - Синтезовані автономні системні звукові файли.
4. **Централізований гібридний шлюз (UkraineAlarm Webhook + alerts.in.ua Threats Enrichment):**
   - Автономний Python-сервіс для Linux/Ubuntu (`server/`).
   - Автоматично реєструє Webhook в офіційному API `https://api.ukrainealarm.com` (`POST /api/v3/webhook`) для миттєвої реакції на тривогу та відбій (0 сек затримки).
   - У фоновому режимі (раз на 8-10 сек) безпечно опитує `https://api.alerts.in.ua/v1/alerts/active.json`, збагачуючи активні тривоги масивом конкретних загроз (`threats`: дрони, ракети, балістика тощо).
   - Транслює повні дані клієнтам `alert_desktop` через WebSocket (`/ws`) та забезпечує зворотну сумісність через REST endpoint `GET /v1/alerts/active.json`.
   - Забезпечує автоматичний reconnect, захист від перевищення лімітів API та періодичну звірку цілісності кожні 5 хвилин.
5. **Збірка та диференційні оновлення (electron-builder + NSIS):**
   - Пакет збирається у стандартний Windows NSIS інсталятор (`dist/AlertDesktop-Setup-v<версія>.exe`).
   - Підтримка диференційних оновлень (`.blockmap`) через GitHub Releases (`electron-updater`).
   - Фонова перевірка оновлень та безшовне встановлення без необхідності підвищення прав адміністратора (`perMachine: false`).
