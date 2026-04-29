# WSL2 环境搭建（Windows）执行清单

> 适用：Windows 11（也适用于大多数 Windows 10 新版本）。
> 目标：在 WSL2 的 Linux 环境里用 VS Code Remote 开发，并为后续在 VS Code 中使用 Codex 做准备。

## 0. 你现在的状态（本机已验证）
- 已执行过 `wsl --install -d Ubuntu`
- 已安装 WSL（版本 2.6.3）并启用 `VirtualMachinePlatform`
- 仍需要 **重启 Windows** 让可选组件生效

## 1. 必做：重启 Windows
- 现在就重启一次。
- 重启后回到 PowerShell，继续下面步骤。

## 2. 重启后：确认 WSL 与 Ubuntu 状态
在 PowerShell 运行：

```powershell
wsl --status
wsl --list --verbose
```

预期：能看到 Ubuntu，且 `VERSION` 为 `2`。

如果看不到 Ubuntu：

```powershell
wsl --list --online
wsl --install -d Ubuntu
```

如果 Ubuntu 不是 WSL2：

```powershell
wsl --set-default-version 2
wsl --set-version Ubuntu 2
```

## 3. 首次进入 Ubuntu（创建 Linux 用户 + 更新系统）
在 PowerShell 运行：

```powershell
wsl -d Ubuntu
```

首次启动会让你创建 Linux 用户名/密码。
进入 Ubuntu 后运行：

```bash
sudo apt update
sudo apt -y upgrade
```

（可选）安装常用工具：

```bash
sudo apt -y install git curl ca-certificates build-essential
```

## 4. VS Code 连接 WSL（Remote 开发模式）
1) 在 Windows 侧 VS Code 安装扩展：`WSL`（Microsoft 官方 Remote - WSL）。
2) 用命令面板选择：`WSL: Connect to WSL`。
3) 在 WSL 的 Ubuntu 终端里进入你的项目目录，然后运行：

```bash
code .
```

验证点：VS Code 左下角/状态栏显示 `WSL: Ubuntu`。

## 5. 把项目迁移到 WSL 文件系统（强烈推荐）
不要把仓库放在 `/mnt/c/...` 下长期开发。
建议：

```bash
mkdir -p ~/code
cp -r /mnt/c/Users/lbc/dachuang ~/code/dachuang
cd ~/code/dachuang
code .
```

## 6. GitHub 网络受限（HTTPS 443 不通）的 SSH over 443 方案
在 WSL 里配置 SSH：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat > ~/.ssh/config <<'EOF'
Host github.com
  HostName ssh.github.com
  Port 443
  User git
EOF
chmod 600 ~/.ssh/config
```

生成密钥并测试（按需）：

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
ssh -T git@github.com
```

把 `~/.ssh/id_ed25519.pub` 添加到 GitHub 的 SSH Keys 后再测试。

## 7. 为 VS Code 使用 Codex 做准备（简版）
- 在 **WSL Remote 窗口**里安装/登录 Codex 扩展（Windows 原生支持偏 experimental 时，WSL 更稳）。
- 第一次任务先跑“低风险三连”：
  1) 先不改代码，概览项目结构/入口
  2) 列出计划改动文件清单，等确认再改
  3) 只做最小可运行版本，不重构
