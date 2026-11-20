@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
set "APP_DIR=c:\Users\ganes\Desktop\Temp\Gemini-Logo-remove\gemini-remover"
"%APP_DIR%\node_modules\electron\dist\electron.exe" "%APP_DIR%" %* >> "%TEMP%\gemini-remover-launch.log" 2>&1
endlocal
