# 文档目录向导

更新时间：2026-05-09

本文是 `docs/` 的总入口。当前仓库文档跨越了多个阶段：早期 Blockly 方案、非 Blockly 自研积木主线、Electron 桌面壳、OpenHarmony/香橙派移植、AI 协作教程和自动化执行记录。后续阅读时不要只按文件名或日期判断，应先看本文和 `文档状态与路线索引.md`。

## 0. 当前路线一句话

```text
app/ 非 Blockly 自研积木主线
→ self-desktop/ 或浏览器应用窗口承载桌面演示
→ openharmony-port/ 使用 ArkWeb 加载 app/ 静态资源
```

`desktop/` 的 Blockly + Electron 工程保留为技术验证和工程参考，不再作为当前最终产品外观主线。

## 1. 第一次接手必读

| 顺序 | 文档 | 状态 | 用途 |
| --- | --- | --- | --- |
| 1 | [文档状态与路线索引](文档状态与路线索引.md) | 当前入口 | 判断哪些路线有效、哪些历史方案已降级。 |
| 2 | [工程目录与代码分区说明](工程目录与代码分区说明.md) | 当前有效 | 理解仓库目录、代码分层、运行命令和修改入口。 |
| 3 | [技术路线决策与阶段复盘](技术路线决策与阶段复盘.md) | 当前有效 | 理解为什么主线回到自研积木，以及 Blockly 的保留价值。 |
| 4 | [项目进度与结构总结](项目进度与结构总结.md) | 当前有效 | 查看当前完成内容、主要模块、已知问题和 Git 状态说明。 |
| 5 | [2026-05-09 UI 界面与功能改动总结](2026-05-09_UI界面与功能改动总结.md) | 最新阶段总结 | 了解最近一次 UI、动画和 OpenHarmony 同步的实际改动。 |

## 2. 按任务阅读

### 2.1 要改 `app/` 自研积木主线

先读：

1. [工程目录与代码分区说明](工程目录与代码分区说明.md)
2. [2026-05-09 UI 界面与功能改动总结](2026-05-09_UI界面与功能改动总结.md)
3. [机器状态格动画重构方案](机器状态格动画重构方案.md)
4. [长期自动化开发任务：非 Blockly 主线工程化](长期自动化开发任务_非Blockly主线工程化.md)

重点代码：

```text
app/index.html
app/styles.css
app/src/app.js
app/src/instructions.js
app/src/simulator.js
app/src/state-animation.js
app/src/machine-state.js
app/src/operand-model.js
```

常用验证：

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run smoke
```

### 2.2 要做 UI、动画、演示效果

先读：

1. [2026-05-09 UI 界面与功能改动总结](2026-05-09_UI界面与功能改动总结.md)
2. [机器状态格动画重构方案](机器状态格动画重构方案.md)
3. [产品说明：当前阶段版](产品说明_当前阶段版.md)
4. [演示脚本](演示脚本.md)

注意：旧文档里关于“右侧固定数据流动画面板”“PC 大卡片”“独立抽象数据流动画”的描述已经不是当前主线。

### 2.3 要处理 OpenHarmony / 香橙派移植

先读：

1. [OpenHarmony ArkWeb 移植版说明](../openharmony-port/README.md)
2. [OH 开发经验与 AI 接手须知](../openharmony-port/docs/OH开发经验与AI接手须知.md)
3. [2026-05-09 UI 与 OpenHarmony 展示移植方案](../openharmony-port/docs/2026-05-09_UI与OpenHarmony展示移植方案.md)
4. [HDC 部署检查清单](../openharmony-port/docs/HDC部署检查清单.md)
5. [OpenHarmony / 香橙派移植记录](../openharmony-port/docs/移植记录.md)

常用验证：

```powershell
npm.cmd run oh:check
```

注意：`openharmony-port/entry/src/main/resources/rawfile/app/` 是从 `app/` 同步出来的目标目录。不要手工改 rawfile 里的主线文件，避免 PC 端和 OpenHarmony 端分叉。

### 2.4 要参考 Blockly / Electron 技术验证版

先读：

1. [Blockly 迁移阶段方案](Blockly迁移阶段方案.md)
2. [工程目录与代码分区说明](工程目录与代码分区说明.md)
3. [desktop/README](../desktop/README.md)

注意：这条路线当前是“技术验证和参考资产”，不是最终产品外观主线。可以参考 TypeScript 分层、Blockly 序列化、Electron 打包经验，但不要把 Blockly 默认拼图外观当成当前需求。

### 2.5 要写答辩、产品说明或材料

先读：

1. [产品说明：当前阶段版](产品说明_当前阶段版.md)
2. [演示脚本](演示脚本.md)
3. [理论产品说明书大纲](《基于 RISC-V 指令集可视化教学的桌面软件》理论产品说明书大纲.md)
4. [项目进度与结构总结](项目进度与结构总结.md)

注意：理论说明书大纲中仍保留早期 Blockly 与独立数据流动画设计，可作为历史设计材料；正式描述当前实现时，应以 `app/` 自研积木主线为准。

### 2.6 要做团队协作、Git 或 AI 工作流

先读：

1. [Git 协作流程与分支规则](Git协作流程与分支规则.md)
2. [AI 协作沟通经验](AI协作沟通经验.md)
3. [小组编程与 AI 阶段 Skill 推荐清单](小组编程与AI阶段技能清单.md)
4. [Codex 简介](codex_tutorial.md)
5. [Codex 基础配置教程](codex_setup_tutorial.md)
6. [Codex Skill 简易教程](codex_skill_tutorial.md)
7. [Prompt / Agent / Skill 教程](prompt_agent_skill_tutorial.md)
8. [WSL2 环境搭建执行清单](WSL2_环境搭建_执行清单.md)

## 3. 文档分类索引

### A. 当前路线与工程入口

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| [文档状态与路线索引](文档状态与路线索引.md) | 当前入口 | 判断文档冲突和路线优先级。 |
| [工程目录与代码分区说明](工程目录与代码分区说明.md) | 当前有效 | 代码目录、子工程、运行命令和修改建议。 |
| [技术路线决策与阶段复盘](技术路线决策与阶段复盘.md) | 当前有效 | 路线取舍和阶段复盘。 |
| [项目进度与结构总结](项目进度与结构总结.md) | 当前有效 | 当前完成度、模块说明、已知问题。 |
| [下一阶段版本计划](下一阶段版本计划.md) | 混合状态 | 包含历史 v0.4 Blockly 路线，也包含后续计划；阅读时以状态说明为准。 |

### B. 产品、演示与说明材料

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| [产品说明：当前阶段版](产品说明_当前阶段版.md) | 当前有效 | 面向展示和比赛说明的产品材料。 |
| [演示脚本](演示脚本.md) | 当前有效 | 答辩或课堂演示顺序。 |
| [理论产品说明书大纲](《基于 RISC-V 指令集可视化教学的桌面软件》理论产品说明书大纲.md) | 材料草案 | 适合扩写成正式文档，部分早期方案需按当前路线修订。 |

### C. UI、交互与动画专项

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| [2026-05-09 UI 界面与功能改动总结](2026-05-09_UI界面与功能改动总结.md) | 最新阶段总结 | 记录最新 UI、右侧辅助栏、状态格动画和 OpenHarmony 同步。 |
| [机器状态格动画重构方案](机器状态格动画重构方案.md) | 当前有效 | 后续动画优化的主要依据。 |
| [OpenHarmony 工作台展示整合修改总结](OpenHarmony工作台展示整合修改总结.md) | 阶段记录 | 记录工作台中 OpenHarmony 展示能力的整合过程。 |

### D. OpenHarmony / 香橙派移植

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| [OpenHarmony ArkWeb 移植版说明](../openharmony-port/README.md) | 当前有效 | 移植版总入口。 |
| [OH 开发经验与 AI 接手须知](../openharmony-port/docs/OH开发经验与AI接手须知.md) | 当前有效 | DevEco、SDK、AppScope、HDC、ArkWeb 经验。 |
| [2026-05-09 UI 与 OpenHarmony 展示移植方案](../openharmony-port/docs/2026-05-09_UI与OpenHarmony展示移植方案.md) | 当前有效 | 新 UI 同步到 OpenHarmony 的理论方案和验收清单。 |
| [HDC 部署检查清单](../openharmony-port/docs/HDC部署检查清单.md) | 当前有效 | 真机连接、构建安装、运行验收和排错。 |
| [OpenHarmony / 香橙派移植记录](../openharmony-port/docs/移植记录.md) | 阶段记录 | 移植过程、风险和命令行构建记录。 |

### E. 历史方案、计划与执行记录

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| [RISC-V 可视化教学桌面软件开发步骤指南](RISC-V可视化教学桌面软件_开发步骤指南.md) | 历史参考 | 早期开发步骤，含 Blockly 主线设想。 |
| [Blockly 迁移阶段方案](Blockly迁移阶段方案.md) | 降级参考 | Blockly 技术验证方案，不再是产品主线。 |
| [夜间自动化推进计划](夜间自动化推进计划.md) | 历史执行计划 | 当时无人值守开发计划。 |
| [自动化开发执行记录](自动化开发执行记录.md) | 阶段记录 | 自动化执行后的产物、测试和风险记录。 |
| [长期自动化开发任务：非 Blockly 主线工程化](长期自动化开发任务_非Blockly主线工程化.md) | 当前可参考 | 非 Blockly 主线工程化拆解。 |
| [长期任务 v0.4：案例工程化与初始状态闭环](长期任务_v0.4_案例工程化与初始状态闭环.md) | 当前可参考 | 案例保存、初始状态闭环方向。 |
| [明早验收与问题定位清单](明早验收与问题定位清单.md) | 阶段验收清单 | 可复用其中的问题定位格式。 |

### F. 团队、AI 与环境教程

| 文档 | 状态 | 说明 |
| --- | --- | --- |
| [Git 协作流程与分支规则](Git协作流程与分支规则.md) | 当前有效 | 小组 Git/GitHub 协作流程。 |
| [AI 协作沟通经验](AI协作沟通经验.md) | 当前可参考 | 与 AI 协作时如何表达需求和纠偏。 |
| [小组编程与 AI 阶段 Skill 推荐清单](小组编程与AI阶段技能清单.md) | 教程参考 | 团队 AI 技能配置建议。 |
| [Codex 简介](codex_tutorial.md) | 教程参考 | Codex 入门。 |
| [Codex 基础配置教程](codex_setup_tutorial.md) | 教程参考 | Windows/macOS Codex 配置。 |
| [Codex Skill 简易教程](codex_skill_tutorial.md) | 教程参考 | Skill 创建和使用。 |
| [Prompt / Agent / Skill 教程](prompt_agent_skill_tutorial.md) | 教程参考 | 三者关系和示例。 |
| [WSL2 环境搭建执行清单](WSL2_环境搭建_执行清单.md) | 环境参考 | Windows WSL2 和远程开发准备。 |

## 4. 其他非 Markdown 资料

`docs/` 中还包含硬件或芯片资料 PDF，例如 OrangePi RV2 用户手册、OPI RV2 原理图和 Ky X1 芯片手册。这些是硬件移植和答辩材料的参考资料，不属于产品代码文档。

`ohos_electron_hap/` 是较大的 OpenHarmony Electron 参考工程，主要用于查 ArkTS/Electron/OpenHarmony 适配经验，不是当前主线产品目录。

## 5. 后续维护规则

1. 新增重要文档时，先把它加入本文对应分类。
2. 若文档与当前路线冲突，不要直接删除，先在文档开头加“状态说明”。
3. 当前主线变化时，同时更新本文、[文档状态与路线索引](文档状态与路线索引.md) 和根目录 [README](../README.md)。
4. OpenHarmony 专项经验优先写入 `openharmony-port/docs/OH开发经验与AI接手须知.md`。
5. 自动化或阶段记录类文档保留事实，不再作为最新开发指令。
