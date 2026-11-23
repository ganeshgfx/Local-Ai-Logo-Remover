[CmdletBinding()]
param(
    [string]$AppPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $AppPath) {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\AI Watermark Remover\AI Watermark Remover.exe"),
        (Join-Path $PSScriptRoot "..\..\release\win-unpacked\AI Watermark Remover.exe"),
        (Join-Path $PSScriptRoot "..\..\dist\win-unpacked\AI Watermark Remover.exe"),
        (Join-Path $env:ProgramFiles "AI Watermark Remover\AI Watermark Remover.exe")
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $AppPath = (Resolve-Path $c).Path
            break
        }
    }
}

if (-not $AppPath) {
    $AppPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\release\win-unpacked\AI Watermark Remover.exe"))
}

Write-Host "Registering context menu for: $AppPath"

$menuText = "Remove Watermark"
$iconVal = "`"$AppPath`",0"
# MultiSelectModel=Player: Explorer calls once per file; single-instance lock batches them
$commandVal = "`"$AppPath`" `"%1`""

$mediaTargets = @(
    "SystemFileAssociations\video",
    "SystemFileAssociations\image",
    "SystemFileAssociations\.mp4",
    "SystemFileAssociations\.mov",
    "SystemFileAssociations\.webm",
    "SystemFileAssociations\.m4v",
    "SystemFileAssociations\.mkv",
    "SystemFileAssociations\.avi",
    "SystemFileAssociations\.png",
    "SystemFileAssociations\.jpg",
    "SystemFileAssociations\.jpeg",
    "SystemFileAssociations\.webp",
    "SystemFileAssociations\.bmp"
)

foreach ($target in $mediaTargets) {
    # Clean up legacy GeminiRemover key if present
    $legacyKey = "HKCU:\Software\Classes\$target\shell\GeminiRemover"
    if (Test-Path $legacyKey) {
        Remove-Item -Path $legacyKey -Recurse -Force -ErrorAction SilentlyContinue
    }

    $shellKey = "HKCU:\Software\Classes\$target\shell\AIWatermarkRemover"
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

Write-Host "Context menu registered successfully."
