@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
set "APP_DIR=%~dp0"
"%APP_DIR%node_modules\electron\dist\electron.exe" "%APP_DIR%." %* >> "%TEMP%\gemini-remover-launch.log" 2>&1
endlocal
