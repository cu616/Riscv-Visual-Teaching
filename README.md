# RISC-V 可视化教学桌面软件

本仓库用于大创项目《基于 RISC-V 指令集可视化教学的桌面软件》的文档整理、AI 协作训练与软件原型开发。

当前已经包含：

- `app/`：RISC-V 可视化教学软件无依赖 MVP
- `docs/`：产品说明、开发步骤、环境搭建、Codex 学习资料
- `.codex/skills/`：项目级 Codex Skills
- `scripts/`：环境辅助脚本

## 当前软件 MVP

仓库已新增 `app/`，包含《基于 RISC-V 指令集可视化教学的桌面软件》的无依赖 MVP。当前定位是大创比赛草案演示程序 / 构想验证原型，版本为 `v0.3.0`。

当前已经支持算术、逻辑、移位、访存、分支、跳转等常用教学指令，并保留 `j`、`bltz` 作为明确标注的教学伪指令。

双击启动：

```text
启动RISC-V可视化教学软件.bat
```

运行：

```powershell
npm.cmd start
```

然后打开：

```text
http://localhost:4173
```

验证核心逻辑：

```powershell
npm.cmd run check
npm.cmd test
```

## 重要文档

- [项目进度与结构总结](docs/项目进度与结构总结.md)
- [夜间自动化推进计划](docs/夜间自动化推进计划.md)
- [演示脚本](docs/演示脚本.md)
- [理论产品说明书大纲](docs/《基于%20RISC-V%20指令集可视化教学的桌面软件》理论产品说明书大纲.md)
- [开发步骤指南](docs/RISC-V可视化教学桌面软件_开发步骤指南.md)
- [WSL2 环境搭建执行清单](docs/WSL2_环境搭建_执行清单.md)
- [小组编程与 AI 阶段技能清单](docs/小组编程与AI阶段技能清单.md)

## Codex 学习资料

推荐阅读顺序：

1. [Codex 基础教程](docs/codex_tutorial.md)
2. [Prompt / Agent / Skill 教程](docs/prompt_agent_skill_tutorial.md)
3. [Codex 基础配置教程](docs/codex_setup_tutorial.md)
4. [Codex Skill 简易教程](docs/codex_skill_tutorial.md)
