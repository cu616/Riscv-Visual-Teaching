# 长期自动化开发任务：非 Blockly 主线工程化

日期：2026-05-04

## 1. 总目标

本长期任务面向无人值守开发，目标是在不等待用户逐步审阅的情况下，把当前 `app/` 非 Blockly 原型推进成更稳定、更容易维护、更接近真实积木拼接的主线工程。

核心路线：

```text
稳定打开
→ 模块拆分
→ 自由小积木与吸附模型工程化
→ 保存/导入可靠化
→ UI 验收路径明确化
→ Electron 原生桌面壳后续修复
```

## 2. 不变原则

1. 不迁移到 Blockly。
2. 不引入新依赖。
3. 不一次性重写全部拖拽系统。
4. 每个阶段都必须能通过：

```powershell
npm.cmd run check
npm.cmd test
```

5. 每个阶段必须留下文档线索，让用户明早能快速定位问题。
6. 优先保住可演示性，再追求工程优雅。

## 3. 阶段规划

### 阶段 A：启动与验收基础

目标：用户双击能打开，明早能快速验收。

已完成：

- `打开非Blockly自研积木桌面版.bat`
- `scripts/launch_non_blockly_app.ps1`
- `docs/明早验收与问题定位清单.md`

验收：

- 双击入口能打开应用窗口模式。
- `logs/launch_non_blockly_app.log` 能记录启动过程。

### 阶段 B：主文件瘦身

目标：降低 `app/src/app.js` 的维护风险。

已完成：

- `app/src/datapath.js`
- `app/src/ui-utils.js`
- `app/src/case-format.js`

继续执行：

- 抽离自由小积木与吸附状态模型到 `app/src/operand-model.js`。
- 保留 DOM 事件绑定在 `app/src/app.js`，但把状态变更交给模型函数。

验收：

- `app/src/app.js` 中不再直接手写 loose operand 的增删改纯逻辑。
- 模型函数有核心测试覆盖。

### 阶段 C：真实小积木吸附体验

目标：让操作数真正像独立小积木。

已完成第一版：

- 小积木可停留在画布。
- 小积木靠近槽位自动吸附。
- 吸附目标高亮。
- 吸附后可拖出。
- 立即数双击可编辑。
- 自由小积木可双击删除。

继续执行：

- 调整吸附阈值和目标选择策略。
- 把立即数编辑从 `prompt` 改为更自然的轻量浮层。已完成。
- 为错误类型拖拽增加更明确提示。

明早重点反馈：

- 吸附是否太灵敏。
- 槽位高亮是否清楚。
- 拖出行为是否符合直觉。

### 阶段 D：保存 / 导入可靠化

目标：案例可保存、可恢复、可继续演示。

已完成：

- `.riscvteach.json`
- 保存 `instructions`
- 保存 `looseOperands`
- 保存 `displayBase`

继续执行：

- 保存机器初始寄存器 / 内存配置。
- 保存教学备注和演示步骤字段。
- 增加保存格式版本兼容策略。

验收：

- 保存后清空，再导入能恢复当前画布。
- 自由小积木位置保留。
- 显示进制保留。

### 阶段 E：测试与自动验收

目标：降低无人值守开发风险。

继续执行：

- 给 `operand-model.js` 增加纯函数测试。已完成。
- 给 `case-format.js` 增加更多 round-trip 测试。已完成。
- 增加轻量 HTTP 启动验收。已完成，入口为 `npm.cmd run smoke`。
- 后续如允许再接 Playwright。

验收：

- `npm.cmd run check` 通过。
- `npm.cmd test` 通过。
- `npm.cmd run smoke` 通过。
- 测试失败时能定位到模块。

### 阶段 F：Electron 原生桌面壳

目标：最终生成真正 exe。

当前状态：

- `self-desktop/` 已存在。
- Electron 启动器退出码为 1，尚未进入 `main.js`。
- 当前稳定替代方案是 Edge / Chrome 应用窗口模式。

继续执行：

- 排查 Electron 包完整性和启动器退出原因。
- 修复 `npm.cmd run self:electron`。
- 修复 `npm.cmd run self:package:win`。

验收：

- 能打开原生 Electron 窗口。
- 能打包 Windows 目录包。

## 4. 长时间无人值守执行策略

每一轮按这个节奏：

1. 选择一个低耦合模块。
2. 写或更新文档。
3. 小步改代码。
4. 运行 `npm.cmd run check`。
5. 运行 `npm.cmd test`。
6. 记录结果和剩余风险。
7. 继续下一步，不停在“计划完成”。

## 5. 明早用户反馈最小格式

如果发现问题，只需反馈：

```text
问题类型：
复现步骤：
看到的现象：
期望效果：
```

我会按 `docs/明早验收与问题定位清单.md` 中的问题定位表接着修。

## 6. 当前执行点

本次长期任务立即执行：

```text
阶段 B：抽离自由小积木与吸附状态模型
```

目标产物：

- `app/src/operand-model.js`
- `app/test-core.mjs` 中的模型测试
- 文档更新
- 检查与测试通过

执行记录：

- 已新增 `app/src/operand-model.js`。
- 已将自由小积木创建、导入归一化、拖出字段清空、吸附写入、自由小积木更新/删除抽成纯函数。
- 已在 `app/test-core.mjs` 中补充模型测试。
- 后续 `app/src/app.js` 仍负责 DOM 事件绑定和视觉反馈，但状态变更优先调用模型函数。
- 已为 `app/src/case-format.js` 预留 `initialState` 和 `notes` 字段，并补充 round-trip 测试，为后续机器初始状态和教学备注保存做兼容准备。
- 已新增 `app/smoke-http.mjs`，并把 `app/server.mjs` 改成可导入创建服务，避免自动化测试依赖额外子进程。
- 已将立即数双击编辑从浏览器 `prompt` 改为页面内轻量浮层，保留整数校验和取消操作。
- 当前三条无人值守验证命令均已通过：`npm.cmd run check`、`npm.cmd test`、`npm.cmd run smoke`。
