<#
WSL2 一键安装/修复脚本（PowerShell）

用法：
1) 右键“以管理员身份运行” PowerShell
2) 运行：  Set-ExecutionPolicy -Scope Process Bypass
3) 运行：  .\scripts\wsl2_setup.ps1

说明：
- 某些步骤会提示需要重启；重启后请再次运行本脚本（它会跳过已完成项）。
- 发行版默认安装 Ubuntu（可按需修改）。
#>

$ErrorActionPreference = 'Stop'

function Assert-Admin {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw '请用管理员权限运行 PowerShell（右键 → 以管理员身份运行）。'
  }
}

function Enable-Feature($featureName) {
  $feature = (dism /online /Get-FeatureInfo /FeatureName:$featureName) 2>&1 | Out-String
  if ($feature -match 'State\s*:\s*Enabled') {
    Write-Host "[OK] $featureName 已启用" -ForegroundColor Green
    return
  }
  Write-Host "[DO] 启用 $featureName" -ForegroundColor Yellow
  dism /online /Enable-Feature /FeatureName:$featureName /All /NoRestart | Out-Null
  Write-Host "[OK] $featureName 已启用（可能需要重启生效）" -ForegroundColor Green
}

function Ensure-WSL {
  try {
    $null = wsl --status 2>$null
    Write-Host '[OK] wsl 命令可用' -ForegroundColor Green
  } catch {
    Write-Host '[DO] 安装 WSL（会自动安装/更新组件）' -ForegroundColor Yellow
    wsl --install | Out-Null
  }
}

function Update-WSL {
  Write-Host '[DO] 更新 WSL（内核/组件）' -ForegroundColor Yellow
  wsl --update
}

function Ensure-Ubuntu {
  $distros = (wsl --list --quiet) 2>$null
  if ($distros -and ($distros | Select-String -SimpleMatch 'Ubuntu')) {
    Write-Host '[OK] 已安装 Ubuntu' -ForegroundColor Green
    return
  }

  Write-Host '[DO] 安装 Ubuntu 发行版' -ForegroundColor Yellow
  wsl --install -d Ubuntu
}

function Set-WSL2-Defaults {
  Write-Host '[DO] 设置默认 WSL 版本为 2' -ForegroundColor Yellow
  wsl --set-default-version 2

  $distros = (wsl --list --quiet) 2>$null
  foreach ($d in $distros) {
    if ($d.Trim().Length -eq 0) { continue }
    # 尝试将已存在发行版切换到 WSL2
    try {
      wsl --set-version $d 2 | Out-Null
      Write-Host "[OK] 已设置 $d 为 WSL2" -ForegroundColor Green
    } catch {
      Write-Host "[WARN] 未能设置 $d 为 WSL2（可能需要先重启/首次启动发行版）" -ForegroundColor DarkYellow
    }
  }
}

Assert-Admin

Write-Host '=== WSL2 安装/修复开始 ===' -ForegroundColor Cyan

# 1) 启用必要 Windows 可选组件
Enable-Feature 'Microsoft-Windows-Subsystem-Linux'
Enable-Feature 'VirtualMachinePlatform'

# 2) 确保 WSL 已安装
Ensure-WSL

# 3) 更新 WSL
try {
  Update-WSL
} catch {
  Write-Host '[WARN] wsl --update 执行失败（常见原因：需要重启或网络限制）。可重启后重试。' -ForegroundColor DarkYellow
}

# 4) 设置默认 WSL2，并安装 Ubuntu
try {
  Set-WSL2-Defaults
} catch {
  Write-Host '[WARN] 设置默认 WSL2 失败（常见原因：需要重启）。' -ForegroundColor DarkYellow
}

try {
  Ensure-Ubuntu
} catch {
  Write-Host '[WARN] 安装 Ubuntu 失败（常见原因：需要重启后再安装）。' -ForegroundColor DarkYellow
}

Write-Host '=== 完成 ===' -ForegroundColor Cyan
Write-Host '如果提示“需要重启才生效”，请先重启 Windows，然后再次运行本脚本。' -ForegroundColor Cyan
