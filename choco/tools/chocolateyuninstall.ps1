$ErrorActionPreference = 'Stop'

$packageName = 'ai-watermark-remover'
$softwareName = 'AI Watermark Remover*'

[array]$keys = Get-UninstallRegistryKey -SoftwareName $softwareName

if ($keys.Count -eq 1) {
  $keys | ForEach-Object {
    $uninstallString = $_.UninstallString
    # NSIS uninstallers typically support /S for silent
    if ($uninstallString -match '\.exe') {
      $file = ($uninstallString -replace '"','').Trim()
      Uninstall-ChocolateyPackage -PackageName $packageName -FileType 'exe' -SilentArgs '/S' -File $file -ValidExitCodes @(0)
    }
  }
} elseif ($keys.Count -eq 0) {
  Write-Warning "$packageName has already been uninstalled by other means."
} elseif ($keys.Count -gt 1) {
  Write-Warning "$($keys.Count) matches found!"
  Write-Warning "The following is a log of the keys:"
  $keys | ForEach-Object { Write-Warning "- $($_.DisplayName)" }
  throw "$($keys.Count) uninstall registry keys found. Manual removal may be required."
}
