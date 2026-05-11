# RISC-V 可视化教学桌面软件

本仓库用于大创项目《基于 RISC-V 指令集可视化教学的桌面软件》的文档整理、AI 协作训练和软件原型开发。

## 当前技术路线

截至 2026-05-09，项目路线已经明确调整为：

- 主线：`app/` 非 Blockly 自研积木界面，后续优先改造成桌面版。
- 保留：`desktop/` Blockly 迁移版作为技术验证，用来参考成熟拖拽、连接约束、序列化和 Electron 打包经验。
- 远期：OpenHarmony 先采用 ArkWeb/WebView 承载自研 Web UI，再根据比赛展示和性能需要逐步原生化到 ArkUI。

仓库中存在一些早期路线文档，里面可能仍写着“第一版使用 Blockly”“右侧固定显示数据流动画”等旧方案。遇到冲突时，以 [文档状态与路线索引](docs/文档状态与路线索引.md) 和本 README 为准。

Blockly 不需要账号、注册或 API。此前桌面白屏主要来自 Electron 打包后的模块路径、构建产物和二进制依赖问题，不是 Blockly 授权问题。

## 推荐阅读顺序

团队成员第一次接手时，建议先阅读：

1. [文档目录向导](docs/README.md)
2. [文档状态与路线索引](docs/文档状态与路线索引.md)
3. [工程目录与代码分区说明](docs/工程目录与代码分区说明.md)
4. [技术路线决策与阶段复盘](docs/技术路线决策与阶段复盘.md)
5. [项目进度与结构总结](docs/项目进度与结构总结.md)
6. [2026-05-09 UI 界面与功能改动总结](docs/2026-05-09_UI界面与功能改动总结.md)
7. [2026-05-11 UI 交互改动与 Windows 桌面版同步说明](docs/2026-05-11_UI交互改动与Windows桌面版同步说明.md)

之后按任务进入：

- 做 `app/` 主线和 UI：读 [机器状态格动画重构方案](docs/机器状态格动画重构方案.md) 与 [长期自动化开发任务：非 Blockly 主线工程化](docs/长期自动化开发任务_非Blockly主线工程化.md)。
- 做 OpenHarmony / 香橙派：读 [OpenHarmony ArkWeb 移植版说明](openharmony-port/README.md)、[OH 开发经验与 AI 接手须知](openharmony-port/docs/OH开发经验与AI接手须知.md) 和 [OpenHarmony UI 与展示移植方案](openharmony-port/docs/2026-05-09_UI与OpenHarmony展示移植方案.md)。
- 写答辩和产品材料：读 [产品说明：当前阶段版](docs/产品说明_当前阶段版.md) 与 [演示脚本](docs/演示脚本.md)。
- 参考 Blockly 技术验证：读 [Blockly 迁移阶段方案](docs/Blockly迁移阶段方案.md)，但它已降级为参考资产。

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

## OpenHarmony / 香橙派移植版

当前已单开 `openharmony-port/`，用于把现有 `app/` 静态资源化后放入 OpenHarmony ArkTS 壳，通过 ArkWeb 加载本地 rawfile 页面。该版本暂时移除可见的数据流动画区域，并预留 `OpenHarmonyBridge` 给后续原生保存、导入和 HDC 真机部署验证。

本地结构烟测：

```powershell
npm.cmd run oh:sync
npm.cmd run oh:smoke
```

也可以直接运行组合检查：

```powershell
npm.cmd run oh:check
```

详细说明见：

```text
openharmony-port/README.md
openharmony-port/docs/移植记录.md
openharmony-port/docs/HDC部署检查清单.md
openharmony-port/docs/OH开发经验与AI接手须知.md
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
- Git/GitHub 协作统一参考 `docs/Git协作流程与分支规则.md`：从最新 `main` 新建功能分支，通过 PR 合入，提交前先检查 `git status --short`。
- 主线新功能优先回到 `app/` 的自研积木逻辑，并规划桌面封装。
- `desktop/` 的 Blockly 代码保留为验证资产，不再强行作为最终外观方案。
- `desktop/dist/`、`desktop/release/`、`desktop/node_modules/`、`desktop/.cache/` 等生成物不要提交。
- 新增指令时必须同步维护指令定义、解析、模拟器、示例案例和测试，尤其注意操作数顺序。
