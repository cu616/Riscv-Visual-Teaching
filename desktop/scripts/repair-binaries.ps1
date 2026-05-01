$ErrorActionPreference = "Stop"

$DesktopRoot = Split-Path -Parent $PSScriptRoot
$ElectronPackagePath = Join-Path $DesktopRoot "node_modules\electron\package.json"
$ElectronDist = Join-Path $DesktopRoot "node_modules\electron\dist"
$ElectronExe = Join-Path $ElectronDist "electron.exe"
$ElectronPathFile = Join-Path $DesktopRoot "node_modules\electron\path.txt"
$CacheDir = Join-Path $DesktopRoot ".cache"
$AppBuilderExe = Join-Path $DesktopRoot "node_modules\app-builder-bin\win\x64\app-builder.exe"

if (-not (Test-Path $ElectronPackagePath)) {
  throw "Electron package is missing. Run npm install in desktop before repairing binaries."
}

$ElectronPackage = Get-Content $ElectronPackagePath -Raw | ConvertFrom-Json
$ElectronVersion = $ElectronPackage.version
$Mirror = $env:ELECTRON_MIRROR

if ([string]::IsNullOrWhiteSpace($Mirror)) {
  $Mirror = "https://npmmirror.com/mirrors/electron/"
}

if (-not $Mirror.EndsWith("/")) {
  $Mirror = "$Mirror/"
}

$ZipName = "electron-v$ElectronVersion-win32-x64.zip"
$ZipUrl = "$Mirror" + "v$ElectronVersion/$ZipName"
$ZipPath = Join-Path $CacheDir $ZipName

New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null

Write-Host "Electron version: $ElectronVersion"
Write-Host "Electron mirror:  $Mirror"
Write-Host "Electron zip:     $ZipUrl"

if (-not (Test-Path $ElectronExe)) {
  Write-Host "Downloading Electron runtime..."
  Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath

  if (Test-Path $ElectronDist) {
    Remove-Item -LiteralPath $ElectronDist -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $ElectronDist | Out-Null
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $ElectronDist -Force
  Set-Content -LiteralPath $ElectronPathFile -Value "electron.exe" -NoNewline

  $VersionPath = Join-Path $ElectronDist "version"
  if (-not (Test-Path $VersionPath)) {
    Set-Content -LiteralPath $VersionPath -Value $ElectronVersion -NoNewline
  }
} else {
  Write-Host "Electron runtime already exists."
}

if (-not (Test-Path $ElectronExe)) {
  throw "Electron runtime repair failed: $ElectronExe was not created."
}

if (-not (Test-Path $AppBuilderExe)) {
  Write-Warning "app-builder.exe is missing. Try: `$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/' ; npm install"
} else {
  Write-Host "app-builder exists: $AppBuilderExe"
}

Write-Host "Electron runtime repaired: $ElectronExe"
