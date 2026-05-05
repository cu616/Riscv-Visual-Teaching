# RISC-V 可视化教学桌面软件

本仓库用于大创项目《基于 RISC-V 指令集可视化教学的桌面软件》的文档整理、AI 协作训练和软件原型开发。

## 当前技术路线

截至 2026-05-03，项目路线已经明确调整为：

- 主线：`app/` 非 Blockly 自研积木界面，后续优先改造成桌面版。
- 保留：`desktop/` Blockly 迁移版作为技术验证，用来参考成熟拖拽、连接约束、序列化和 Electron 打包经验。
- 远期：OpenHarmony 先采用 ArkWeb/WebView 承载自研 Web UI，再根据比赛展示和性能需要逐步原生化到 ArkUI。

Blockly 不需要账号、注册或 API。此前桌面白屏主要来自 Electron 打包后的模块路径、构建产物和二进制依赖问题，不是 Blockly 授权问题。

## 推荐阅读顺序

团队成员第一次接手时，建议先阅读：

1. [技术路线决策与阶段复盘](docs/技术路线决策与阶段复盘.md)
2. [工程目录与代码分区说明](docs/工程目录与代码分区说明.md)
3. [项目进度与结构总结](docs/项目进度与结构总结.md)
4. [产品说明：当前阶段版](docs/产品说明_当前阶段版.md)
5. [明早验收与问题定位清单](docs/明早验收与问题定位清单.md)
6. [长期自动化开发任务：非 Blockly 主线工程化](docs/长期自动化开发任务_非Blockly主线工程化.md)
7. [自动化开发执行记录](docs/自动化开发执行记录.md)
8. [长期任务 v0.4：案例工程化与初始状态闭环](docs/长期任务_v0.4_案例工程化与初始状态闭环.md)
9. [Blockly 迁移阶段方案](docs/Blockly迁移阶段方案.md)

## 运行非 Blockly 主线原型

当前主线原型位于 `app/`，运行：

```powershell
npm.cmd start
```

然后打开：

```text
http://localhost:4173
```

也可以双击：

```text
启动RISC-V可视化教学软件.bat
```

## 运行非 Blockly 桌面版

当前非 Blockly 桌面壳位于 `self-desktop/`，它直接承载 `app/` 的自研积木界面，不引入 Blockly。

最简单方式是双击：

```text
打开非Blockly自研积木桌面版.bat
```

该脚本会检查本地服务是否已经启动；如果没有，会自动启动 `app/` 主线服务，并优先用 Edge/Chrome 的应用窗口模式打开 `http://localhost:4173`。应用窗口模式没有普通浏览器标签栏，是当前最稳定的非 Blockly 桌面化打开方式。

启动日志位于：

```text
logs/launch_non_blockly_app.log
```

桌面窗口调试：

```powershell
npm.cmd run self:electron
```

Windows 目录包打包：

```powershell
npm.cmd run self:package:win
```

打包产物位于：

```text
self-desktop/release/win-unpacked/
```

## 运行 Blockly 技术验证版

Blockly + Electron 验证版位于 `desktop/`。

开发预览：

```powershell
npm.cmd --prefix .\desktop run dev
```

Electron 调试：

```powershell
npm.cmd --prefix .\desktop run dev:electron
```

检查核心逻辑：

```powershell
npm.cmd --prefix .\desktop run check
npm.cmd --prefix .\desktop run test:core
```

Windows 打包：

```powershell
npm.cmd --prefix .\desktop run package:win
```

如果 Electron 或 app-builder 二进制下载不完整，优先参考 `desktop/scripts/repair-binaries.ps1` 和 `desktop/downloads/` 中的手动下载缓存。

## 协作原则

- 需求、取舍和阶段进度必须同步写入 `docs/`，方便后续 AI 和团队成员接力。
- 主线新功能优先回到 `app/` 的自研积木逻辑，并规划桌面封装。
- `desktop/` 的 Blockly 代码保留为验证资产，不再强行作为最终外观方案。
- `desktop/dist/`、`desktop/release/`、`desktop/node_modules/`、`desktop/.cache/` 等生成物不要提交。
- 新增指令时必须同步维护指令定义、解析、模拟器、示例案例和测试，尤其注意操作数顺序。
