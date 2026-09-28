; Inno Setup 6 Script for AlertDesktop (Повітряні тривоги)
; Ukrainian & English language support

#define MyAppName "AlertDesktop"
#define MyAppTitle "Повітряні тривоги"
#define MyAppPublisher "alerts.in.ua"
#define MyAppURL "https://alerts.in.ua/"
#define MyAppExeName "AlertDesktop.exe"

#ifndef AppVersion
  #define AppVersion "1.0.5"
#endif

#define SourceDir "..\dist\unpacked\AlertDesktop-win32-x64"

[Setup]
AppId={{8B84F491-03D7-4C73-8D1F-7BC608B01C2E}}
AppName={#MyAppTitle}
AppVersion={#AppVersion}
AppVerName={#MyAppTitle} v{#AppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppTitle}
AllowNoIcons=yes
OutputDir=..\dist
OutputBaseFilename=AlertDesktop-Setup-v{#AppVersion}
SetupIconFile=..\assets\icons\app-icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=force
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "ukrainian"; MessagesFile: "compiler:Languages\Ukrainian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
ukrainian.AutoStartName=Запускати автоматично при старті Windows
ukrainian.SystemSettings=Параметри системи:
english.AutoStartName=Start automatically when Windows starts
english.SystemSettings=System settings:

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "{cm:AutoStartName}"; GroupDescription: "{cm:SystemSettings}"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppTitle}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppTitle}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppTitle}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; Опціональний автозапуск при вході в систему
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "AlertDesktop"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppTitle}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
