# 2026-05-11 UI 交互改动与 Windows 桌面版同步说明

更新时间：2026-05-11

本文记录“上次提交之后到本次准备提交之前”的产品内部 UI 与交互改动，目标是方便后续把同等体验同步到 Windows 桌面版。当前主线仍是 `app/` 非 Blockly 自研积木界面；`openharmony-port/` 通过 rawfile 同步承载这套界面。

## 1. 本轮总体结论

本轮改动不是单纯 OpenHarmony 专用修补，而是对 `app/` 主线 UI 的一组可复用交互优化。Windows 桌面版如果继续通过 `self-desktop/` 或浏览器应用窗口承载 `app/`，理论上可直接获得这些能力；如果后续迁移到独立 Electron/React UI，则应按本文拆分同步。

核心变化：

- OpenHarmony 展示与 CPU 执行动画不再互相抢占。
- 重置按钮同时重置 CPU 执行状态和 OpenHarmony 展示步骤。
- 右侧辅助栏支持宽度和高度调整，内部滚动修复到能看到内存区底部。
- 数据演示动画卡片可拖动，并显示明确对象名。
- 新增“撤销”编辑操作，与“上一步执行”区分。
- 页面高度改为真实 `100vh` flex 布局，避免底部白条和主体白屏。
- OpenHarmony 端继续禁用原生 HTML5 drag/drop，保留自定义降级拖拽。

## 2. 功能改动明细

### 2.1 OpenHarmony 展示与执行控制解耦

旧状态：

- 打开 OpenHarmony 展示后，部分执行按钮被展示步骤接管。
- 自动执行会被 OpenHarmony 展示模式禁用。
- 数据动画出现时，OpenHarmony 展示卡片会被隐藏。

新状态：

- `上步 / 下步 / 暂停 / 自动 / 重置` 重新服务于 CPU 执行流程。
- OpenHarmony 展示打开时，自动执行仍可运行。
- 自动执行时，数据动画卡片和 OpenHarmony 展示卡片在右侧辅助栏中上下共存。
- 关闭 OpenHarmony 展示时，OpenHarmony 展示卡片自动隐藏，不继续占据辅助栏空间。

实现要点：

- `handlePreviousCommand()` 和 `handleNextCommand()` 不再优先推进 `harmonyStep`。
- `handleResetCommand()` 同时调用 `setHarmonyStep(0)` 与 `resetMachine()`。
- `updateRunState()` 不再用 `app.harmonyWorkspaceMode` 禁用自动执行。
- CSS 移除了 `body.state-animation-active .workspace-harmony-panel:not([hidden]) { display: none; }` 这类互斥规则。

Windows 桌面版同步建议：

- 如果 Windows 桌面版也存在“展示模式”和“执行模式”，不要让展示模式抢走执行按钮。
- 展示面板应作为辅助信息，不应阻断正常单步和自动执行。

### 2.2 数据演示动画卡片优化

旧状态：

- 动画卡片只显示 `旧值 -> 新值`，学生很难知道是哪一个寄存器、存储器单元或 PC 发生变化。

新状态：

- 寄存器写回显示为：`寄存器 x1: 0 -> 5`
- 存储器写入显示为：`存储器[8]: 0 -> 12`
- PC 更新显示为：`PC: 0 -> 1`
- 数据动画统一进入 `stateAnimationDock`，操作徽标和表达式卡片都在同一处出现。
- `stateAnimationDock` 支持拖动位置，双击恢复默认位置。

涉及文件：

- `app/src/state-animation.js`
- `app/src/app.js`
- `app/styles.css`

Windows 桌面版同步建议：

- 动画卡片必须带对象名，不要只显示裸数字变化。
- 建议在桌面版保留“可拖动动画卡片”，尤其适合投影或小窗口时临时避开关键内容。
- “存储器”和“寄存器”不要混叫。寄存器用 `寄存器 xN`，存储器用 `存储器[address]`。

### 2.3 右侧辅助栏尺寸与滚动修复

新增能力：

- 右侧辅助栏原有横向调宽能力保留。
- 新增底部高度拖拽条，可调整辅助栏高度。
- 辅助栏内部滚动层改为 `.assist-scroll` 独立负责纵向滚动。
- 修复触屏/ArkWeb 下滚不到底、内存区看不到的问题。

实现要点：

- 新增 CSS 变量 `--assistant-height`。
- 新增 DOM：`assist-height-resize-handle`。
- `bindPaneResize()` 支持 `data-resize="assistant-height"`。
- `.assist-scroll` 使用 `overflow-y: auto`、`touch-action: pan-y`、`padding-bottom` 和 `min-height: 0`。

Windows 桌面版同步建议：

- 桌面端也建议保留辅助栏高度调节，因为教师演示时可能需要临时俯瞰更多编辑画布。
- 不要把滚动交给整个页面。辅助栏内部应有明确滚动容器。

### 2.4 新增编辑撤销

新增入口：

- 顶部工具栏新增 `撤销` 按钮。

撤销范围：

- 添加指令积木。
- 删除指令积木。
- 移动指令积木。
- 多选移动积木。
- 添加、删除、移动自由小积木。
- 小积木填入槽位。
- 清空程序。
- 导入案例。
- 修改初始机器状态。
- 加载示例案例。

不属于该撤销范围：

- CPU 执行的上一步/下一步。
- 自动执行中的运行状态。
- 临时动画进度。

设计原则：

- “上步”表示执行历史回退。
- “撤销”表示编辑历史回退。
- 两者必须分开，否则课堂中容易把程序执行状态和积木编辑状态混淆。

实现要点：

- 新增 `app.editHistory`。
- 新增 `createEditSnapshot()`、`pushEditHistory()`、`undoLastEdit()`、`syncUndoButton()`。
- 编辑前保存快照，撤销时恢复 `rawInstructions`、`looseOperands`、选择状态、初始状态、备注、显示进制和 OpenHarmony 展示步骤。

Windows 桌面版同步建议：

- Windows 版应绑定 `Ctrl+Z` 到同一套编辑撤销逻辑，但需要避开输入框焦点。
- 保存/导入前也应入栈，避免误导入后无法恢复课堂现场。

### 2.5 页面高度与底部白条修复

发现问题：

- 顶部工具栏功能变多后，旧的 `.workspace-grid { min-height: calc(100vh - 154px); }` 不再可靠。
- 底部日志抽屉按钮是白底条，视觉上像画面最底部多出一截白色区域。
- 修复过程中曾出现主体白屏，原因是 `main` 没有成为 flex 容器，导致工作区高度链断开。

最终修复：

- `.app-shell` 改为 `height: 100vh` 的 flex column。
- `main` 改为 flex column。
- `#workspace.view.active` 改为 flex column 且 `height: 100%`。
- `.workspace-grid` 使用 `flex: 1` 和 `height: 100%` 兜底。
- 底部日志入口改为小型半透明浮动把手，减少白条感。

Windows 桌面版同步建议：

- Windows 桌面壳应避免用固定 `100vh - Npx` 猜工作区高度。
- 顶部工具栏可能换行，主体高度必须来自 flex/grid 剩余空间。
- 改布局后必须做“只有顶部按钮、下方全白”的回归检查。

### 2.6 原生拖拽恢复尝试与回退结论

本轮曾短暂尝试在新 1080p 屏幕下恢复完整 HTML5 drag/drop 动画，结果 OpenHarmony 真机仍然闪退。

当前结论：

- OpenHarmony ArkWeb/RV2 环境仍不适合启用原生 HTML5 drag/drop。
- OpenHarmony 端继续禁止 `draggable`、`dataTransfer` 路径。
- 保留自定义触摸/鼠标降级拖拽和点击填槽。
- Windows 桌面版不受这个限制，可继续使用完整指针拖拽或桌面端自定义拖拽。

Windows 桌面版同步建议：

- 不要因为 OpenHarmony 降级而削弱 Windows 桌面版拖拽体验。
- 跨端代码中需要保留 `runtime.isOpenHarmony` 这类分支。
- Windows 版可优先追求完整拖拽动画；OpenHarmony 版优先稳定。

## 3. 主要涉及文件

主线文件：

```text
app/index.html
app/styles.css
app/src/app.js
app/src/state-animation.js
```

OpenHarmony 同步目标：

```text
openharmony-port/entry/src/main/resources/rawfile/app/index.html
openharmony-port/entry/src/main/resources/rawfile/app/styles.css
openharmony-port/entry/src/main/resources/rawfile/app/src/app.js
openharmony-port/entry/src/main/resources/rawfile/app/src/state-animation.js
openharmony-port/entry/src/main/resources/rawfile/app/openharmony-port.css
```

诊断页由 `oh:check` 重新生成：

```text
openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/
```

## 4. 给 Windows 桌面版的迁移顺序

建议按以下顺序同步，不要一次性把所有视觉和交互混在一起：

1. 先同步布局高度修复，保证主界面不白屏、不出现底部残段。
2. 再同步辅助栏高度调节和内部滚动。
3. 再同步数据动画卡片文案和可拖动位置。
4. 再同步编辑撤销栈。
5. 最后同步 OpenHarmony 展示与执行动画共存逻辑。

每一步同步后都应至少验证：

- 打开工作台后编辑区、素材栏、辅助栏是否完整显示。
- 右侧辅助栏是否能滚动到寄存器和存储器区域底部。
- 单步执行、自动执行、暂停、重置是否不互相抢状态。
- 数据动画卡片是否带对象名。
- 误删或误填槽位后，撤销是否能恢复。

## 5. 验证命令

本轮本地已使用：

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run oh:check
```

说明：

- `check` 只验证 JS 语法。
- `test` 验证解析器、模拟器和模型逻辑。
- `oh:check` 负责同步 rawfile、生成 ArkWeb 诊断页并做静态 smoke。
- 真机是否白屏、拖拽是否闪退、触屏滚动是否顺滑，仍需要 DevEco Studio + 香橙派设备人工验证。

## 6. 仍需注意的风险

- `app/src/app.js` 仍然偏大，撤销、拖拽、执行、展示逻辑后续应拆分模块。
- 撤销栈目前是内存栈，不持久化到案例文件。
- 数据动画 dock 位置目前只保存在运行时状态，刷新后回到默认位置。
- OpenHarmony 上完整 HTML5 拖拽仍会导致闪退，不要在 OH 运行时开启。
- Windows 桌面版如果改成独立 Electron/React 状态管理，需要把编辑快照和执行快照分成两个 store。

## 7. 2026-05-11 后续交互修正补充

本轮在前述 UI 调整基础上，继续根据真机和课堂观察需求修正数据动画、机器状态面板和 OpenHarmony 专用覆盖样式。

### 7.1 数据动画暂停与速度档重标定

新增动画暂停/继续能力：

- 点击顶部暂停按钮时，如果当前正在播放数据动画，会冻结在当前动画帧。
- 再次点击暂停按钮，会从冻结进度继续播放，而不是重新播放或直接跳过。
- 自动执行会等待当前动画继续完成后再进入下一条指令。

速度档位重新定义：

- 删除旧的 `0.5x` 档位。
- 当前档位为 `1x / 1.5x / 2x`。
- 新的 `1x` 对应更慢、更适合课堂观察的播放节奏，方便学生暂停后阅读卡片。

实现位置：

```text
app/index.html
app/src/app.js
app/src/state-animation.js
openharmony-port/entry/src/main/resources/rawfile/app/index.html
openharmony-port/entry/src/main/resources/rawfile/app/src/app.js
openharmony-port/entry/src/main/resources/rawfile/app/src/state-animation.js
```

### 7.2 数据变化卡片改为并排阅读

原先数据动画卡片只显示类似 `0 -> 5` 的数值变化，学生不容易判断变化目标。本轮改为目标明确的卡片：

- 寄存器写回显示为 `寄存器 xN`。
- 存储器写入显示为 `存储器[address]`。
- PC 更新显示为 `PC`。
- 当一条指令同时产生寄存器/存储器变化和 PC 变化时，两张卡片左右并排同时出现。

这样暂停动画后，课堂上可以同时看到“数据写到哪里”和“PC 怎么走”。

实现位置：

```text
app/src/state-animation.js
app/styles.css
openharmony-port/entry/src/main/resources/rawfile/app/src/state-animation.js
openharmony-port/entry/src/main/resources/rawfile/app/styles.css
```

### 7.3 “内存”文案统一改为“存储器”

机器状态面板中的“内存”统一改为“存储器”，以便和计算机组成原理、体系结构课堂术语保持一致。

涉及位置：

- 机器状态标题区域。
- 初始化目标下拉框。
- 初始化目标提示文案。
- 存储器单元 title。
- 数据动画卡片中的存储器写入提示。

注意：源码内部变量仍保留 `memory`，这是数据模型字段，不建议仅为中文文案改名，以免扩大修改面。

### 7.4 机器状态初始化五项并排

机器状态初始化区包含五个控件：

```text
寄存器/存储器 | 目标编号 | 数值 | 写入 | 清除
```

本轮要求这五项：

- 必须在一行并排。
- 总宽度与上一排 `十进制 / 二进制 / 十六进制` 按钮一致。
- 数值输入框不能过宽挤占其他四项。

主样式中已设置为五列 grid：

```css
.state-editor-row {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(42px, 0.62fr) minmax(0, 0.72fr) minmax(0, 0.72fr);
  gap: 6px;
  width: 100%;
}
```

### 7.5 OpenHarmony 覆盖层问题记录

真机上曾出现“主样式已经改成五列，但 OH 仍显示两列”的问题。最终原因不是 DevEco 没同步，也不是 ArkWeb 不支持 grid，而是 OpenHarmony 页面后加载了专用覆盖文件：

```html
<link rel="stylesheet" href="./styles.css" />
<link rel="stylesheet" href="./openharmony-port.css" />
```

由于 `openharmony-port.css` 后加载，它覆盖了主样式。该文件中原有规则：

```css
.state-editor-row {
  grid-template-columns: 1fr 1fr;
}
```

会强制机器状态初始化区变成两列，导致五项无法并排。当前已在 OH 覆盖层同步改为五列：

```text
openharmony-port/entry/src/main/resources/rawfile/app/openharmony-port.css
```

后续凡是 OH 真机显示与 Web 主线不一致，应优先检查：

1. `app/styles.css` 是否已改。
2. `npm.cmd run oh:sync` 是否已同步 rawfile。
3. `openharmony-port.css` 是否存在后加载覆盖规则。
4. DevEco 是否使用旧 build/rawfile 缓存，必要时清理 `openharmony-port/entry/build` 后重跑。

### 7.6 本轮验证

本轮改动后已通过：

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run oh:check
npm.cmd run smoke
```

其中 `oh:check` 会重新同步 rawfile、生成 ArkWeb 诊断页并执行 OpenHarmony 静态冒烟检查。
