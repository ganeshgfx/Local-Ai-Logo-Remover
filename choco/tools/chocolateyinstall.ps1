$ErrorActionPreference = 'Stop'

$packageName    = 'ai-watermark-remover'
$toolsDir       = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"

# TODO: Update this URL to your actual GitHub Release download URL once you create the release
$url64          = 'https://github.com/ganeshgfx/Local-Ai-Logo-Remover/releases/download/v1.0.1/AI.Watermark.Remover.Setup.1.0.1.exe'
$checksum64     = 'B4A0D3F494315F62CB9897F37C3E28E806B7B2F0FD0943229082D6503B6178D2'
$checksumType64 = 'sha256'

$packageArgs = @{
  packageName    = $packageName
  fileType       = 'exe'
  url64bit       = $url64
  checksum64     = $checksum64
  checksumType64 = $checksumType64
  softwareName   = 'AI Watermark Remover*'
  silentArgs     = '/S'
  validExitCodes = @(0)
}

Install-ChocolateyPackage @packageArgs
