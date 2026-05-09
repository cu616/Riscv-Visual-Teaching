# RISC-V 可视化教学桌面软件开发步骤指南

> 基于《基于 RISC-V 指令集可视化教学的桌面软件》理论产品说明书大纲整理。  
> 目标：把产品大纲转成可执行的开发路线，指导后续使用 Codex / AI vibecoding 逐步完成原型和迭代。

> 状态说明（2026-05-09）：本文是早期开发路线草案，其中大量内容默认使用 Electron + React + TypeScript + Blockly，并保留旧“数据流动画”说法。当前项目主线已经调整为 `app/` 非 Blockly 自研积木，`desktop/` Blockly 工程只作为技术验证和参考资产。后续开发若与本文冲突，以 `docs/文档状态与路线索引.md`、`README.md`、`docs/工程目录与代码分区说明.md`、`docs/下一阶段版本计划.md` 为准。

## 1. 项目开发总原则

### 1.1 先做最小闭环，再做扩展

第一版不要追求完整 RISC-V、完整 CPU 或复杂课程系统。  
最重要的是先跑通这一条主链路：

```text
非 Blockly 自研积木拖拽
→ 生成结构化指令
→ 生成汇编文本
→ 模拟执行
→ 更新寄存器 / 内存 / PC
→ 展示执行日志
→ 播放机器状态格动画
→ 给出教学解释
```

只要这条链路跑通，软件就已经具备核心演示价值。

### 1.2 每次只让 AI 做一个模块

向 Codex 提需求时，避免一次性说“帮我做完整软件”。  
推荐顺序是：

```text
先问架构
再搭页面
再做自研积木交互
再做指令结构
再做模拟器
再做动画
再做教学反馈
最后做桌面打包
```

### 1.3 模块必须边界清晰

后续代码建议按职责拆分：

- `ui`：界面组件
- `blocks`：积木编辑层。早期可指 Blockly，自 2026-05 起主线指 `app/` 自研积木。
- `parser`：积木到指令结构的转换
- `simulator`：RISC-V 教学模拟执行器
- `visualizer`：寄存器、内存、PC 与机器状态格动画
- `lessons`：教学文案和示例案例
- `desktop`：Electron / 桌面壳相关逻辑

不要把积木编辑、模拟器、动画和页面状态全部写进一个大组件。

## 2. 推荐技术路线

### 2.1 第一版推荐技术栈（历史建议）

早期建议第一版使用：

- 桌面框架：Electron
- 前端框架：React + TypeScript
- 构建工具：Vite
- 可视化拖拽：Blockly
- 状态管理：先用 React state / reducer，必要时再引入 Zustand
- 动画：CSS transition + SVG line animation，复杂后再考虑动画库
- 数据存储：本地 JSON 文件或浏览器 localStorage，第一版可先用内存数据

原因：

- Electron + React 更适合快速做桌面端教学原型
- Blockly 与 Web 技术结合成熟
- TypeScript 适合定义指令结构、寄存器状态和执行结果
- 第一版重点是教学链路，不应被底层桌面技术拖慢

当前修订：这套技术栈已经完成阶段性验证，但不是当前正式外观主线。现阶段优先继续打磨 `app/` 非 Blockly 自研积木，并通过 `self-desktop/` 或浏览器应用窗口承载桌面演示。

### 2.2 暂不建议第一版使用

- Qt / C++ 全栈实现：开发成本较高
- 完整 CPU 仿真器：超出教学 MVP 范围
- 后端服务：第一版离线桌面软件不需要
- 数据库：第一版用 JSON 或 localStorage 足够
- 真实 OpenHarmony 通信：只做概念可视化页

## 3. 阶段划分总览

| 阶段 | 名称 | 核心目标 | 主要产物 |
|---|---|---|---|
| 第 0 阶段 | 需求固化 | 把说明书大纲变成 MVP 清单 | 功能清单、页面清单、指令清单 |
| 第 1 阶段 | 工程搭建 | 建立可运行桌面应用框架 | Electron + React + Vite 项目 |
| 第 2 阶段 | UI 原型 | 做出主界面和基础布局 | 首页、编辑页、执行页 |
| 第 3 阶段 | Blockly 积木 | 支持拖拽构造基础指令 | 自定义 block、工具箱 |
| 第 4 阶段 | 指令解析 | 从积木生成结构化指令和汇编文本 | parser、instruction type |
| 第 5 阶段 | 模拟器 | 实现少量 RV32I 指令执行 | simulator、寄存器/内存/PC 状态 |
| 第 6 阶段 | 可视化执行 | 展示状态变化和数据流动画 | 寄存器区、内存区、ALU 区、动画脚本 |
| 第 7 阶段 | 教学反馈 | 加入新手解释和错误提示 | 术语解释、错误纠正、执行说明 |
| 第 8 阶段 | 案例与展示 | 加入预置案例和答辩演示模式 | 示例课程、OpenHarmony 概念页 |
| 第 9 阶段 | 测试与打包 | 稳定运行并输出可演示版本 | 测试报告、安装包或可执行包 |

## 4. 第 0 阶段：需求固化

### 4.1 要做什么

把产品说明书大纲进一步落成第一版 MVP，不要一开始就做所有功能。

### 4.2 具体任务

1. 确定产品名称、英文名和简称。
2. 明确第一版目标用户：本科初学者 / 课堂演示 / 答辩展示。
3. 确定第一版支持的指令。
4. 确定第一版页面。
5. 确定第一版不做什么。
6. 明确小组成员分工。

### 4.3 第一版建议指令清单

建议先支持 6 条：

| 指令 | 类型 | 教学重点 |
|---|---|---|
| `add rd, rs1, rs2` | R 型 | 两个寄存器进入 ALU，结果写回 rd |
| `sub rd, rs1, rs2` | R 型 | ALU 减法和写回 |
| `addi rd, rs1, imm` | I 型 | 立即数参与运算 |
| `lw rd, offset(rs1)` | I 型访存 | 地址计算、内存读取、写回寄存器 |
| `sw rs2, offset(rs1)` | S 型访存 | 地址计算、寄存器值写入内存 |
| `beq rs1, rs2, label` | B 型 | 比较、分支是否跳转、PC 变化 |

`jal` 可以作为第二批扩展，避免第一版控制流过早复杂化。

### 4.4 第一版页面清单

- 首页 / 主菜单
- 指令编辑页
- 执行可视化页
- 示例案例页
- OpenHarmony 概念展示页
- 关于页

第一版可以把“编辑页”和“执行可视化页”合并成一个主工作台页面。

### 4.5 阶段产物

- `docs/mvp-scope.md`
- `docs/page-list.md`
- `docs/instruction-list.md`
- `docs/team-plan.md`

### 4.6 验收标准

- 所有成员知道第一版做什么、不做什么。
- 每个功能都能对应到一个页面或模块。
- 指令清单不超过 6 到 8 条。

### 4.7 推荐 Prompt

```text
请根据当前《理论产品说明书大纲》，帮我整理第一版 MVP 范围。
要求：
1. 明确第一版必须做的功能
2. 明确第一版暂不做的功能
3. 给出页面清单、模块清单、指令清单
4. 输出为适合放入 docs/mvp-scope.md 的 Markdown
5. 不要写代码
```

## 5. 第 1 阶段：工程搭建

### 5.1 要做什么

创建一个能运行的桌面应用工程，为后续页面、Blockly、模拟器开发提供基础。

### 5.2 具体任务

1. 初始化 Electron + React + TypeScript + Vite 项目。
2. 配置开发启动命令。
3. 配置基础目录结构。
4. 添加基础路由或页面切换逻辑。
5. 保证开发环境能一条命令启动。

### 5.3 推荐目录结构

```text
src/
  app/
    App.tsx
    routes.tsx
  ui/
    layout/
    components/
    pages/
  blocks/
    toolbox.ts
    customBlocks.ts
    blockGenerator.ts
  parser/
    instructionTypes.ts
    parseBlocks.ts
    formatAssembly.ts
  simulator/
    machineState.ts
    executeInstruction.ts
    instructionSet.ts
  visualizer/
    animationPlan.ts
    components/
  lessons/
    examples.ts
    explanations.ts
  desktop/
    main.ts
    preload.ts
```

### 5.4 阶段产物

- 可运行的 Electron 桌面窗口
- 基础页面框架
- 初始目录结构
- `README.md` 中的运行说明

### 5.5 验收标准

- 执行开发命令后能打开桌面窗口。
- 页面无白屏。
- 目录结构清晰，后续模块有位置可放。

### 5.6 推荐 Prompt

```text
目标：
为当前项目搭建 Electron + React + TypeScript + Vite 的桌面应用基础框架。

当前上下文：
这是一个 RISC-V 指令集可视化教学桌面软件，第一版需要集成 Blockly、模拟器和数据流动画。

要求：
1. 创建最小可运行工程
2. 建立清晰目录结构
3. 首页显示软件名称和进入工作台按钮
4. 给出运行命令

边界：
1. 不要实现 Blockly
2. 不要实现模拟器
3. 不要引入复杂状态管理

输出：
修改文件清单、运行方法、验证方式。
```

## 6. 第 2 阶段：UI 原型

### 6.1 要做什么

先做出软件“长什么样”，让后续 Blockly、模拟器和动画有承载界面。

### 6.2 主工作台布局建议

```text
顶部：模式切换 / 运行控制 / 保存按钮
左侧：Blockly 积木工具箱
中间：积木编辑区 + 汇编预览
右侧：寄存器 / 内存 / PC 状态
底部：执行日志 / 教学解释
可视化区：ALU 与数据流动画，可放在中间或右侧上方
```

### 6.3 具体任务

1. 设计首页。
2. 设计主工作台页面。
3. 设计寄存器面板。
4. 设计内存面板。
5. 设计执行日志面板。
6. 设计教学解释面板。
7. 设计运行控制按钮：单步、自动、暂停、重置。

### 6.4 阶段产物

- 首页 UI
- 主工作台 UI
- 寄存器、内存、ALU、日志等静态面板

### 6.5 验收标准

- 用户一眼能看出软件是 RISC-V 教学工具。
- 主工作台不用真实数据也能表达功能分区。
- 界面在常见桌面分辨率下不拥挤、不重叠。

### 6.6 推荐 Prompt

```text
请为 RISC-V 可视化教学桌面软件设计主工作台页面。
要求：
1. 左侧是 Blockly 积木区域
2. 中间是指令编辑与汇编预览
3. 右侧显示寄存器、内存、PC
4. 底部显示执行日志和教学解释
5. 顶部有单步执行、自动执行、暂停、重置按钮
6. 先使用 mock 数据
7. 保持教学软件风格，清晰、克制、适合课堂演示
```

## 7. 第 3 阶段：Blockly 积木

### 7.1 要做什么

集成 Blockly，并自定义能表达 RISC-V 指令的积木。

### 7.2 第一版 Block 设计

建议不要把所有字段拆得太细，第一版可以采用“一条指令一个 block”的方式：

- `add rd rs1 rs2`
- `sub rd rs1 rs2`
- `addi rd rs1 imm`
- `lw rd offset rs1`
- `sw rs2 offset rs1`
- `beq rs1 rs2 label`

每个 block 内部用下拉框选择寄存器，用输入框填写立即数或 label。

### 7.3 具体任务

1. 安装并嵌入 Blockly。
2. 创建 Blockly 工作区。
3. 定义工具箱分类。
4. 定义第一批 RISC-V 指令 block。
5. 定义寄存器下拉选项 `x0` 到 `x31`。
6. 监听 workspace 变化。
7. 将 workspace 中的 blocks 传给解析器。

### 7.4 阶段产物

- 可拖拽的 Blockly 工作区
- 第一批自定义 RISC-V block
- workspace change 事件

### 7.5 验收标准

- 用户能拖出一条 `add` 或 `addi` 指令。
- 用户能选择寄存器和输入立即数。
- 页面能读取当前 blocks。

### 7.6 推荐 Prompt

```text
请在现有 React 主工作台中集成 Blockly。
要求：
1. 创建 RISC-V 指令工具箱
2. 支持 add、sub、addi、lw、sw、beq 六种 block
3. 寄存器字段使用 x0 到 x31 下拉框
4. 立即数字段使用数字输入
5. 监听 workspace 变化并输出 block 信息

边界：
1. 不要实现指令执行
2. 不要做复杂动画
3. 先保证 Blockly 能显示和拖拽
```

## 8. 第 4 阶段：指令解析

### 8.1 要做什么

把 Blockly 里的积木转换成软件内部可执行的结构化指令。

### 8.2 指令结构建议

```ts
type RegisterName = `x${number}`;

type InstructionType = "R" | "I" | "S" | "B";

interface BaseInstruction {
  id: string;
  opcode: string;
  type: InstructionType;
  sourceBlockId?: string;
}

interface RTypeInstruction extends BaseInstruction {
  type: "R";
  opcode: "add" | "sub";
  rd: RegisterName;
  rs1: RegisterName;
  rs2: RegisterName;
}

interface ITypeInstruction extends BaseInstruction {
  type: "I";
  opcode: "addi" | "lw";
  rd: RegisterName;
  rs1: RegisterName;
  imm: number;
}

interface STypeInstruction extends BaseInstruction {
  type: "S";
  opcode: "sw";
  rs1: RegisterName;
  rs2: RegisterName;
  imm: number;
}

interface BTypeInstruction extends BaseInstruction {
  type: "B";
  opcode: "beq";
  rs1: RegisterName;
  rs2: RegisterName;
  label: string;
}
```

### 8.3 具体任务

1. 定义指令 TypeScript 类型。
2. 编写 `parseBlocks`。
3. 编写字段完整性校验。
4. 编写 `formatAssembly`。
5. 编写中文教学说明生成函数。
6. 对非法 block 给出错误信息。

### 8.4 阶段产物

- `instructionTypes.ts`
- `parseBlocks.ts`
- `formatAssembly.ts`
- 指令预览面板
- 解析错误提示

### 8.5 验收标准

- Blockly 中拖出 `addi x1, x0, 5` 后，能生成结构化 JSON。
- 页面能显示汇编文本。
- 缺字段时能提示用户。

### 8.6 推荐 Prompt

```text
请为 RISC-V 教学软件实现 Blockly 到结构化指令的解析层。
要求：
1. 定义 TypeScript 指令类型
2. 支持 add、sub、addi、lw、sw、beq
3. 提供 parseBlocks 函数
4. 提供 formatAssembly 函数
5. 对字段缺失输出教学式错误

边界：
1. 不要实现模拟执行
2. 不要修改 UI 布局
3. 解析层要和 Blockly、模拟器解耦
```

## 9. 第 5 阶段：指令执行模拟器

### 9.1 要做什么

实现教学用模拟器，维护寄存器、内存、PC 和执行日志。

### 9.2 模拟器状态建议

```ts
interface MachineState {
  registers: Record<RegisterName, number>;
  memory: Record<number, number>;
  pc: number;
  currentInstructionIndex: number;
  halted: boolean;
  logs: ExecutionLog[];
}
```

### 9.3 执行结果建议

```ts
interface ExecutionResult {
  nextState: MachineState;
  changedRegisters: RegisterName[];
  changedMemoryAddresses: number[];
  animationPlan: AnimationStep[];
  explanation: string;
}
```

### 9.4 具体任务

1. 初始化寄存器 `x0` 到 `x31`。
2. 保证 `x0` 永远为 0。
3. 初始化内存示例数据。
4. 实现 `executeInstruction`。
5. 实现单步执行。
6. 实现重置。
7. 实现执行日志。
8. 后续再实现自动执行。

### 9.5 第一批指令执行规则

- `add`：`rd = rs1 + rs2`
- `sub`：`rd = rs1 - rs2`
- `addi`：`rd = rs1 + imm`
- `lw`：`rd = memory[rs1 + imm]`
- `sw`：`memory[rs1 + imm] = rs2`
- `beq`：如果 `rs1 === rs2`，则跳转到 label；第一版也可以先用相对索引简化

### 9.6 阶段产物

- `machineState.ts`
- `executeInstruction.ts`
- `instructionSet.ts`
- 单步执行功能
- 重置功能
- 执行日志

### 9.7 验收标准

- 执行 `addi x1, x0, 5` 后，`x1` 变为 5。
- 执行 `add x2, x1, x1` 后，`x2` 变为 10。
- `x0` 无论如何写入都保持 0。
- 每次执行都有日志。

### 9.8 推荐 Prompt

```text
请实现 RISC-V 教学模拟器的第一版。
要求：
1. 维护 registers、memory、pc、logs
2. 支持 add、sub、addi、lw、sw、beq
3. x0 永远保持 0
4. 每次执行返回 changedRegisters、changedMemoryAddresses、explanation
5. 代码放在 simulator 模块，不要耦合 React UI

边界：
1. 不实现完整 CPU
2. 不实现完整 RV32I
3. 不做动画，只返回 animationPlan 的基础数据
```

## 10. 第 6 阶段：可视化执行与动画

### 10.1 要做什么

把模拟器执行结果展示出来，让用户看到数据如何流动。

### 10.2 动画原则

第一版动画不要求复杂，但必须有教学含义：

- 哪些寄存器被读取
- 数据进入 ALU
- ALU 输出结果
- 哪个寄存器或内存地址被写入
- PC 如何变化

### 10.3 动画步骤示例：`add x3, x1, x2`

```text
1. 高亮 x1 和 x2
2. 连线从 x1 / x2 流向 ALU
3. ALU 显示 x1 + x2
4. 连线从 ALU 流向 x3
5. x3 数值更新并高亮
6. PC 前进到下一条指令
```

### 10.4 具体任务

1. 设计 `AnimationStep` 类型。
2. 为每类指令生成动画脚本。
3. 寄存器变化高亮。
4. 内存变化高亮。
5. ALU 运算过程显示。
6. PC 当前指令高亮。
7. 动画和教学文字同步。

### 10.5 阶段产物

- `animationPlan.ts`
- 寄存器可视化组件
- 内存可视化组件
- ALU 可视化组件
- 数据流动画组件

### 10.6 验收标准

- 用户单步执行时能看到变化位置。
- `add`、`addi`、`lw`、`sw` 的数据路径区别明显。
- 动画不会遮挡文字或导致布局跳动。

### 10.7 推荐 Prompt

```text
请为 RISC-V 教学软件实现第一版数据流动画。
要求：
1. 根据模拟器返回的 animationPlan 播放动画
2. 高亮被读取的寄存器
3. 高亮 ALU 运算
4. 高亮被写入的寄存器或内存
5. 同步显示当前步骤的中文解释

边界：
1. 不要改模拟器执行规则
2. 不要引入复杂 3D
3. 先用 CSS/SVG 实现简单清晰的动画
```

## 11. 第 7 阶段：教学反馈与错误处理

### 11.1 要做什么

让软件不只是“能执行”，还要能“教会用户”。

### 11.2 具体任务

1. 为每条指令生成中文解释。
2. 为每一步执行生成解释。
3. 给寄存器、ALU、PC、内存添加术语提示。
4. 对字段缺失、非法立即数、访存越界给出错误。
5. 错误提示要说明“为什么错”和“怎么改”。

### 11.3 错误提示示例

```text
当前 add 指令缺少目标寄存器 rd。
add 的结果需要写回一个寄存器，例如 x1。
请在 rd 下拉框中选择一个目标寄存器。
```

### 11.4 阶段产物

- `explanations.ts`
- `errorMessages.ts`
- 教学说明面板
- 错误提示组件

### 11.5 验收标准

- 新手能通过提示知道下一步怎么修。
- 错误不是只显示 “Error”。
- 指令执行解释和动画步骤能对应。

### 11.6 推荐 Prompt

```text
请为当前 RISC-V 教学软件补充教学反馈模块。
要求：
1. 为 add、sub、addi、lw、sw、beq 生成中文解释
2. 为字段缺失、非法立即数、访存越界生成教学式错误提示
3. 错误提示要包含原因和修改建议
4. 输出 explanations.ts 和 errorMessages.ts

边界：
1. 不要改 Blockly block 定义
2. 不要改模拟器执行逻辑
```

## 12. 第 8 阶段：案例与展示优化

### 12.1 要做什么

加入可直接演示的示例，保证答辩和课堂展示顺畅。

### 12.2 建议预置案例

1. 立即数赋值：`addi x1, x0, 5`
2. 两数相加：`addi + add`
3. 内存读取：`lw`
4. 内存写入：`sw`
5. 条件分支：`beq`

### 12.3 OpenHarmony 概念页

第一版只做概念展示：

- 分布式软总线是什么
- 多设备协同是什么
- 为什么它和未来教学软件扩展有关
- 不做真实通信

### 12.4 阶段产物

- 示例案例页
- 一键加载案例
- 答辩演示流程
- OpenHarmony 概念展示页

### 12.5 验收标准

- 演示者不用现场从零拖积木，也能一键展示完整流程。
- 每个案例能解释一个教学点。
- OpenHarmony 页面不喧宾夺主。

## 13. 第 9 阶段：测试、打包与验收

### 13.1 要做什么

保证软件稳定运行，并形成可以提交、演示和答辩的版本。

### 13.2 测试清单

- 启动测试：桌面应用能打开
- Blockly 测试：积木能拖拽、编辑、删除
- 解析测试：积木能生成正确结构化指令
- 汇编预览测试：文本显示正确
- 模拟器测试：每条指令执行结果正确
- 可视化测试：状态变化能高亮
- 错误提示测试：错误能被识别并解释
- 重置测试：状态能恢复
- 案例测试：预置案例能完整运行

### 13.3 打包任务

1. 配置 Electron 打包工具。
2. 生成 Windows 可运行版本。
3. 编写运行说明。
4. 准备演示视频或截图。

### 13.4 验收材料

- 软件可执行文件或运行说明
- 产品说明书
- 技术架构说明
- 测试记录
- 演示脚本
- 答辩 PPT

## 14. 小组成员推荐分工

可按模块分工：

| 角色 | 负责内容 |
|---|---|
| 产品/文档负责人 | MVP 范围、说明书、报告、答辩材料 |
| 前端界面负责人 | 首页、主工作台、组件样式 |
| Blockly 负责人 | 自定义 block、工具箱、连接规则 |
| 模拟器负责人 | 指令结构、解析器、执行器 |
| 可视化负责人 | 寄存器/内存/ALU 展示、数据流动画 |
| 测试与集成负责人 | 运行测试、打包、演示流程 |

如果人数较少，可以让同一个人兼任多个角色，但不要让所有人同时改同一个核心文件。

## 15. 后续开发推荐顺序

建议严格按下面顺序推进：

1. 整理 MVP 文档
2. 搭建 Electron + React 工程
3. 做静态 UI 原型
4. 集成 Blockly
5. 定义指令数据结构
6. 实现 Blockly 到指令解析
7. 实现汇编文本预览
8. 实现模拟器状态
9. 实现 `addi` 和 `add`
10. 接入单步执行
11. 显示寄存器变化
12. 扩展 `sub`、`lw`、`sw`
13. 增加执行日志
14. 增加教学解释
15. 增加基础数据流动画
16. 增加 `beq`
17. 增加错误提示
18. 增加预置案例
19. 增加 OpenHarmony 概念页
20. 测试、修 bug、打包演示

## 16. 给 Codex 的通用开发 Prompt 模板

后续每次让 Codex 开发，建议使用这个模板：

```text
目标：
本次要完成哪个具体模块？

项目背景：
这是一个基于 RISC-V 指令集可视化教学的桌面软件。
核心链路是 Blockly 拖拽 → 指令解析 → 模拟执行 → 数据流动画 → 教学反馈。

当前上下文：
已经有哪些文件、模块、页面？

具体要求：
1.
2.
3.

边界限制：
1. 不要修改无关模块
2. 不要重构整个项目
3. 不要实现超出本阶段的功能

输出要求：
1. 说明会修改哪些文件
2. 给出完整实现
3. 说明如何运行和验证
4. 如有风险，请明确指出
```

## 17. 当前最应该做的下一步

从现在的仓库状态看，目前还处于“说明书与 AI 协作准备阶段”，尚未进入真实软件工程开发。

建议下一步先做：

1. 新建 `docs/` 目录。
2. 把产品说明书大纲移动或复制到 `docs/product-outline.md`。
3. 编写 `docs/mvp-scope.md`。
4. 确定技术栈：Electron + React + TypeScript + Vite + Blockly。
5. 初始化项目工程。
6. 完成第一个可运行桌面窗口。

第一条真正的开发任务应该是：

```text
请基于当前项目，初始化一个 Electron + React + TypeScript + Vite 的桌面应用工程。
要求先实现最小可运行版本：首页显示软件名称“RISC-V 指令集可视化教学软件”，并提供进入工作台按钮。
不要实现 Blockly、模拟器和动画。
完成后说明运行命令和验证方式。
```
