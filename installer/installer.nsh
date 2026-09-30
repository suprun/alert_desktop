; installer/installer.nsh — кастомні хуки та багатомовна локалізація NSIS для AlertDesktop

; --- Багатомовні рядки для сторінки завершення ---
LangString RUN_APP_TEXT 1058 "Запустити Повітряні тривоги"
LangString RUN_APP_TEXT 1033 "Launch AlertDesktop"

LangString AUTOSTART_TEXT 1058 "Запускати автоматично при старті Windows"
LangString AUTOSTART_TEXT 1033 "Start automatically when Windows starts"

; --- Українська локалізація системних повідомлень майстра ---
LangString chooseInstallationOptions 1058 "Оберіть параметри встановлення"
LangString chooseUninstallationOptions 1058 "Оберіть параметри видалення"
LangString whichInstallationShouldBeRemoved 1058 "Яку саме інсталяцію слід видалити?"
LangString whoShouldThisApplicationBeInstalledFor 1058 "Для кого слід встановити цей застосунок?"
LangString selectUserMode 1058 "Оберіть, чи бажаєте встановити програму для всіх користувачів, чи лише для себе:"
LangString installationForAnyoneUsingThisComputer 1058 "Для всіх користувачів цього комп'ютера"
LangString installationOnlyForMe 1058 "Лише для мене (без прав адміністратора)"
LangString deleteAppData 1058 "Дані та налаштування застосунку"
LangString deleteAppDataCheckbox 1058 "Видалити також збережену конфігурацію та історію сповіщень"

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

  ; Додатковий багатомовний чекбокс автозапуску (активний за замовчуванням)
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT $(AUTOSTART_TEXT)
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "EnableAutoStart"
  !define MUI_FINISHPAGE_SHOWREADME_CHECKED

  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customInstall
  ; Якщо автозапуск уже був раніше налаштований — оновлюємо шлях до нового EXE
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop"
  ${If} $0 != ""
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --hidden'
  ${EndIf}
!macroend

!macro customUnInstall
  ; Чисте видалення запису автозапуску при деінсталяції програми
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop"
!macroend
