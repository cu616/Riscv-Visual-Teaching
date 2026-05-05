# 非 Blockly 自研积木桌面壳

这个目录是当前主线 `app/` 的 Electron 桌面壳，只承载非 Blockly 自研积木界面。

运行：

双击仓库根目录：

```text
打开非Blockly自研积木桌面版.bat
```

如果 Electron 桌面窗口没有保持运行，该脚本会自动退回到浏览器方式打开同一套非 Blockly 主线应用。

当前推荐优先使用根目录的一键脚本。`self-desktop/` 保留为后续修复 Electron 直接窗口和 Windows exe 打包的工程入口。

或执行：

```powershell
npm.cmd run self:electron
```

打包 Windows 目录包：

```powershell
npm.cmd run self:package:win
```

说明：

- 桌面壳直接加载 `app/index.html`。
- 不引入 Blockly，不复用 `desktop/src` 的 Blockly 工作区。
- Electron 和 electron-builder 先复用 `desktop/` 中已经安装和验证过的依赖。
