
# Codex 基础配置教程（Windows / macOS）

## 0. 先了解一下你要装的是什么

Codex 现在主要有两种常见使用方式。第一种是 **Codex IDE extension**，也就是在 VS Code、Cursor、Windsurf 这类 VS Code 兼容编辑器里直接调用 Codex。第二种是 **Codex app**，也就是本地桌面应用，可以在项目之间切换、并行跑多个线程，并查看可审查的 diff。官方也说明，Codex app、CLI 和 IDE extension 都属于同一套 Codex 使用面，且 ChatGPT Plus、Pro、Business、Edu、Enterprise 计划都包含 Codex。([OpenAI 开发者][1])

## 1. 你需要准备什么

你至少需要一个支持 Codex 的 ChatGPT 账号，或者使用 OpenAI API key 登录。官方 quickstart 写明，Codex app 和 IDE extension 都支持用 ChatGPT 账号或 API key 登录；不过如果使用 API key 登录，一些功能例如 cloud threads 可能不可用。([OpenAI 开发者][2])

如果你主要打算在 VS Code 里用 Codex，那么最简单的路线就是：安装 VS Code → 安装 Codex 扩展 → 登录 → 打开项目 → 在侧边栏开始任务。官方 quickstart 和 IDE 页面都给出了这条路径。([OpenAI 开发者][3])

---

## 2. macOS 上的配置教程

### 2.1 macOS 上使用 Codex app

官方 quickstart 和 Codex app 页面都说明，Codex app 提供 macOS 下载入口；其中 quickstart 页面明确写了 macOS 为 Apple Silicon 版本。安装后，打开应用并使用 ChatGPT 账号或 API key 登录，然后选择一个项目文件夹即可开始。默认选择 Local 模式时，Codex 会在你的机器上对该项目工作。([OpenAI 开发者][2])

### 2.2 macOS 上使用步骤

你可以按这个流程来：

1. 下载并安装 Codex app
2. 打开应用并登录
3. 选择一个本地项目目录
4. 确认使用 Local
5. 输入你的第一条任务指令，比如“先告诉我这个项目的结构”或“帮我给这个仓库加一个登录页”

这套流程来自官方 quickstart，其中示例任务也包括“Tell me about this project”“Build a classic Snake game in this repo”“Find and fix bugs in my codebase with minimal, high-confidence changes”。([OpenAI 开发者][2])

### 2.3 macOS 上在 VS Code 里安装 Codex 插件

官方 IDE 文档写明，Codex 扩展可以从 Visual Studio Code Marketplace 获取。安装后，Codex 会出现在编辑器侧边栏里；在 VS Code 中，它默认出现在右侧边栏。如果安装后没有马上看到，官方建议重启 VS Code。([OpenAI 开发者][3])

### 2.4 macOS 上在 VS Code 里调用 Codex

安装扩展后，打开你的项目目录，在侧边栏里点击 Codex，登录你的 ChatGPT 账号或 API key。官方 quickstart 说明，登录后 Codex 默认以 Agent mode 启动，这种模式允许它读取文件、运行命令并对项目目录里的代码写入修改。([OpenAI 开发者][2])

最适合新手的第一批指令可以这样写：

```text
先不要修改代码，先告诉我这个项目的目录结构和入口文件。
```

```text
请为当前 React 项目新增一个登录页，只改前端，不要改后端。
```

```text
请检查这个仓库为什么启动失败，先定位原因，再给出最小修改方案。
```

这样写的好处是任务边界清楚，Codex 更容易给出稳定结果。官方 best practices 也建议困难任务先规划、给足上下文，并把高质量指导沉淀成可复用规范。([OpenAI 开发者][2])

---

## 3. Windows 上的配置教程

### 3.1 Windows 上使用 Codex app

官方已经提供 Codex app for Windows。Windows 版可以通过 Microsoft Store 下载，支持在一个界面里跨项目工作、运行并行 agent 线程、查看结果，并使用 PowerShell 和 Windows sandbox 原生运行；如果你更偏 Linux 工作流，也可以配置成在 WSL2 中运行。([OpenAI 开发者][4])

### 3.2 Windows 上使用步骤

Windows 本地 App 的标准流程和 Mac 类似：

1. 从 Microsoft Store 安装 Codex app
2. 打开后登录 ChatGPT 或 API key
3. 选择项目目录
4. 在 Local 模式下开始发任务
5. 检查修改结果和 diff

官方 app 页面和 quickstart 都说明了这套流程。Windows app 页面还补充说明：如果你在 Composer 里把 sandbox permissions 设为 Default permissions，Codex 在 PowerShell 或 WSL2 中运行时都会启用对应的沙箱保护。([OpenAI 开发者][2])

### 3.3 Windows 上在 VS Code 里安装 Codex 插件

官方 IDE 页面明确写了：**Codex VS Code extension 在 macOS 和 Linux 上可用，Windows 支持目前是 experimental**。官方推荐的 Windows 最佳体验是：**在 WSL2 工作区里使用 Codex**，并配合 Windows setup guide。([OpenAI 开发者][3])

所以如果你在 Windows 上想稳定地在 VS Code 里用 Codex，推荐走这条路线：

1. 安装 WSL
2. 安装 VS Code 的 WSL 扩展
3. 把项目放到 WSL 的 Linux 文件系统下
4. 从 WSL 终端里 `code .` 打开项目
5. 在这个 WSL 窗口里安装 Codex 扩展并登录

官方 Windows 指南写得很明确：安装 WSL 可以在管理员 PowerShell 里运行 `wsl --install`；然后在 WSL 终端进入项目目录执行 `code .`，这样会打开一个 WSL Remote 窗口。状态栏应显示 `WSL: <distro>`，终端路径应是 `/home/...` 这样的 Linux 路径，而不是 `C:\...`。官方还建议仓库放在 `~/code/...` 之类的 WSL 本地目录里，而不是 `/mnt/c/...`，这样性能更好、权限问题更少。([OpenAI 开发者][5])

### 3.4 Windows 上 VS Code 插件安装与调用的推荐做法

在 WSL 窗口里打开你的仓库后，去扩展市场安装 Codex。安装成功后，Codex 会出现在侧边栏；如果看不到，可以先重启 VS Code。登录之后，和 macOS 一样，Codex 默认用 Agent mode 工作，可以读文件、运行命令和改项目。([OpenAI 开发者][3])

第一次调用建议先做“低风险任务”，比如：

```text
先不要改代码，先说明这个项目里前端入口文件、后端入口文件和路由结构。
```

然后再做：

```text
请新增一个最小可运行的登录页面，只修改前端相关文件。
```

最后再进入修 Bug 或大改结构的阶段。这样更适合组内培训，也更适合让新成员建立正确使用习惯。这个思路也符合官方 best practices：先理解项目，再规划，再执行。([OpenAI 开发者][6])

---

## 4. 在 VS Code 里“怎么调用 Codex”

无论是 macOS 还是 Windows（WSL2 推荐），在 VS Code 里调用 Codex 的基本方式都一样：

### 第一步：打开项目

先用 VS Code 打开你的项目文件夹。对于 Windows，推荐你从 WSL 终端里 `code .` 打开，而不是直接打开 `C:` 盘上的仓库。因为官方明确建议将仓库保存在 WSL 的 Linux 主目录中，以获得更快 I/O 和更少权限问题。([OpenAI 开发者][5])

### 第二步：打开 Codex 侧边栏

安装好扩展后，Codex 会出现在侧边栏。官方说明在 VS Code 中它默认在右侧边栏；如果想改回左侧，也可以拖动图标位置。([OpenAI 开发者][3])

### 第三步：登录

使用 ChatGPT 账号或 API key 登录。官方 quickstart 明确给出这两种登录方式。([OpenAI 开发者][2])

### 第四步：发第一条任务

建议从下面三类任务开始：

**理解项目**

```text
先不要修改代码，先帮我总结这个项目的结构、入口文件和主要模块。
```

**新增功能**

```text
请为当前项目新增一个旅游景点详情页。
要求：只修改前端，保持现有风格一致，先实现最小可运行版本。
```

**修复问题**

```text
当前项目启动后白屏。请先定位原因，再给出最小修改方案，不要重构整个项目。
```

这些写法的关键，是同时给出目标、范围和限制。这样比“帮我做一个网站”或“帮我修一下”更容易得到高质量结果。官方 best practices 也强调，清晰上下文和可复用规范会显著提高 Codex 的表现。([OpenAI 开发者][6])

---

## 5. 在本地 App 里“怎么用 Codex”

Codex app 更适合“我不想一直切 IDE 和终端，我想直接让 AI 在项目上工作”的场景。官方对 Codex app 的定位是：一个可并行处理多个线程的桌面工作台，内置 worktree 支持、automations 和 Git 功能。([OpenAI 开发者][1])

你可以把本地 App 的用法理解成下面这套流程：

### 5.1 选项目

启动 App 后先选一个本地仓库。官方 quickstart 就是这么设计的。([OpenAI 开发者][2])

### 5.2 发任务

先发一条理解型任务：

```text
先告诉我这个仓库是做什么的，入口文件在哪里，当前有哪些主要模块。
```

然后发一条开发型任务：

```text
请为这个项目新增一个登录页，先做最小版本，不要修改后端。
```

再发一条校验型任务：

```text
请检查你刚才的修改可能会影响哪些文件，并告诉我如何本地验证。
```

### 5.3 检查 diff

Codex app 的重要价值之一就是 reviewable diffs，也就是可以检查修改差异，而不是盲目信任结果。OpenAI 的介绍和 Windows app 页面都强调了这一点。([OpenAI][7])

### 5.4 接受、丢弃或继续追问

如果改得不对，不要直接全部推翻，而是继续补充约束。例如：

```text
保留现有结构，只重写样式部分。
```

```text
不要再改后端，只修前端白屏问题。
```

```text
把这次改动限制在登录模块相关文件。
```

这种迭代式使用方式，通常比每次重新开一个全新任务更稳定。官方 best practices 的核心也是“规划—执行—验证”的循环。([OpenAI 开发者][6])

---

## 6. 推荐的基础配置

如果你已经装好了 Codex IDE extension，官方说明 CLI 和 IDE extension 共享同一套配置层。用户级配置文件在 `~/.codex/config.toml`，项目级可以放在仓库里的 `.codex/config.toml`。你也可以在 IDE 扩展右上角齿轮进入 `Codex Settings > Open config.toml`。([OpenAI 开发者][8])

对新手来说，最值得先了解的配置有两个：

### 6.1 默认模型

官方配置文档举例可以在配置里设默认模型，例如：

```toml
model = "gpt-5.4"
```

这会影响 CLI 和 IDE 的默认模型。([OpenAI 开发者][8])

### 6.2 审批策略

官方文档给的常见配置之一是：

```toml
approval_policy = "on-request"
```

这个设置控制 Codex 在运行生成命令前，何时暂停来向你请求批准。对新手来说，这通常比完全放开更稳妥。([OpenAI 开发者][8])

---

## 7. Windows 用户特别注意的坑

如果你在 Windows 上直接装了 VS Code 扩展却发现体验很差，不一定是你操作错了。因为官方已经明确说了，Windows 上的 VS Code 扩展支持目前还是 experimental，最佳体验是 WSL2 工作区。([OpenAI 开发者][3])

如果你碰到这些问题，基本可以优先往 WSL2 方向排查：

* 扩展已安装但无响应
* 终端或路径不对
* 项目放在 `C:\` 或 `/mnt/c/...` 下导致性能和权限问题
* VS Code 没有真正进入 WSL 窗口

官方 Windows 文档还补充了一个具体故障点：如果 IDE extension 已安装但无响应，系统可能缺少某些 C++ 开发工具，比如 Visual Studio Build Tools（C++ workload）或 Microsoft Visual C++ Redistributable；安装后要完整重启 VS Code。([OpenAI 开发者][5])

---

## 8. 我建议你们组内统一的使用方式

如果你们是大创小组，我建议统一成这两套：

### macOS 组员

优先：VS Code + Codex IDE extension
备选：Codex app 直接工作台模式。([OpenAI 开发者][3])

### Windows 组员

优先：WSL2 + VS Code + Codex IDE extension
备选：Codex app for Windows。([OpenAI 开发者][3])

这样做的好处是，Mac 端安装更直接，Windows 端则尽量绕开“原生 VS Code 扩展仍属实验支持”的不稳定因素。([OpenAI 开发者][3])

---

## 9. 给组员的第一批练习任务

最后我给你们一组最适合上手的任务，装好之后可以直接练：

```text
先不要修改代码，先总结这个项目的目录结构、入口文件和主要模块。
```

```text
请给当前项目新增一个最小可运行的登录页，只修改前端。
```

```text
请找出当前项目最可能出错的三个地方，并说明原因，不要直接修改。
```

```text
请检查当前仓库中是否有重复组件，并提出重构建议，先不要动代码。
```

这四类任务分别对应“理解项目、加功能、排风险、做优化”，很适合让组员先学会怎么和 Codex 协作，而不是一上来就让它“做完整系统”。这也更符合官方强调的逐步规划和验证的工作方式。([OpenAI 开发者][6])


[1]: https://developers.openai.com/codex/app "App – Codex | OpenAI Developers"
[2]: https://developers.openai.com/codex/quickstart "Quickstart – Codex | OpenAI Developers"
[3]: https://developers.openai.com/codex/ide "IDE extension – Codex | OpenAI Developers"
[4]: https://developers.openai.com/codex/app/windows "Windows – Codex app | OpenAI Developers"
[5]: https://developers.openai.com/codex/windows "Windows – Codex | OpenAI Developers"
[6]: https://developers.openai.com/codex/learn/best-practices?utm_source=chatgpt.com "Best practices – Codex"
[7]: https://openai.com/index/introducing-the-codex-app/?utm_source=chatgpt.com "Introducing the Codex app"
[8]: https://developers.openai.com/codex/config-basic "Config basics – Codex | OpenAI Developers"
