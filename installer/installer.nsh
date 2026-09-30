; installer/installer.nsh — кастомні хуки та багатомовна локалізація NSIS для AlertDesktop

; --- Багатомовні рядки для чекбоксів фінальної сторінки ---
LangString RUN_APP_TEXT 1058 "Запустити Повітряні тривоги"
LangString RUN_APP_TEXT 1033 "Launch AlertDesktop"

LangString AUTOSTART_TEXT 1058 "Запускати автоматично при старті Windows"
LangString AUTOSTART_TEXT 1033 "Start automatically when Windows starts"

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
