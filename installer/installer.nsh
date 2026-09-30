; installer/installer.nsh — кастомні хуки NSIS для AlertDesktop

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
    !define MUI_FINISHPAGE_RUN_TEXT "Запустити Повітряні тривоги"
  !endif

  ; Функція додавання запису автозапуску в реєстр Windows
  Function EnableAutoStart
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AlertDesktop" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --hidden'
  FunctionEnd

  ; Додатковий чекбокс автозапуску на фінальній сторінці (активний за замовчуванням)
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Запускати автоматично при старті Windows"
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
