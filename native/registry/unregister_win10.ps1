[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

$videoTargets = @(
    "SystemFileAssociations\video",
    "SystemFileAssociations\.mp4",
    "SystemFileAssociations\.mov",
    "SystemFileAssociations\.webm",
    "SystemFileAssociations\.m4v"
)

foreach ($target in $videoTargets) {
    $shellKey = "HKCU:\Software\Classes\$target\shell\GeminiRemover"
    if (Test-Path $shellKey) {
        Remove-Item -Path $shellKey -Recurse -Force
        Write-Host "Removed $shellKey"
    }
}

Write-Host "Windows 10 context menu unregistered successfully."
