# Структура проєкту alert_desktop

Десктопний клієнт моніторингу повітряних тривог в Україні на базі Electron.

## Дерево модулів та ресурсів

```text
alert_desktop/
├── .env                                  # Локальні змінні середовища та API-ключі (в .gitignore)
├── .env.example                          # Шаблон змінних середовища
├── .gitignore                            # Виключення з контролю версій Git
├── AGENTS.md                             # Інструкції та специфікація для AI-асистента
├── STRUCTURE.md                          # Повний опис структури файлів та архітектури
├── package.json                          # Конфігурація проєкту та npm-скрипти
├── package-lock.json                     # Фіксація версій залежностей
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
│       ├── tray-normal.png / .svg        # Іконка трею: тривоги немає (зелений щит)
│       ├── tray-air-raid.png / .svg      # Іконка трею: червона повітряна тривога (червоний щит)
│       ├── tray-air-raid-yellow.png / .svg # Іконка трею: жовтий рівень загрози (жовтий щит)
│       ├── tray-artillery.png / .svg     # Іконка трею: загроза артобстрілу (помаранчевий вибух)
│       ├── tray-urban-fights.png / .svg  # Іконка трею: вуличні бої (темно-бурштиновий)
│       ├── tray-chemical.png / .svg      # Іконка трею: хімічна небезпека (фіолетовий)
│       ├── tray-nuclear.png / .svg       # Іконка трею: радіаційна загроза (золотавий трилисник)
│       ├── tray-offline.png / .svg       # Іконка трею: відсутність зв'язку (сірий)
│       └── ui/                           # Лінійні системні піктограми інтерфейсу
│           ├── bell.svg / bell-off.svg   # Індикація звуку
│           ├── gear.svg                  # Кнопка налаштувань
│           ├── play.svg / pause.svg      # Кнопки тесту аудіо
│           ├── shield-check.svg          # Лінійна іконка безпеки
│           ├── siren.svg                 # Лінійна іконка тривоги
│           └── volume.svg                # Іконка повзунка гучності
│
├── installer/                            # Конфігурація інсталятора
│   └── setup.iss                         # Скрипт Inno Setup 6 (українська/англійська, автозапуск, ярлики)
│
├── scripts/                              # Допоміжні скрипти генерації та обслуговування
│   ├── build_installer.js                # Автоматична збірка інсталятора (Packager + Inno Setup ISCC)
│   ├── deploy_remote.py                  # Автоматизоване SSH/SFTP розгортання проксі-сервера на Ubuntu
│   ├── download_assets.js                # Завантаження шрифтів Inter у репозиторій
│   ├── generate_audio.js                 # Генерація чистих синтезованих звуків сирени/відбою
│   ├── generate_ico.js                   # Генерація Windows .ico з 6 роздільними здатностями
│   ├── generate_icons.js                 # Генерація PNG-іконок через Electron nativeImage
│   ├── generate_ui_icons.js              # Генерація лінійних SVG піктограм інтерфейсу
│   ├── parse_locations.js                # Завантаження та парсинг 1622 локацій з Google Spreadsheets
│   ├── reset_config.js                   # Скидання та видалення файлу конфігурації у профілі користувача
│   └── smoke_test.js                     # Smoke-тест ініціалізації компонентів
│
├── server/                               # Автономний шлюз тривог на Python для Ubuntu (Webhook & WebSocket)
│   ├── .env.example                      # Шаблон конфігурації шлюзу (UkraineAlarm токен, webhook URL, порт)
│   ├── requirements.txt                  # Залежності Python (FastAPI, Uvicorn, HTTPX)
│   ├── config.py                         # Парсер та валідатор конфігурації середовища
│   ├── proxy_service.py                  # Шлюз UkraineAlarm: прийом Webhook, WebSocket трансляція, кешування
│   ├── main.py                           # Точка входу FastAPI: Webhook (/api/v3/webhook), WebSocket (/ws), REST
│   ├── README.md                         # Інструкція з налаштування, запуску та тестування на Ubuntu
│   ├── deploy/
│   │   └── install.sh                    # Скрипт автоматичного розгортання на сервері Ubuntu
│   └── systemd/
│       └── alert-proxy.service           # Unit-файл системної служби systemd
│
└── src/                                  # Вихідний код застосунку
    ├── main/                             # Головний процес (Node.js / Electron Main)
    │   ├── main.js                       # Точка входу: single instance lock, життєвий цикл
    │   ├── window.js                     # Менеджер головного вікна (BrowserWindow + WebContentsView)
    │   ├── settings-window.js            # Менеджер діалогового вікна налаштувань
    │   ├── tray.js                       # Керування системним треєм (іконка, tooltip, меню)
    │   ├── api.js                        # WebSocket зв'язок у реальному часі (0 сек) + HTTP fallback
    │   ├── autostart.js                  # Менеджер автозапуску Windows (Electron API + HKCU Run)
    │   ├── config.js                     # Робота з config.json, .env та автозапуском ОС
    │   ├── notifier.js                   # Системні сповіщення Windows та запуск звуку
    │   └── locations.json                # Повний довідник 1622 локацій України (UID, назви, типи)
    │
    ├── preload/                          # Безпечний ізольований Preload-шар (contextBridge)
    │   ├── preload-main.js               # API для статус-панелі головного вікна
    │   ├── preload-settings.js           # API для вікна налаштувань
    │   └── preload-map.js                # Блокування Picture-in-Picture та міні-мапи у WebContentsView
    │
    └── renderer/                         # Інтерфейс користувача (Renderer Process)
        ├── main/                         # Верхня панель керування головного вікна
        │   ├── index.html                # Розмітка шапки зі статусом та кнопкою шестерні
        │   ├── style.css                 # Стилізація у темній темі з шрифтом Inter
        │   └── renderer.js               # Відображення статусу, часу, ⚡ індикатора та запуск аудіо
        └── settings/                     # Діалогове вікно налаштувань
            ├── settings.html             # Форма налаштувань (регіон, звук, автозапуск, API)
            ├── settings.css              # Стилізація Windows Fluent з шрифтом Inter
            └── settings.js               # Керування слайдером, тест звуку, збереження
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
   - Контекстне меню містить швидкі дії: "Показати карту", "Налаштування", "Вихід".
3. **Автономність дизайну:**
   - Повна відсутність емодзі у інтерфейсі вікон.
   - Лінійні мінімалістичні векторні іконки.
   - Локальний шрифт Inter, збережений у репозиторії.
   - Синтезовані автономні системні звукові файли.
4. **Централізований шлюз UkraineAlarm (Webhook + WebSocket + REST fallback):**
   - Автономний Python-сервіс для Linux/Ubuntu (`server/`).
   - Автоматично реєструє Webhook в офіційному API `https://api.ukrainealarm.com` (`POST /api/v3/webhook`).
   - При зміні тривоги приймає HTTP POST і миттєво транслює оновлення всім підключеним додаткам `alert_desktop` через WebSocket (0 секунд затримки).
   - Кешує повну картину тривог у пам'яті та забезпечує зворотну сумісність через REST endpoint `GET /v1/alerts/active.json`.
   - Автоматичний reconnect та періодична звірка цілісності кожні 5 хвилин для надійності при будь-яких збоях мережі.
