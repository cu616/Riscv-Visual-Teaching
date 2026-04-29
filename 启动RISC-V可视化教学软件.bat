@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动 RISC-V 指令集可视化教学软件...
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:4173'"
npm.cmd start
