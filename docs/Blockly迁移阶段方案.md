# Blockly 迁移阶段方案

更新时间：2026-05-01

> 2026-05-09 更新：本方案已经完成阶段性技术验证。根据当前产品决策，Blockly 迁移版不再作为最终产品主线，而是保留为技术验证和工程参考。正式主线回到 `app/` 的非 Blockly 自研积木界面，并优先改造成桌面版。若本文后续章节仍出现“下一阶段迁移 Blockly”“第一版正式工程优先使用 Blockly”等表述，均视为历史路线记录，不再作为当前默认任务。详见 `docs/文档状态与路线索引.md` 和 `docs/技术路线决策与阶段复盘.md`。

## 1. 迁移目标

当前 `app/` 是无依赖 Web MVP，已经证明了核心教学闭环：

```text
指令积木编辑 → 汇编预览 → 教学模拟执行 → 机器状态 → 数据流动画 → 教学解释
```

下一阶段迁移 Blockly 的目标不是重写所有功能，而是把“积木拖拽、吸附、连接规则、排序、保存加载”等复杂交互交给更成熟的 Blockly 工作区，同时保留当前已经稳定的指令定义、解析、模拟器、示例案例和教学解释。

## 2. 迁移原则

1. 不直接丢弃当前 MVP。
2. 先抽离稳定核心，再接入 Blockly。
3. Blockly 只负责积木编辑和连接约束，不直接执行 RISC-V 指令。
4. 模拟器仍以结构化指令数组作为输入。
5. 数据流动画继续读取执行结果，不依赖 Blockly 内部对象。
6. 每完成一层迁移都保留可运行版本。

核心边界：

```text
Blockly Workspace
→ Blockly 解析层
→ Instruction[] 结构化指令
→ Simulator
→ ExecutionResult
→ UI / 数据流动画 / 机器状态
```

## 3. 官方资料依据

本迁移方案参考 Blockly 官方文档：

- Custom blocks overview: `https://developers.google.com/blockly/guides/create-custom-blocks/overview`
- Block-code generators: `https://developers.google.com/blockly/guides/create-custom-blocks/code-generation/block-code`
- Save and load / serialization: `https://developers.google.com/blockly/guides/configure/web/serialization`
- Blockly Developer Tools: `https://developers.google.com/blockly/guides/create-custom-blocks/blockly-developer-tools`

要点：

- 自定义领域通常需要自定义 block。
- 一个 block 至少需要 block definition、generator/parser、toolbox reference。
- 新项目保存工作区时优先使用 JSON serialization，而不是旧 XML。
- 复杂 block 可先用 JSON 定义，遇到高级行为再改 JavaScript 定义。

## 4. 推荐技术栈

建议正式工程采用：

```text
Electron + React + TypeScript + Vite + Blockly
```

理由：

- Electron：满足桌面软件展示和后续打包。
- React：适合拆分复杂工作台 UI。
- TypeScript：适合严谨定义 RISC-V 指令、寄存器、内存、执行结果。
- Vite：开发启动快，适合组内迭代。
- Blockly：提供成熟的拖拽、吸附、连接、工作区序列化能力。

## 5. 目标工程结构

建议新增正式工程目录：

```text
dachuang/
├── app/                         # 当前无依赖 MVP，保留作可运行参考
├── desktop/                     # 新 Electron + React + TS + Blockly 工程
│   ├── electron/
│   │   ├── main.ts
│   │   └── preload.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── blocks/
│   │   │   ├── riscvBlocks.ts
│   │   │   ├── toolbox.ts
│   │   │   └── blockTheme.ts
│   │   ├── parser/
│   │   │   ├── blocklyToInstruction.ts
│   │   │   └── instructionToAssembly.ts
│   │   ├── simulator/
│   │   │   ├── state.ts
│   │   │   ├── execute.ts
│   │   │   └── instructionTypes.ts
│   │   ├── components/
│   │   │   ├── WorkspacePane.tsx
│   │   │   ├── AssemblyPreview.tsx
│   │   │   ├── MachineStatePanel.tsx
│   │   │   ├── DatapathView.tsx
│   │   │   └── ExampleGallery.tsx
│   │   ├── examples/
│   │   │   └── examples.ts
│   │   └── styles/
│   │       └── app.css
│   ├── package.json
│   └── vite.config.ts
├── docs/
└── README.md
```

注意：

- `app/` 暂时不要删除，它是迁移期间的行为参考和答辩备用版本。
- `desktop/` 完成稳定后，再讨论是否把它提升为主应用。

## 6. 类型设计

优先把当前 `instructions.js` 和 `simulator.js` 中的隐式结构改为 TypeScript 类型。

建议核心类型：

```ts
type RegisterName = `x${number}`;

type OperandKind = "register" | "immediate" | "shamt" | "label";

interface InstructionDef {
  opcode: string;
  type: "R" | "I" | "S" | "B" | "J" | "PSEUDO";
  color: "arithmetic" | "logic" | "shift" | "memory" | "branch" | "jump";
  fields: string[];
  label: string;
  help: string;
}

interface Instruction {
  id: string;
  opcode: string;
  rd?: RegisterName;
  rs1?: RegisterName;
  rs2?: RegisterName;
  imm?: number;
  shamt?: number;
  label?: string;
  labelTag?: string;
  targetIndex?: number;
}

interface MachineState {
  registers: Record<RegisterName, number>;
  memory: Record<number, number>;
  pc: number;
  halted: boolean;
  logs: ExecutionLog[];
}
```

## 7. Block 设计

### 7.1 指令大积木

每条指令对应一个 statement block。

示例：

- `riscv_add`
- `riscv_addi`
- `riscv_lw`
- `riscv_sw`
- `riscv_beq`
- `riscv_jal`

Blockly 层中的 block 应表达：

```text
opcode + 字段连接/输入 + 上下顺序连接
```

不要让 block 直接修改模拟器状态。

### 7.2 操作数小积木

建议分成三类：

- `riscv_register`
- `riscv_immediate`
- `riscv_label_ref`

输入方式：

- 寄存器：下拉选择 `x0` 到 `x31`
- 立即数：数字输入
- shamt：数字输入并限制 `0..31`
- 标签：文本输入或从已有标签中选择

### 7.3 标签设计

用户已确认：标签应作为独立可拖动标签帽 block，并且要有积木感。

设计方向：

1. 标签 block 采用小积木形状。
2. 标签应贴在指令 block 左侧边缘，而不是长期占据指令主体内部。
3. 指令 block 需要提供可接受标签连接的侧边连接位。
4. 分支/跳转 block 使用标签引用字段或标签引用小积木指向目标。
5. 没有标签时，不显示冗余标签帽。

实现建议：

- 第一版可让指令 block 持有 `labelTag` 数据字段，但视觉上必须表现为左侧贴边的小标签积木。
- 第二版再实现真正独立 label block 与指令 block 的连接关系。
- Blockly 解析层最终仍输出 `labelTag` 和 `label`，供分支/跳转解析。

### 7.4 方形卡口外观

用户已确认：可以先接受 Blockly 卡口式连接，但卡口形状必须和积木一致，采用四四方方的小矩形缺口，而不是圆弧状或少儿编程风格的圆润缺口。

可行性判断：

- Blockly 支持 custom renderer。
- 官方文档说明可以通过自定义 renderer / constant provider 修改 connection shape。
- 可以覆盖 `makeNotch` 和 `makePuzzleTab`，把上下连接和输入输出连接绘制为矩形缺口。

实现策略：

1. 第一版使用 Blockly 内置 renderer，例如 `thrasos`，先跑通工作区和解析。
2. 第二步新增 `RiscVRenderer`，覆盖连接形状。
3. 将 `NOTCH_WIDTH`、`NOTCH_HEIGHT`、`TAB_WIDTH`、`TAB_HEIGHT` 调整为窄矩形。
4. 将圆角降到很小，例如 `CORNER_RADIUS = 1` 或 `2`。
5. 如果默认 renderer 仍然圆润，则自定义 `makeNotch` / `makePuzzleTab` SVG path。

验收标准：

- 上下拼接处像小矩形卡口。
- 输入/输出连接处也接近方形积木缺口。
- 不出现明显圆弧状 Scratch 风格缺口。
- 不影响拖拽、吸附、排序和解析稳定性。

## 8. 工具箱分类

Blockly toolbox 应按颜色和语义分类：

```text
算术：add / sub / addi
逻辑：and / or / xor / andi / ori / xori
移位：sll / srl / sra / slli / srli / srai
访存：lw / sw
分支：beq / bne / blt / bge / bltu / bgeu / bltz
跳转：jal / jalr / j
操作数：register / immediate / label
```

工具箱要求：

- 同类颜色一致。
- 每个 block tooltip 展示格式和教学解释。
- 不在左侧长期展示大段说明文字。
- 默认只展示紧凑 block，详细解释交给 hover、右侧说明区或执行日志。

## 9. 解析路线

不要直接依赖 Blockly 的代码生成字符串来执行。

推荐路线：

```text
Blockly Workspace
→ 遍历 top blocks
→ 按 next connection 得到程序顺序
→ 读取每个 block 的字段和输入
→ 生成 Instruction[]
→ 调用现有 parseProgram / simulator 逻辑
```

原因：

- 本项目需要教学解释和机器状态，不只是生成汇编文本。
- 结构化指令比字符串更适合测试。
- 后续支持错误提示、动画脚本、数据流阶段会更清晰。

可以同时提供：

```text
Instruction[] → 汇编文本
Instruction[] → JSON 调试输出
Instruction[] → 模拟执行
```

## 10. 保存与加载

建议使用 Blockly JSON serialization 保存工作区。

保存内容：

- Blockly workspace JSON
- 当前机器状态初始化配置
- 当前示例名
- 显示进制
- 演示模式开关
- 用户自定义案例名称
- 案例说明
- 可选教学提示文本

不建议用 XML 作为主格式，因为官方文档已经建议新项目优先使用 JSON。

用户已确认：需要保存功能，并且保存文件最好可以和软件自带样例一致。

因此建议统一案例格式：

```ts
interface RiscVTeachingCase {
  version: string;
  id: string;
  title: string;
  description: string;
  workspace: unknown;
  initialState: {
    registers: Record<string, number>;
    memory: Record<string, number>;
  };
  displayBase: "dec" | "bin" | "hex";
  notes?: string[];
}
```

内置案例和用户保存案例都走同一加载流程：

```text
读取案例文件
→ 恢复 Blockly workspace
→ 恢复机器状态初始化
→ 解析 Instruction[]
→ 更新汇编预览和数据流区
```

文件建议扩展名：

```text
.riscvteach.json
```

## 11. 迁移阶段安排

### 阶段 0：冻结当前 MVP

目标：

- 当前 `app/` 保持可运行。
- 所有后续迁移不破坏当前答辩演示版本。

验收：

```powershell
npm.cmd run check
npm.cmd test
```

当前执行状态：

- 已保持 `app/` MVP 可运行。
- 根目录 `npm.cmd run check` 与 `npm.cmd test` 已通过。

### 阶段 1：搭建 desktop 工程

目标：

- 初始化 Electron + React + TypeScript + Vite。
- 能打开桌面窗口。
- 能显示三栏工作台空壳。

暂不做：

- 不接 Blockly。
- 不迁移完整模拟器。

验收：

- `npm run dev` 可打开桌面窗口。
- 主界面包含左侧工具箱、中间工作区、右侧状态与动画区域。

当前执行状态：

- 已创建 `desktop/` 工程骨架。
- 已添加 Electron / React / TypeScript / Vite / Blockly 配置文件。
- 已添加 `WorkspacePane`、`MachineStatePanel`、`DatapathView`、`AssemblyPreview`、`ExampleGallery` 等组件雏形。
- `npm.cmd --prefix .\desktop run check` 已通过。
- `npm.cmd --prefix .\desktop run build` 已通过。

### 阶段 2：抽离核心逻辑

目标：

- 把当前 `instructions.js` 迁移成 `instructionTypes.ts`、`instructionDefs.ts`、`formatAssembly.ts`。
- 把当前 `simulator.js` 迁移成 `state.ts`、`execute.ts`。
- 保留现有测试用例并迁移到 TS 测试。

验收：

- 不依赖 UI 可运行核心测试。
- 新旧示例案例结果一致。

当前执行状态：

- 已迁移 `Instruction`、`InstructionDef`、`MachineState`、`TeachingCase` 等核心类型。
- 已迁移指令定义、汇编格式化、解析器、模拟器和部分示例案例。
- 已新增统一案例文件格式 `.riscvteach.json` 的序列化/反序列化雏形。
- `npm.cmd --prefix .\desktop run test:core` 在提升权限后已通过。

### 阶段 3：接入 Blockly 最小工作区

目标：

- 显示 Blockly workspace。
- 创建最少 3 条指令 block：`addi`、`add`、`lw`。
- 能拖拽、排序、删除。

验收：

- 用户能在 Blockly 中拼出 `addi x1, x0, 5`。
- 能生成结构化 `Instruction[]`。

当前执行状态：

- 已接入 Blockly 工作区组件。
- 已生成按类别分类的 toolbox。
- 已注册当前 v0.3 指令集对应 block。
- 已新增 `blocklyWorkspaceToInstructions` 解析桥接。
- 已新增 `instructionsToBlocklyState`，支持内置案例加载为 Blockly 工作区。
- 已实现 `.riscvteach.json` 的导出与导入入口，内置案例和用户保存案例开始走同一格式。
- 已新增 `riscv_square` 方形卡口 renderer 雏形，后续需在真实浏览器环境中继续调视觉。
- 标签帽已改为独立 `riscv_label_tag` 输出小积木，可插入每条指令左侧 `LABEL_TAG` 输入；解析层已能读取为 `labelTag`。视觉仍需继续微调到完全贴边效果。
- 机器状态初始化和点击详情已迁入 `desktop`，写入初始化值后会重置机器状态，并随案例文件一起保存。
- 方形卡口 renderer 已进一步收窄圆角并改写 notch/tab SVG path，后续需要在真实界面中做像素级验收。
- 指令字段已从内嵌字段推进为独立操作数小积木：`riscv_register`、`riscv_immediate`、`riscv_shamt`、`riscv_label_ref`。案例加载时会自动生成并连接这些小积木，解析时优先读取连接的小积木。
- 导入用户保存案例时已优先恢复 Blockly workspace JSON，保证用户拖拽布局、连接关系和标签帽能够保留；缺少 workspace 时再从 `instructions` 重建。
- Blockly 主工作区已加入尺寸变化监听和横向拖拽调整，避免面板变大后画布不刷新的问题。

### 阶段 4：扩展完整 v0.3 指令集

目标：

- 把 v0.3 已支持指令全部做成 block。
- 按分类构建 toolbox。
- 每个 block 有 tooltip 和字段校验。

验收：

- 现有所有示例案例能用 Blockly 表达。
- 示例可一键加载到 Blockly workspace。

### 阶段 5：连接机器状态与数据流动画

目标：

- Blockly 改动后实时更新汇编预览。
- 单步执行更新机器状态。
- 数据流动画读取执行结果，但暂时不重做视觉方案。
- 支持初始化寄存器/内存。
- 支持运行到结束，便于答辩演示一次性展示程序效果。
- 机器状态支持十进制、十六进制、二进制切换显示，并写入保存案例。

验收：

- 与当前 MVP 功能等价。
- 新增 Blockly 操作不破坏模拟执行。

### 阶段 6：桌面打包与演示优化

目标：

- 优先完成 Windows 本地打包。
- 保留演示模式。
- 增加样例工程保存/加载。

验收：

- 形成可双击运行的桌面程序。
- 可在无开发环境机器上演示。

当前执行状态：

- 已添加 `electron-builder` 配置和 `package:win` / `dist:win` 脚本。
- `npm.cmd --prefix .\desktop run build` 已通过。
- Windows 目录包已完成一次验收，产物位于 `desktop/release/win-unpacked/RISC-V可视化教学软件.exe`。
- 已新增 `npm.cmd --prefix .\desktop run repair:binaries`，用于绕过整包重装，单独修复 Electron 运行时下载不完整的问题。
- 当前诊断结论：
  - `app-builder-bin/win/x64/app-builder.exe` 已存在，electron-builder 命令入口可用。
  - 真正缺失的是 `desktop/node_modules/electron/dist/electron.exe`。
  - Electron 包的 `install.js` 本质上只做三件事：下载对应平台 zip、解压到 `dist`、写入 `path.txt`。
  - 因此可以手动/脚本化下载 `electron-v30.5.1-win32-x64.zip` 并解压，而不必每次删除整个 `node_modules`。
- 修复脚本默认使用 `https://npmmirror.com/mirrors/electron/`，也支持通过 `$env:ELECTRON_MIRROR` 更换 Electron 镜像。
- 若后续 app-builder 二进制再次缺失，可设置 `ELECTRON_BUILDER_BINARIES_MIRROR` 后重装依赖；electron-builder 本地代码也支持 `ELECTRON_BUILDER_BINARIES_DOWNLOAD_OVERRIDE_URL` 这类覆盖下载入口。
- 为了生成答辩演示目录包，当前已在 `desktop/package.json` 中关闭 `win.signAndEditExecutable`，避免无符号链接权限时 `winCodeSign` 解压失败。正式发布安装包时需要重新设计签名方案。

## 12. 测试方案

### 核心测试

- 指令格式化测试。
- 模拟器执行测试。
- 标签解析测试。
- `x0` 恒零测试。
- 逻辑/移位/分支/跳转测试。

### Blockly 解析测试

- `addi` block → `Instruction`
- `lw` block → `lw rd, imm(rs1)`
- `sw` block → `sw rs2, imm(rs1)`
- `jal` block → `jal rd, label`
- 伪指令 block 标记为 `PSEUDO`

### UI 测试

- 工具箱分类显示。
- block 可拖拽。
- 示例可加载。
- 单步执行状态同步。
- 保存后重新加载工作区。

## 13. 当前待确认问题

用户已在 2026-05-01 确认以下决策：

1. Blockly 卡口机制可以接受，但卡口必须尽量做成四四方方的小矩形缺口，不接受圆弧状少儿编程风格缺口。
2. 标签必须作为独立可拖动标签帽，形态为小积木，并与指令 block 左侧边相接。
3. 桌面端优先 Windows 打包。
4. 需要保存功能，保存文件最好与软件自带样例采用同一案例格式。
5. 数据流动画暂时不修改视觉方案，迁移时先复用当前 SVG/组件化思路。注意：这是 `desktop/` Blockly 验证版的历史策略；`app/` 主线已经改为机器状态格动画。

## 14. 推荐默认答案

当前默认执行策略：

- 先用 Blockly 连接机制跑通，再实现 `RiscVRenderer` 方形卡口。
- 标签从设计上按独立标签帽规划，早期实现可用数据字段过渡，但视觉必须表现为左侧贴边标签积木。
- 优先 Windows 桌面打包。
- 内置案例和保存案例使用统一 JSON 格式。
- 数据流动画暂时不重做，仅迁移为 React/SVG 组件。注意：这只适用于维护 `desktop/` 验证版；当前正式主线的动画说明以 `app/src/state-animation.js` 和 `docs/机器状态格动画重构方案.md` 为准。
