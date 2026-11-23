[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

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
    $shellKey = "HKCU:\Software\Classes\$target\shell\AIWatermarkRemover"
    if (Test-Path $shellKey) {
        Remove-Item -Path $shellKey -Recurse -Force
        Write-Host "Removed $shellKey"
    }
    $legacyKey = "HKCU:\Software\Classes\$target\shell\GeminiRemover"
    if (Test-Path $legacyKey) {
        Remove-Item -Path $legacyKey -Recurse -Force
        Write-Host "Removed $legacyKey"
    }
}

Write-Host "Context menu unregistered successfully."
