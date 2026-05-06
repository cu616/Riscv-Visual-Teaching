$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$url = "http://localhost:4173"
$logDir = Join-Path $root "logs"
$logFile = Join-Path $logDir "launch_non_blockly_app.log"

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Write-LaunchLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Test-AppServer {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Find-BrowserAppHost {
  $candidates = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  return $null
}

Write-LaunchLog "Launcher started from $root"

if (-not (Test-AppServer)) {
  Write-LaunchLog "Server is not responding. Starting npm.cmd start."
  Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $root -WindowStyle Minimized

  $ready = $false
  for ($i = 0; $i -lt 20; $i += 1) {
    Start-Sleep -Milliseconds 500
    if (Test-AppServer) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    Write-LaunchLog "Server did not respond within timeout."
    throw "RISC-V teaching app server did not start. See $logFile"
  }
}

$browserAppHost = Find-BrowserAppHost

if ($browserAppHost) {
  Write-LaunchLog "Opening app window with $browserAppHost"
  Start-Process -FilePath $browserAppHost -ArgumentList @("--new-window", "--app=$url")
} else {
  Write-LaunchLog "No Edge or Chrome app host found. Opening default browser for $url"
  Start-Process $url
}
