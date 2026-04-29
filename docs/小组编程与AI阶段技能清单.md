# 小组编程与 AI 阶段 Skill 推荐清单（增强版）

基于你们《理论阶段任务》里的分工，我把后续“编程落地 + AI 协作”可直接用的一批 skills 做了筛选。优先选官方 `openai/skills` 仓库中的技能，便于统一标准与共享工作流。

## 1. 必装技能（P0）

| 优先级 | Skill | 主要作用 | 对应你们任务 | GitHub 链接 |
|---|---|---|---|---|
| P0 | `openai-docs` | 用官方文档做模型/API/工具选型，避免过时信息 | 洪天阳（AI 工具环境搭建）、全组 | https://github.com/openai/skills/tree/main/skills/.curated/openai-docs |
| P0 | `frontend-skill` | 做高质量前端原型与可视化页面 | 汪熙（图形化可视化）、刘北辰（产品框架） | https://github.com/openai/skills/tree/main/skills/.curated/frontend-skill |
| P0 | `playwright` | 自动化浏览器验收、截图、交互调试 | 汪熙（Blockly 交互验证）、全组联调 | https://github.com/openai/skills/tree/main/skills/.curated/playwright |
| P0 | `jupyter-notebook` | 快速做实验笔记、对比分析、可复现实验 | 徐倩怡（RISCV/MIPS 对比）、陈致远（融合优势分析） | https://github.com/openai/skills/tree/main/skills/.curated/jupyter-notebook |
| P0 | `doc` | 输出结构化 `.docx` 文档（阶段报告/方案文档） | 全组验收材料整理 | https://github.com/openai/skills/tree/main/skills/.curated/doc |
| P0 | `slides` | 生成/维护答辩与组会 `.pptx` | 刘北辰（总体方案汇总）、全组周报 | https://github.com/openai/skills/tree/main/skills/.curated/slides |

## 2. 强烈建议安装（P1）

| 优先级 | Skill | 主要作用 | 对应你们任务 | GitHub 链接 |
|---|---|---|---|---|
| P1 | `spreadsheet` | 实验数据、任务分工、进度与结果表格化 | 全组管理与对比分析 | https://github.com/openai/skills/tree/main/skills/.curated/spreadsheet |
| P1 | `pdf` | 论文/资料 PDF 抽取与版式核查 | 徐倩怡、陈致远（理论资料整理） | https://github.com/openai/skills/tree/main/skills/.curated/pdf |
| P1 | `gh-fix-ci` | PR 检查失败时快速定位 CI 日志并修复 | 后续多人协作开发阶段 | https://github.com/openai/skills/tree/main/skills/.curated/gh-fix-ci |
| P1 | `gh-address-comments` | 批量处理 PR Review 评论，提升协作效率 | 后续代码评审阶段 | https://github.com/openai/skills/tree/main/skills/.curated/gh-address-comments |
| P1 | `yeet` | 一条流完成提交/推送/草稿 PR | 全组提交规范化 | https://github.com/openai/skills/tree/main/skills/.curated/yeet |

## 3. 编程专项扩展技能（本次新增，重点）

| 分类 | Skill | 编程阶段价值 | 适用时机 | GitHub 链接 |
|---|---|---|---|---|
| 开发脚手架 | `cli-creator` | 快速把 API/脚本封装成可复用 CLI 工具 | 需要把重复操作工具化时 | https://github.com/openai/skills/tree/main/skills/.curated/cli-creator |
| 应用开发 | `chatgpt-apps` | 按 Docs 标准构建 ChatGPT Apps（MCP + UI） | 做 AI 应用原型/插件化能力时 | https://github.com/openai/skills/tree/main/skills/.curated/chatgpt-apps |
| 深度调试 | `playwright-interactive` | 持久会话调试前端/Electron，快速迭代 UI 问题 | 普通 Playwright 不够用时 | https://github.com/openai/skills/tree/main/skills/.curated/playwright-interactive |
| 线上问题定位 | `sentry` | 拉取并分析线上报错，定位真实生产问题 | 进入线上测试或灰度后 | https://github.com/openai/skills/tree/main/skills/.curated/sentry |
| 安全编码 | `security-best-practices` | 给代码做安全基线审查，减少常见漏洞 | 关键模块开发后 | https://github.com/openai/skills/tree/main/skills/.curated/security-best-practices |
| 威胁建模 | `security-threat-model` | 从仓库结构出发做威胁路径分析 | 版本发布前的安全评估 | https://github.com/openai/skills/tree/main/skills/.curated/security-threat-model |
| 部署发布 | `vercel-deploy` | 快速发布 Web 项目预览/生产 | 前端或全栈 Web 演示 | https://github.com/openai/skills/tree/main/skills/.curated/vercel-deploy |
| 部署发布 | `netlify-deploy` | 快速部署静态站点与前端项目 | 文档站/展示页/活动页 | https://github.com/openai/skills/tree/main/skills/.curated/netlify-deploy |
| 部署发布 | `render-deploy` | 支持后端/数据库等更完整部署流 | 需要后端服务托管时 | https://github.com/openai/skills/tree/main/skills/.curated/render-deploy |
| 部署发布 | `cloudflare-deploy` | Workers/Pages/边缘能力一体化部署 | 追求边缘低延迟方案时 | https://github.com/openai/skills/tree/main/skills/.curated/cloudflare-deploy |
| 栈专项 | `aspnet-core` | ASP.NET Core 规范开发与重构 | 你们若采用 .NET 技术栈 | https://github.com/openai/skills/tree/main/skills/.curated/aspnet-core |
| 栈专项 | `winui-app` | WinUI 3 桌面应用搭建/排障 | 你们若做 Windows 桌面端 | https://github.com/openai/skills/tree/main/skills/.curated/winui-app |
| 栈专项 | `develop-web-game` | 面向交互逻辑的游戏化 Web 开发闭环 | 做“图形化教学演示”玩法原型时 | https://github.com/openai/skills/tree/main/skills/.curated/develop-web-game |

## 4. 基础设施技能（建议了解，P2）

| 优先级 | Skill | 主要作用 | GitHub 链接 |
|---|---|---|---|
| P2 | `skill-installer` | 按名称或 GitHub 路径安装技能 | https://github.com/openai/skills/tree/main/skills/.system/skill-installer |
| P2 | `skill-creator` | 创建你们自己的“项目私有 skill” | https://github.com/openai/skills/tree/main/skills/.system/skill-creator |

## 5. 给你们小组的落地建议（按阶段）

1. 第 1 周（理论学习并行）：先装 `openai-docs`、`jupyter-notebook`、`doc`、`slides`。
2. 第 2 周（可视化原型）：加上 `frontend-skill` + `playwright` + `playwright-interactive`。
3. 第 3 周（编码冲刺）：补 `cli-creator`、`sentry`、`security-best-practices`。
4. 进入多人开发后：补齐 `gh-fix-ci`、`gh-address-comments`、`yeet`。
5. 上线或演示前：按部署平台选择 `vercel-deploy` / `netlify-deploy` / `render-deploy` / `cloudflare-deploy`。

## 6. 安装示例

说明：`.system` 里的技能通常是预装的；`.curated` 技能可用安装器按名称安装。

```bash
$skill-installer openai-docs
$skill-installer frontend-skill
$skill-installer playwright
$skill-installer playwright-interactive
$skill-installer jupyter-notebook
$skill-installer doc
$skill-installer slides
$skill-installer spreadsheet
$skill-installer pdf
$skill-installer cli-creator
$skill-installer chatgpt-apps
$skill-installer sentry
$skill-installer security-best-practices
$skill-installer security-threat-model
$skill-installer gh-fix-ci
$skill-installer gh-address-comments
$skill-installer yeet
$skill-installer vercel-deploy
$skill-installer netlify-deploy
$skill-installer render-deploy
$skill-installer cloudflare-deploy
```

## 7. 你们这个项目的“编程最小组合”

如果你想先不装太多，我建议先从这 8 个开始：

1. `openai-docs`
2. `frontend-skill`
3. `playwright`
4. `playwright-interactive`
5. `cli-creator`
6. `gh-fix-ci`
7. `gh-address-comments`
8. `yeet`

如果后续你愿意，我可以再给你们补一版“项目私有 skill 方案”（例如 `riscv-isa-explainer`、`blockly-visual-prototyper`、`openharmony-riscv-research`），让每个人提交物格式统一.
