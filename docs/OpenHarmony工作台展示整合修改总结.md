# OpenHarmony 工作台展示整合修改总结

> 状态说明：本文是 OpenHarmony 工作台展示能力的阶段整合记录。2026-05-14 起，决赛演示主入口已从早期“OpenHarmony 概念 / 硬件通信视图”调整为 `O+R 实机路线`，并明确区分“当前已完成的软件样机”和“后续实体智能积木接入路线”。当前 OpenHarmony 移植总体路线请以 [OpenHarmony ArkWeb 移植版说明](../openharmony-port/README.md)、[2026-05-09 UI 与 OpenHarmony 展示移植方案](../openharmony-port/docs/2026-05-09_UI与OpenHarmony展示移植方案.md) 和 [OpenHarmony / 香橙派移植记录](../openharmony-port/docs/移植记录.md) 为准。

本文档记录本轮对 `Riscv-Visual-Teaching` 工作区的主要修改，便于上传 GitHub、组内交接和后续答辩说明。

## 一、修改目标

原项目中预留了“OpenHarmony 概念”展示入口。本轮修改将它从单独的概念说明，逐步改造成和工作台积木状态联动的展示功能：

- 工作台中的指令积木、寄存器、立即数、标签等小积木，作为“硬件积木”的软件模拟结果。
- 打开“OH 展示”后，当前工作台状态被固化，不再允许继续拖动编辑。
- 指令积木会以动画方式和下挂小积木分离、重新排布，并通过虚线和双向光点展示连接状态识别。
- 指令积木和左侧香橙派/软总线展示框之间，通过虚线和双向光点展示星闪连接。
- 若程序存在缺项或无意义汇编，相关积木会标红并显示错误原因。

## 二、主要功能改动

### 1. 工作台内嵌 OpenHarmony 展示

在工作台工具栏加入了“OpenHarmony 展示”开关。开启后：

- 原工作区提示条隐藏。
- 工作区中的积木根据当前用户操作结果固化展示。
- 指令积木自动纵向对齐。
- 下挂小积木从指令下方分离出来，横向等间距排列。
- 工作区进入只读展示状态，避免展示时继续拖动造成状态不一致。

### 2. 香橙派/软总线展示框

在工作台左侧加入香橙派/软总线展示框，用于承接所有指令积木的星闪连接线：

- 展示框具有足够竖直高度，可覆盖多条指令。
- 采用类似“OpenHarmony 概念”小窗里的香橙派图标风格。
- 移除了早期方案中不美观的长竖线。
- 指令积木整体右移，避免软总线图标遮挡虚线和光点。

### 3. 手动推进流程

将原先持续自动闪烁的展示方式改为手动推进：

- 支持重置、上一步、下一步。
- 步骤推进时，展示系统逐渐联网成型的过程。
- 连接状态识别阶段只出现指令与下挂小积木之间的连接线。
- 星闪入网阶段再出现指令与香橙派/软总线之间的连接线。

### 4. 连接状态识别动画

指令积木和下挂小积木之间加入连接状态识别效果：

- 竖向虚线上端准确连接到指令积木下沿。
- 竖向虚线下端准确连接到下挂小积木上沿。
- 光点采用两个小圆点对向移动，体现双向信息交互。
- 鼠标悬停在竖向虚线附近时，浮窗显示“连接状态识别”。

### 5. 星闪连接动画

指令积木和香橙派/软总线之间加入星闪连接效果：

- 横向虚线表示星闪连接链路。
- 双向移动的小圆点表示信息交互。
- “星闪连接技术”文字平时不显示，鼠标悬停到虚线/光点附近时以浮窗形式显示。
- 浮窗图层已上移，并调整到虚线正上方附近，避免被软总线框遮挡。

### 6. 视觉细节修复

根据演示截图反馈，做了多轮视觉微调：

- 删除按钮的白色背景已恢复。
- 去掉了指令主块左上角、右上角圆角外露出的底盘背景/阴影。
- 拉大了上一条指令下挂小积木与下一条指令主块之间的纵向间距。
- 修复了部分图像和文字重叠问题。
- 工作台中的 OH 展示不再使用外围方形框包住积木，而是直接在工作台积木形态上展示连接关系。

## 三、涉及文件

主要修改文件：

- `app/index.html`
- `app/src/app.js`
- `app/styles.css`
- `app/README.md`

同步到 OpenHarmony rawfile 的文件：

- `openharmony-port/entry/src/main/resources/rawfile/app/index.html`
- `openharmony-port/entry/src/main/resources/rawfile/app/src/app.js`
- `openharmony-port/entry/src/main/resources/rawfile/app/styles.css`

本次新增说明文档：

- `docs/OpenHarmony工作台展示整合修改总结.md`

本次新增 Git Bash 上传脚本：

- `scripts/upload_openharmony_workspace_visualization.sh`

## 四、验证情况

修改后已完成以下验证：

```bash
npm.cmd run check
npm.cmd test
npm.cmd run smoke
npm.cmd run oh:sync
npm.cmd run oh:smoke
```

验证结果：

- JavaScript 语法检查通过。
- 核心解析器与模拟器测试通过。
- Web 端 HTTP smoke test 通过。
- OpenHarmony rawfile 已同步。
- OpenHarmony rawfile smoke test 通过。

## 四点五、2026-05-14 决赛演示版补充

本轮根据决赛演示反馈，对展示表达做了降风险和增强可视化处理：

- 顶部运行标识改为 `Web · 模拟执行` / `OH · RV2 · 模拟执行`，点击后展示完整说明，避免 `SIM`、`LED ON/OFF` 等英文缩写造成误解。
- `GPIO 模拟外设` 从机器状态区独立展示，使用 `LED-X1`、`RUN`、`ERR` 表达模拟硬件反馈。
- `O+R 实机路线` 中的外部 LED 模块移到 OpenHarmony 主控卡片下方，表示它是主控之外的外设模块，而不是主控内部能力。
- `O+R 实机路线` 支持页面比例调整，默认 90%，可缩小到 50% 以便在答辩屏幕上纵观全局。
- `O+R 实机路线` 的缩放从 CSS `zoom` 改为 `transform: scale(...)`，并在离开 O+R 页面时复位渲染缩放，降低 ArkWeb / WebView 切换页面黑屏风险。
- `示例案例` 页面加入独立纵向滚动和底部留白，避免底部案例卡片被遮挡。
- 工作台错误提示改为按指令定位，只标红出错积木，并在该积木下方显示具体错误，不再全部积木统一标红。
- OpenHarmony 触控拖拽支持小积木先放到工作台空白区形成游离小积木，再二次拼接；也支持拖入高层级删除区删除或清空槽位。

表达边界：

- 当前 LED、GPIO、外部模块均为软件模拟硬件反馈，用于解释后续硬件化方向。
- 当前不宣称已完成真实软总线设备通信、真实星闪入网或真实外部 LED 控制。

## 五、Git Bash 上传命令参考

如果需要把当前决赛演示交互修改上传到 GitHub，可以在项目根目录打开 Git Bash，然后运行：

```bash
git status
git add app/index.html app/src/app.js app/src/instructions.js app/src/ui-utils.js app/styles.css \
  openharmony-port/entry/src/main/resources/rawfile/app/index.html \
  openharmony-port/entry/src/main/resources/rawfile/app/src/app.js \
  openharmony-port/entry/src/main/resources/rawfile/app/src/instructions.js \
  openharmony-port/entry/src/main/resources/rawfile/app/src/ui-utils.js \
  openharmony-port/entry/src/main/resources/rawfile/app/styles.css \
  openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/libs.html \
  openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/no-file-input.html \
  openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/no-svg.html \
  openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/static.html \
  docs/产品说明_当前阶段版.md \
  docs/OpenHarmony工作台展示整合修改总结.md \
  docs/机器状态格动画重构方案.md \
  openharmony-port/docs/移植记录.md
git commit -m "feat: refine finals demo interaction"
git push origin main
```

如果你不想直接推到 `main`，更稳妥的方式是新建分支：

```bash
git checkout -b feat/finals-demo-interaction
git add app/index.html app/src/app.js app/src/instructions.js app/src/ui-utils.js app/styles.css \
  openharmony-port/entry/src/main/resources/rawfile/app/index.html \
  openharmony-port/entry/src/main/resources/rawfile/app/src/app.js \
  openharmony-port/entry/src/main/resources/rawfile/app/src/instructions.js \
  openharmony-port/entry/src/main/resources/rawfile/app/src/ui-utils.js \
  openharmony-port/entry/src/main/resources/rawfile/app/styles.css \
  openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/libs.html \
  openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/no-file-input.html \
  openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/no-svg.html \
  openharmony-port/entry/src/main/resources/rawfile/arkweb-diagnostics/static.html \
  docs/产品说明_当前阶段版.md \
  docs/OpenHarmony工作台展示整合修改总结.md \
  docs/机器状态格动画重构方案.md \
  openharmony-port/docs/移植记录.md
git commit -m "feat: refine finals demo interaction"
git push -u origin feat/finals-demo-interaction
```

注意：当前本地还有 `.analysis_extracted/`、`.codex/skills/`、`tmp/`、`ohos_electron_hap/`、PDF 手册和比赛文档区等未跟踪或材料文件。它们不是本轮软件交互修改的必需提交内容，默认不建议混入本次代码提交，除非小组明确要一起上传。
