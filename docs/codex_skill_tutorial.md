---

# 🚀 Codex Skill 简易教程（从 0 到能用）

---

# 🧠 一、Skill 是什么（再强化一遍）

👉 官方定义：

> Skill 是一组“指令 + 资源 + 可选脚本”，让 Codex 能稳定完成某类任务 ([OpenAI 开发者][1])

简单说：

```text
Skill = 固定套路 + 自动执行
```

---

## 📌 举个直观例子

你每次都这样写 Prompt：

```text
1. 先分析问题
2. 再定位错误
3. 最后给最小修改方案
```

👉 写10次很烦

👉 做成 Skill 后：

```text
自动按这个流程做
```

---

# 🧩 二、创建 Skill 的 3 种方式

---

# ✅ 方法1：Codex App（最简单，推荐新手）

## 步骤

1. 打开 Codex App
2. 点击右上角 **New Skill**
3. 输入描述
4. 保存

👉 官方说明：可以直接在界面创建 Skill ([Medium][2])

---

## 📌 示例：创建 Debug Skill

在 Skill 里写：

```text
这个 skill 用于修复代码问题。

流程：
1. 先复述问题
2. 分析可能原因
3. 定位相关文件
4. 给出最小修改方案
5. 解释修改原因

限制：
- 不要重构整个项目
- 优先最小修改
```

👉 保存即可

---

# ✅ 方法2：本地创建（推荐进阶）

👉 最标准方式（项目级使用）

---

## 📂 第一步：创建目录

```bash
.codex/skills/debug/
```

---

## 📄 第二步：创建 skill 文件

```bash
skill.md
```

---

## ✍️ 第三步：写 Skill 内容

```markdown
# Debug Skill

## Description
用于修复代码问题

## Instructions
1. 先分析问题
2. 找到错误原因
3. 给最小修改方案
4. 不重构项目

## Output
- 修改代码
- 解释原因
```

👉 Codex 会自动识别这个 Skill ([Medium][3])

---

## 📌 原理

👉 任何放在 `.codex/skills/` 下的文件都会被识别为 Skill ([Simon Willison’s Weblog][4])

---

# ✅ 方法3：安装现成 Skill（最快）

## 使用内置安装器

```bash
$skill-installer gh-address-comments
```

或者：

```bash
$skill-installer install https://github.com/openai/skills/...
```

👉 官方支持从 GitHub 安装 Skill ([GitHub][5])

---

# 🧠 三、如何调用 Skill

---

## ✅ 方法1：直接调用

```text
使用 debug skill 修复这个报错
```

---

## ✅ 方法2：自动调用（推荐）

👉 直接写需求：

```text
这个项目启动报错，请修复
```

👉 Codex 会自动选择 Skill

---

## ⚡ 方法3（进阶）

```text
使用 debug skill + api skill 完成任务
```

---

# 🧪 四、手把手做一个 Skill（必会）

---

## 🎯 目标：做一个“前端页面生成 Skill”

---

## 📂 创建目录

```bash
.codex/skills/react-page/
```

---

## 📄 写 skill.md

```markdown
# React Page Skill

## Description
用于生成 React 页面

## Instructions
1. 分析页面结构
2. 拆分组件
3. 使用函数组件
4. 保持风格统一
5. 输出完整代码

## Output
- 完整 React 页面代码
```

---

## 🚀 使用

```text
帮我做一个旅游网站首页
```

👉 Codex 自动用 Skill

---

# 🔥 五、推荐必做的 5 个 Skill（大创必备）

---

## 1️⃣ Debug Skill（最重要）

👉 修 Bug 用

---

## 2️⃣ 页面生成 Skill

👉 做前端 UI

---

## 3️⃣ API Skill

👉 写后端接口

---

## 4️⃣ 项目分析 Skill

👉 给新成员用

---

## 5️⃣ 重构 Skill

👉 优化代码结构

---

# ⚠️ 六、常见错误

---

## ❌ 1. 写成 Prompt

Skill 不是一句话：

```text
帮我修bug ❌
```

---

## ❌ 2. 没有流程

```text
修复代码 ❌
```

👉 必须写步骤

---

## ❌ 3. 太复杂

👉 Skill 要“专一”

---

# 🎯 七、核心总结

```text
Prompt = 临时任务
Skill = 固定工作流
```

👉 Skill = 可复用 Prompt + 执行逻辑

---

# 🚀 八、给你一个大创实战建议（非常重要）

👉 你们组可以这样做：

建立一个目录：

```bash
.codex/skills/
```

统一放：

* debug.md
* frontend.md
* api.md
* explain.md

👉 相当于你们自己的 AI 工具箱

---

[1]: https://developers.openai.com/codex/skills/?utm_source=chatgpt.com "Agent Skills"
[2]: https://peggie7191.medium.com/how-to-use-the-skills-feature-in-the-codex-app-d20e570db4c8?utm_source=chatgpt.com "How to Use the Skills Feature in the Codex App - Peggie Mishra"
[3]: https://medium.com/%40proflead/codex-skills-explained-the-complete-guide-to-automating-your-prompts-26dd5a89d580?utm_source=chatgpt.com "Codex Skills Explained: The Complete Guide to ..."
[4]: https://simonwillison.net/2025/Dec/12/openai-skills/?utm_source=chatgpt.com "OpenAI are quietly adopting skills, now available in ..."
[5]: https://github.com/openai/skills?utm_source=chatgpt.com "openai/skills: Skills Catalog for Codex"
