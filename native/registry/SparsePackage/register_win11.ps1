[CmdletBinding()]
param(
    [string]$ExternalLocation = "",
    [switch]$Unregister
)

$packageName = "GeminiWatermarkRemover.ShellExtension"
$manifestPath = Join-Path $PSScriptRoot "AppxManifest.xml"

if ($Unregister) {
    Write-Host "Unregistering Windows 11 Shell Extension package..."
    $pkg = Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue
    if ($pkg) {
        Remove-AppxPackage -Package $pkg.PackageFullName
        Write-Host "Package $packageName unregistered successfully."
    } else {
        Write-Host "Package $packageName is not currently registered."
    }
    return
}

if (-not $ExternalLocation) {
    $candidates = @(
        (Join-Path $PSScriptRoot "..\..\..\dist\win-unpacked"),
        (Join-Path $PSScriptRoot "..\..\.."),
        (Join-Path $env:LOCALAPPDATA "Programs\gemini-remover"),
        (Join-Path $env:ProgramFiles "Gemini Watermark Remover")
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $ExternalLocation = (Resolve-Path $cand).Path
            break
        }
    }
}

if (-not $ExternalLocation -or -not (Test-Path $ExternalLocation)) {
    $ExternalLocation = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.."))
}

Write-Host "Registering Windows 11 Shell Extension sparse package..."
Write-Host "Manifest: $manifestPath"
Write-Host "External Location: $ExternalLocation"

# Remove existing package if installed
$existing = Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing package registration..."
    Remove-AppxPackage -Package $existing.PackageFullName
}

Add-AppxPackage -Register $manifestPath -ExternalLocation $ExternalLocation

Write-Host "Windows 11 Shell Extension registered successfully."
