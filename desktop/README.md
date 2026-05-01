# Desktop Blockly 迁移原型

当前目录是 `v0.4` 迁移阶段的正式工程雏形。

目标技术栈：

- Electron
- React
- TypeScript
- Vite
- Blockly

当前状态：

- 已建立 Electron / Vite / React / TypeScript 基础结构。
- 已迁移核心指令定义、解析器、模拟器和内置案例格式。
- 已接入 Blockly 工作区组件、分类工具箱和 RISC-V block 定义。
- 已支持内置案例加载到 Blockly 工作区。
- 已支持当前工作区导出为 `.riscvteach.json`，并可从界面重新导入。
- 已迁入机器状态初始化和点击详情：点击寄存器/内存后可写入初始化值并重置机器。
- 已支持机器状态十进制、十六进制、二进制切换显示，并随案例文件保存。
- 已新增“运行到结束”，用于课堂/答辩时快速展示完整执行结果。
- 已把寄存器、立即数、移位量、标签引用迁移为独立操作数小积木，指令块通过 Blockly 连接读取这些小积木。
- 标签帽已经改成 `riscv_label_tag` 输出小积木，可插入指令左侧 `LABEL_TAG` 输入，解析层会读作 `labelTag`。
- 已加入 `riscv_square` 方形卡口 renderer 雏形，用于后续把 Blockly 默认圆弧缺口改成小矩形缺口。
- 已定义 `.riscvteach.json` 保存格式，目标是让用户保存案例和内置案例共用同一加载流程。
- 导入 `.riscvteach.json` 时会优先恢复保存的 Blockly workspace JSON；若没有 workspace，才根据 `instructions` 重建。
- Blockly 主工作区支持横向拖拽调整尺寸，窗口较窄时自动切换为单列布局。

运行：

```powershell
npm.cmd --prefix .\desktop install
npm.cmd --prefix .\desktop run dev
```

桌面窗口调试：

```powershell
npm.cmd --prefix .\desktop run dev:electron
```

验证：

```powershell
npm.cmd --prefix .\desktop run check
npm.cmd --prefix .\desktop run test:core
```

当前验证状态：

- `npm.cmd --prefix .\desktop run check` 已通过。
- `npm.cmd --prefix .\desktop run test:core` 在提升权限后已通过。
- `npm.cmd --prefix .\desktop run build` 已通过。
- `npm.cmd --prefix .\desktop run preview -- --port 5176` 已验证 HTTP 200，可作为浏览器预览入口。
- `npm.cmd --prefix .\desktop run repair:binaries` 已通过：可绕过整包重装，单独从 Electron 镜像补齐 `electron/dist/electron.exe`。
- `npm.cmd --prefix .\desktop run package:win` 已生成 Windows 目录包：`desktop/release/win-unpacked/RISC-V可视化教学软件.exe`。

二进制下载修复：
```powershell
npm.cmd --prefix .\desktop run repair:binaries
npm.cmd --prefix .\desktop run package:win
```

说明：
- Electron 运行时由 `electron` 包的 `install.js` 下载并解压到 `node_modules/electron/dist`。
- 如果 npm 安装阶段因网络中断导致 `electron.exe` 缺失，不必立刻删除整个 `node_modules`。
- 修复脚本会读取当前 Electron 版本，默认从 `https://npmmirror.com/mirrors/electron/` 下载 `electron-v版本-win32-x64.zip`，解压后写入 `path.txt`。
- 如果要换镜像，可先设置 `$env:ELECTRON_MIRROR`，再运行 `repair:binaries`。
- `app-builder.exe` 当前已存在于 `node_modules/app-builder-bin/win/x64/`；若后续缺失，可设置 `ELECTRON_BUILDER_BINARIES_MIRROR` 后重新执行安装。
- 当前目录包关闭了 `win.signAndEditExecutable`，用于避开无管理员/开发者模式时 `winCodeSign` 解压符号链接失败的问题。正式发布安装包前再恢复签名流程。

注意：

- 当前 `app/` 无依赖 MVP 继续保留，作为答辩备用版本。
- 数据流动画迁移阶段暂不重做视觉，只先保留抽象展示区域。
- 标签帽已经具备独立连接模型，但视觉仍需在浏览器/Electron 中继续微调到“左侧贴边小积木”效果。
- Windows 打包已完成一次目录包验收。后续如再次遇到 Electron 运行时缺失，优先运行 `repair:binaries`，不要直接整包删除重装。
