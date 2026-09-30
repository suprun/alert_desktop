; installer/installer.nsh — кастомні хуки та багатомовна локалізація NSIS для AlertDesktop

; --- Автоматичне збереження та відновлення вибору мови між інсталятором та деінсталятором ---
!define MUI_LANGDLL_REGISTRY_ROOT "HKCU"
!define MUI_LANGDLL_REGISTRY_KEY "Software\AlertDesktop"
!define MUI_LANGDLL_REGISTRY_VALUENAME "Installer Language"

; --- Багатомовні рядки для чекбоксів фінальної сторінки ---
LangString RUN_APP_TEXT 1058 "Запустити Повітряні тривоги"
LangString RUN_APP_TEXT 1033 "Launch AlertDesktop"

LangString AUTOSTART_TEXT 1058 "Запускати автоматично при старті Windows"
LangString AUTOSTART_TEXT 1033 "Start automatically when Windows starts"

!macro customHeader
  ; --- Українська локалізація діалогів вибору режиму та деінсталяції (LCID 1058) ---
  ; Перевизначаємо рядки з assistedMessages.yml / messages.yml, де відсутня українська мова в electron-builder
  LangString chooseInstallationOptions 1058 "Оберіть параметри встановлення"
  LangString chooseUninstallationOptions 1058 "Оберіть параметри видалення"
  LangString whichInstallationShouldBeRemoved 1058 "Яку саме інсталяцію слід видалити?"
  LangString whoShouldThisApplicationBeInstalledFor 1058 "Для кого слід встановити цей застосунок?"
  LangString selectUserMode 1058 "Оберіть, чи бажаєте зробити програму доступною для всіх користувачів, чи лише для себе:"
  LangString whichInstallationRemove 1058 "Програма встановлена як для всієї системи, так і для окремого користувача.$\r$\nЯку саме інсталяцію ви бажаєте видалити?"
  LangString freshInstallForAll 1058 "Чисте встановлення для всіх користувачів (потрібні права адміністратора)."
  LangString freshInstallForCurrent 1058 "Чисте встановлення лише для поточного користувача."
  LangString onlyForMe 1058 "Лише для &мене"
  LangString forAll 1058 "Для &всіх користувачів цього комп'ютера"
  LangString loginWithAdminAccount 1058 "Для продовження необхідно увійти під обліковим записом адміністратора..."
  LangString perUserInstallExists 1058 "Вже встановлено для поточного користувача."
  LangString perUserInstall 1058 "Встановлено для користувача."
  LangString perMachineInstallExists 1058 "Вже встановлено для всіх користувачів комп'ютера."
  LangString perMachineInstall 1058 "Встановлено для всіх користувачів."
  LangString reinstallUpgrade 1058 "Буде оновлено/перевстановлено."
  LangString uninstall 1058 "Буде видалено."
  LangString deleteAppData 1058 "Дані та налаштування застосунку"
  LangString deleteAppDataCheckbox 1058 "Видалити також збережені налаштування та історію сповіщень"
  LangString appCannotBeClosed 1058 "Не вдалося закрити ${PRODUCT_NAME}.$\r$\nБудь ласка, закрийте застосунок вручну та натисніть 'Повторити'."
  LangString appClosing 1058 "Завершення роботи ${PRODUCT_NAME}..."
  LangString areYouSureToUninstall 1058 "Ви впевнені, що бажаєте видалити ${PRODUCT_NAME}?"
  LangString uninstallFailed 1058 "Не вдалося видалити старі файли застосунку. Будь ласка, спробуйте запустити деінсталятор знову."
  LangString win7Required 1058 "Потрібна Windows 7 або новіша версія."
  LangString x64WinRequired 1058 "Потрібна 64-розрядна версія Windows."
!macroend

!macro customFinishPage
  !ifndef HIDE_RUN_AFTER_FINISH
    Function StartApp
      ${if} ${isUpdated}
        StrCpy $1 "--updated"
      ${else}
        StrCpy $1 ""
      ${endif}
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
    FunctionEnd

    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
    !define MUI_FINISHPAGE_RUN_TEXT $(RUN_APP_TEXT)
  !endif

  ; Функція додавання запису автозапуску в реєстр Windows
  Function EnableAutoStart
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --hidden'
  FunctionEnd

  ; Якщо користувач зняв прапорець — гарантуємо видалення запису з реєстру
  Function FinishPageLeave
    SendMessage $mui.FinishPage.ShowReadme ${BM_GETCHECK} 0 0 $0
    ${if} $0 != 1
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop"
    ${endif}
  FunctionEnd

  ; Додатковий багатомовний чекбокс автозапуску (активний за замовчуванням)
  !define MUI_PAGE_CUSTOMFUNCTION_LEAVE FinishPageLeave
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT $(AUTOSTART_TEXT)
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "EnableAutoStart"
  !define MUI_FINISHPAGE_SHOWREADME_CHECKED

  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customInstall
  ; Зберігаємо обрану мову встановлення для деінсталятора
  WriteRegStr HKCU "Software\AlertDesktop" "Installer Language" $LANGUAGE

  ; Якщо автозапуск уже був раніше налаштований — оновлюємо шлях до нового EXE
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop"
  ${If} $0 != ""
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --hidden'
  ${EndIf}
!macroend

!macro customUnInit
  ; Відновлюємо мову, яку користувач обрав під час встановлення
  ReadRegStr $0 HKCU "Software\AlertDesktop" "Installer Language"
  ${If} $0 != ""
    StrCpy $LANGUAGE $0
  ${Else}
    ; Якщо запис відсутній — показуємо діалог вибору мови (якщо увімкнено)
    !ifdef DISPLAY_LANG_SELECTOR
      !insertmacro MUI_LANGDLL_DISPLAY
    !endif
  ${EndIf}
!macroend

!macro customUnInstall
  ; Чисте видалення запису автозапуску та налаштувань інсталятора при деінсталяції програми
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop"
  DeleteRegKey HKCU "Software\AlertDesktop"
!macroend
