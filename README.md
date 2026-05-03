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
5. [Blockly 迁移阶段方案](docs/Blockly迁移阶段方案.md)

## 运行主线原型

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
