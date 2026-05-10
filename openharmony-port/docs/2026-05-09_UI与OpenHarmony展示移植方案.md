# 2026-05-09 UI 与 OpenHarmony 展示移植方案

更新时间：2026-05-09

本文记录将当前 `app/` 非 Blockly 自研积木主线的新 UI、机器状态格动画和 OpenHarmony 展示功能移植到 `openharmony-port/` 的理论方案。目标是先把结构边界和调试路线定清楚，后续在 DevEco Studio 和香橙派 RV2 真机上按清单逐项验证。

当前目标显示环境已调整为 1920x1080 屏幕。后续移植优先保证 1080p 教学展示体验，不再为了 1024x600 过度压缩左侧素材栏、右侧辅助栏和底部日志区。

## 1. 移植目标

当前 OpenHarmony 软件继续采用轻量承载路线：

```text
app/ 非 Blockly 自研积木
→ oh:sync 同步为 rawfile 静态资源
→ ArkTS Index.ets 创建 ArkWeb
→ ArkWeb 加载 $rawfile('app/index.html')
→ OpenHarmonyBridge 预留原生能力
```

本轮要保证 OpenHarmony 版具备以下产品内部能力：

- 底层画布式积木编辑区。
- 左侧素材栏、右侧辅助栏、底部日志区的新版布局。
- 编辑区缩放按钮与双指缩放逻辑。
- 右侧 `机器 / 代码 / 说明` 辅助页签。
- 机器状态页中的 `state-animation-dock` 表达式动画挂载位。
- OpenHarmony 展示栏与执行动画的临时让位逻辑。
- PC 在顶部执行进度条旁显示。
- OpenHarmony 概念页和工作台展示按钮。
- 顶部运行环境标识显示 `OpenHarmony ArkWeb · 1920x1080 · 当前视口`，用于确认 HAP 是否加载了新移植资源。
- 顶部工具栏在 OH 版中优先使用 2-3 字短文字按钮，长说明放入悬停提示，避免纯图标过于抽象。
- 分步执行与 OpenHarmony 展示控制使用白底线性图标，不使用 emoji，保持与工具栏背景一致。
- 重置图标箭头方向应向右，避免和上一步方向混淆。
- OpenHarmony 展示模式不再提供第二套上步/下步/重置按钮，统一复用顶部主控制按钮。
- 指令积木选择区和指令编辑区必须左右相邻，不能让素材栏覆盖在编辑画布上。
- 指令编辑区标题栏独立占位，网格画布从标题栏下沿开始，标题不能遮挡拼接区域。
- OpenHarmony 展示模式中的“香橙派 / 软总线”标记必须放在 `instruction-list` 缩放层内，跟随积木同步放大、缩小和平移。
- 软总线标记高度应根据 OpenHarmony 展示布局中的最底层积木动态延伸，避免连接光点落在卡片外。
- 移除独立“演示模式”，课堂放大展示统一依赖 OpenHarmony 展示和画布缩放。
- 执行日志与教学反馈默认收起，通过画面底部的小三角抽屉按钮按需打开。
- 左侧素材栏和右侧辅助栏在 OH 版保留拖拽调宽能力。

## 2. 分层方案

### 2.1 Web 主线层

以下内容以 `app/` 为唯一源头，不在 rawfile 中手工改：

```text
app/index.html
app/styles.css
app/src/app.js
app/src/state-animation.js
app/src/machine-state.js
app/src/instructions.js
app/src/simulator.js
app/src/operand-model.js
app/src/ui-utils.js
app/src/case-format.js
```

这些文件负责产品功能本身，包括积木、画布、缩放、右侧辅助栏、机器状态格动画、OpenHarmony 展示 UI 和教学说明。

### 2.2 OpenHarmony 覆盖层

以下内容只存在于 `openharmony-port/`，用于适配 ArkWeb 与 1024x600 小屏：

```text
openharmony-port/entry/src/main/resources/rawfile/app/openharmony-port.css
openharmony-port/entry/src/main/resources/rawfile/app/openharmony-bridge.js
openharmony-port/scripts/templates/datapath-openharmony-stub.js
openharmony-port/entry/src/main/ets/pages/Index.ets
```

职责划分：

- `openharmony-port.css`：覆盖布局尺寸、工具栏紧凑度、触控/鼠标手感、小屏横向空间。
- `openharmony-bridge.js`：给 Web 层提供 `window.RiscVOpenHarmony` 包装对象。
- `datapath-openharmony-stub.js`：替换旧数据流动画，保留执行文案所需函数。
- `Index.ets`：创建 ArkWeb、开启 JS/DOM Storage/File Access、注入 `OpenHarmonyBridge`。

### 2.3 同步脚本层

每次修改 `app/` 后，统一执行：

```powershell
npm.cmd run oh:check
```

它会执行：

```text
oh:sync
→ 复制 app/src 到 rawfile/app/src
→ 跳过完整 datapath.js
→ 复制 app/styles.css
→ 注入 openharmony-port.css
→ 注入 openharmony-bridge.js
→ 写入 OpenHarmony datapath stub
→ 生成 ArkWeb 诊断页
→ 执行 rawfile smoke
```

后续不要手动复制 rawfile 中的主线文件，否则容易造成 PC 端和 OpenHarmony 端分叉。

## 3. 新 UI 在 OH 中的落点

| 功能 | Web 主线来源 | OH 适配策略 | 调试重点 |
| --- | --- | --- | --- |
| 画布式编辑区 | `app/index.html`, `app/styles.css` | rawfile 直接同步，OH CSS 限制最小宽度和可滚动范围 | 1024x600 下是否能看到素材栏、画布和右侧入口 |
| 视图缩放 | `zoomOutBtn`, `zoomResetBtn`, `zoomInBtn`, `canvasScale` | rawfile 直接同步 | 缩放后拖拽坐标是否正确，双指缩放是否误触滚动 |
| 右侧辅助栏 | `assistant-panel`, `机器/代码/说明` 页签 | rawfile 直接同步，OH CSS 可调整宽度或改为固定右栏 | 自动打开是否遮挡拼接 |
| 机器状态动画 | `app/src/state-animation.js`, `stateAnimationDock` | rawfile 直接同步 | 表达式卡片是否清晰，动画结束是否清理 |
| OpenHarmony 展示栏 | `workspaceHarmonyPanel`, `harmonyWorkspaceToggleBtn` | rawfile 直接同步 | 展示栏打开/收起、步骤切换、动画让位恢复 |
| 软总线锚点 | `softbus-canvas-anchor` | 放入 `instruction-list` 缩放层 | 缩放画布时应和积木同步变化，不遮挡其他积木 |
| PC 显示 | `pcValue` 顶部内联显示 | rawfile 直接同步 | 进度条、PC 和工具栏在小屏是否挤压 |
| 代码预览 | 右侧 `代码` 页 | rawfile 直接同步 | 汇编文本是否可滚动，是否不再显示 JSON |
| 教学说明 | 右侧 `说明` 页 | rawfile 直接同步 | 说明页是否默认不占拼接区 |
| 执行日志 | `logPanelBtn`, `log-panel` | 默认收起，按需打开并可调高度 | 是否遮挡拼接区，收起后是否释放空间 |
| 旧数据流动画 | `app/src/datapath.js` | OH 中继续替换为 stub | 不应恢复独立 `.visual-panel` |

## 4. OpenHarmony 展示功能理论流程

OpenHarmony 展示保留两个入口：

1. 顶部工具栏的 `OpenHarmony 展示` 按钮。
2. 顶部导航中的 `OpenHarmony 概念` 页面。

工作台展示的推荐交互流程：

```text
点击 OpenHarmony 展示
→ 进入 harmony-workspace-mode
→ 当前指令积木出现硬件通信视角标记
→ 使用上一步/下一步切换展示阶段
→ 讲解“软件积木 → 连接识别 → 软总线/硬件协同 → 执行反馈”
→ 收起展示栏回到普通拼接
```

执行动画与展示栏的冲突处理：

```text
若 OpenHarmony 展示栏打开
→ 单步执行或自动运行时 state-animation-dock 临时替换展示栏
→ 动画结束后恢复 OpenHarmony 展示栏
```

这个逻辑应保持在 Web 层，ArkTS 壳只负责承载，不参与动画状态判断。

## 5. ArkWeb 调试风险

### 5.1 鼠标与触屏事件

RV2 上曾观察到鼠标拖拽和触屏拖拽表现不同。当前理论策略：

- PC 浏览器继续使用标准 pointer/mouse 拖拽。
- OpenHarmony runtime 下保留点击填槽兜底逻辑。
- 触屏拖拽优先保证指令大积木可移动。
- 小积木拖拽如果 ArkWeb 事件不稳定，短期允许点击选择 + 点击槽位填入。
- 后续再针对 ArkWeb 的 pointer capture、touch-action 和滚动冲突逐项调试。

### 5.2 1920x1080 教学屏

当前 `openharmony-port.css` 以 1920x1080 教学屏为主要目标：

- 顶部工具栏保持紧凑，但不再极限压缩按钮。
- 常用命令优先显示为短文字，例如 `清空`、`保存`、`导入`；分步执行类命令使用简洁线性图标。
- 左侧素材栏恢复到接近桌面版的宽度，便于选择指令和操作数。
- 右侧辅助栏保留更宽的机器状态、代码和说明阅读空间。
- 底部日志区不再常驻，课堂需要解释时再展开。
- 必要时仍允许页面横向滚动，但不再以 1024x600 为主要约束。

后续真机调试时优先观察：

- 左侧素材栏是否能完整点击。
- 工具栏按钮是否换行过多。
- 右侧辅助栏展开后是否仍保留足够拼接区域。
- 缩放按钮是否能解决积木堆叠后的可视问题。
- 顶部运行环境标识中的实际视口是否接近 `1920x1080`。

### 5.3 rawfile 与缓存

ArkWeb 可能缓存 rawfile 页面。每次 UI 变化后建议：

```text
重新执行 npm.cmd run oh:check
重新 Build/Run HAP
必要时卸载旧包或清应用数据
```

如果真机仍显示旧界面，优先排查：

- `openharmony-port/entry/src/main/resources/rawfile/app/index.html` 是否已更新。
- DevEco 是否重新构建了 HAP。
- 板端是否安装的是新的 signed HAP。

## 6. 后期调试验收清单

### 6.1 本地静态检查

在仓库根目录执行：

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run oh:check
```

应确认 rawfile 中存在：

```text
state-animation-dock
harmonyWorkspaceToggleBtn
zoomOutBtn / zoomResetBtn / zoomInBtn
pcValue
assistant-panel
workspaceHarmonyPanel
openharmony-port.css
openharmony-bridge.js
```

### 6.2 DevEco 检查

- Sync Project 成功。
- `entry` 运行配置出现。
- HAP 构建不报 syscap、SDK 或签名错误。
- 安装到 RV2 后 ArkWeb 不白屏。

### 6.3 真机功能检查

按以下顺序验收：

1. 页面打开后能看到左侧素材栏、画布、顶部工具栏。
2. 顶部运行环境标识显示 `OpenHarmony ArkWeb · 1920x1080 · <实际视口>`。
3. OH 真机首次打开时右侧辅助栏默认显示机器页。
4. 顶部工具栏不需要横向滑动即可看到常用命令。
5. 鼠标悬停在短文字按钮上能看到更完整命令说明。
6. 分步执行和 OpenHarmony 展示控制是白底线性图标，不是 emoji。
7. 重置图标箭头方向向右。
8. 暂停图标两根竖线粗细一致。
9. OpenHarmony 展示模式下，顶部主控制按钮直接控制展示步骤，不出现第二套步骤按钮。
10. 左侧素材栏和指令编辑区没有重叠，边界在同一条竖线上。
11. 指令编辑区网格从标题框下沿开始，标题框不遮挡拼接区域。
12. OpenHarmony 展示模式下，软总线标记随画布缩放一起变化。
13. 软总线标记高度覆盖最底层展示积木的连接点。
14. 页面中不再出现独立“演示模式”按钮。
15. 右侧辅助栏拖拽调宽后，机器页仍可正常滚动。
16. 执行日志默认收起，底部小三角按钮可展开/收起日志抽屉。
17. 点击 `addi/add/sub` 能加入编辑区。
18. 点击 `x1` 或立即数后能填入槽位。
19. 触屏拖动指令大积木可移动。
20. 缩放按钮可改变画布比例。
21. 双指缩放不导致页面失控滚动。
22. 单步执行会自动切到机器页。
23. 表达式卡片出现在机器页顶部。
24. PC 在顶部进度条旁更新。
25. OpenHarmony 展示可打开、切换步骤、收起。
26. 执行动画期间 OpenHarmony 展示临时让位，结束后恢复。
27. 代码页只显示汇编预览。
28. 说明页不再长期占用拼接区。

## 7. 后续实现优先级

1. 先保证 `oh:check` 能检查新 UI 关键标记。
2. 在 DevEco 中确认 rawfile 新内容随 HAP 一起打包。
3. 在 RV2 上验证 ArkWeb 页面不是旧版本。
4. 调触屏/鼠标拖拽与画布缩放冲突。
5. 调右侧辅助栏在 1024x600 下的默认展开策略。
6. 再接原生保存/导入、截图或课堂案例持久化。

## 8. 当前结论

本轮理论方案不改变 OpenHarmony 工程架构，不做 ArkUI 原生重写，也不恢复 Electron HAP。新 UI 和 OpenHarmony 展示功能应继续从 `app/` 单向同步到 rawfile，由 `openharmony-port.css` 做小屏和 ArkWeb 适配，由 `Index.ets` 保持轻量壳职责。这样后期调试可以集中在 ArkWeb 行为、设备分辨率、输入事件和 HAP 构建部署上，而不是同时维护两套产品界面。
