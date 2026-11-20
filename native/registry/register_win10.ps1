[CmdletBinding()]
param(
    [string]$AppPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $AppPath) {
    $candidates = @(
        (Join-Path $PSScriptRoot "..\..\dist\win-unpacked\Gemini Watermark Remover.exe"),
        (Join-Path $PSScriptRoot "..\..\..\release\Gemini Watermark Remover.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\gemini-remover\Gemini Watermark Remover.exe"),
        (Join-Path $env:ProgramFiles "Gemini Watermark Remover\Gemini Watermark Remover.exe")
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $AppPath = (Resolve-Path $c).Path
            break
        }
    }
}

if (-not $AppPath) {
    $AppPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\dist\win-unpacked\Gemini Watermark Remover.exe"))
}

Write-Host "Registering Windows 10 context menu for: $AppPath"

$menuText = "Remove Gemini"
$iconVal = "`"$AppPath`",0"
# MultiSelectModel=Player: Explorer calls once per file; single-instance lock batches them
$commandVal = "cmd /c `"set ELECTRON_RUN_AS_NODE=0 && `"$AppPath`" `"%1`"`""

$videoTargets = @(
    "SystemFileAssociations\video",
    "SystemFileAssociations\.mp4",
    "SystemFileAssociations\.mov",
    "SystemFileAssociations\.webm",
    "SystemFileAssociations\.m4v"
)

foreach ($target in $videoTargets) {
    $shellKey = "HKCU:\Software\Classes\$target\shell\GeminiRemover"
    $cmdKey = "$shellKey\command"

    if (-not (Test-Path $shellKey)) {
        New-Item -Path $shellKey -Force | Out-Null
    }
    Set-ItemProperty -Path $shellKey -Name "(Default)" -Value $menuText
    Set-ItemProperty -Path $shellKey -Name "MUIVerb" -Value $menuText
    Set-ItemProperty -Path $shellKey -Name "Icon" -Value $iconVal
    # MultiSelectModel=Player: command is called once per selected file
    Set-ItemProperty -Path $shellKey -Name "MultiSelectModel" -Value "Player"

    if (-not (Test-Path $cmdKey)) {
        New-Item -Path $cmdKey -Force | Out-Null
    }
    Set-ItemProperty -Path $cmdKey -Name "(Default)" -Value $commandVal
}

Write-Host "Windows 10 context menu registered successfully."
