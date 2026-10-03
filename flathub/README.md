# Інструкція з публікації AlertDesktop на Flathub

У цій директорії міститься повний комплект файлів, необхідних для офіційного включення застосунку **AlertDesktop** до глобального каталогу [Flathub](https://flathub.org).

---

## Склад пакету для Flathub

1. **`ua.in.alerts.desktop.yaml`** — маніфест збірки Flatpak на базі рантайму GNOME / FreeDesktop та Electron BaseApp.
2. **`ua.in.alerts.desktop.metainfo.xml`** — специфікація AppStream із назвою, описом українською та англійською мовами, категоріями, посиланнями та скріншотами.
3. **`ua.in.alerts.desktop.desktop`** — файл запуску XDG із підтримкою системного трею та MIME-типів.

---

## Порядок подання заявки (Pull Request) до Flathub

1. **Форк офіційного репозиторію:**
   - Перейдіть на [https://github.com/flathub/flathub](https://github.com/flathub/flathub) та натисніть **Fork**.

2. **Створення гілки для нового застосунку:**
   ```bash
   git checkout -b add-ua.in.alerts.desktop
   ```

3. **Копіювання файлів:**
   - Створіть у корені форку файл `ua.in.alerts.desktop.yaml` та розмістіть `ua.in.alerts.desktop.metainfo.xml` і `ua.in.alerts.desktop.desktop`.
   - Оновіть `sha256` у маніфесті відповідно до релізу на GitHub.

4. **Локальна перевірка через `flatpak-builder` (опціонально у Linux):**
   ```bash
   flatpak-builder --force-clean --user --install-deps-from=flathub --repo=repo build-dir ua.in.alerts.desktop.yaml
   ```

5. **Створення Pull Request:**
   - Запушіть гілку у свій форк та відкрийте Pull Request до репозиторію `flathub/flathub`.
   - Автоматичний бот Flathub протестує збірку та створить репозиторій `https://github.com/flathub/ua.in.alerts.desktop`.
   - Після схвалення модераторами AlertDesktop стане доступним для встановлення однією командою:
     ```bash
     flatpak install flathub ua.in.alerts.desktop
     ```
