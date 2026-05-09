# Git 协作流程与分支规则

本文档用于统一小组在 GitHub 上的协作方式，避免多人直接改 `main`、误提交本地资料、重复合并旧分支等问题。

## 一、仓库与远程地址

本项目后续统一以 `cu616` 仓库为准：

```bash
https://github.com/cu616/Riscv-Visual-Teaching.git
```

如果本地还没有设置 `cu616` 远程仓库，在 Git Bash 中运行：

```bash
cd /c/Users/lbc/dachuang
git remote add cu616 https://github.com/cu616/Riscv-Visual-Teaching.git
git fetch cu616 --prune
```

如果已经有 `cu616`，但地址不对，运行：

```bash
cd /c/Users/lbc/dachuang
git remote set-url cu616 https://github.com/cu616/Riscv-Visual-Teaching.git
git fetch cu616 --prune
```

检查远程地址：

```bash
git remote -v
```

## 二、主线规则

- `main` 永远代表当前可运行、可展示的主线版本。
- 每个成员开发新功能时，必须从最新 `main` 新建自己的功能分支。
- 不要多人长期共用同一个功能分支。
- 不建议直接推送到 `main`，正式代码通过 Pull Request 合入。
- PR 合并后，源功能分支可以删除；删除分支不会删除已经合入 `main` 的代码。

推荐分支命名：

```text
feat/功能名
fix/问题名
docs/文档名
codex/AI任务名
```

例如：

```text
feat/workspace-zoom
fix/block-delete-trash
docs/git-workflow
codex/openharmony-rv2-port
```

## 三、开始新任务

每次开发前先同步最新主线：

```bash
cd /c/Users/lbc/dachuang

git switch main
git pull cu616 main
```

然后新建功能分支：

```bash
git switch -c feat/你的功能名
```

如果本地没有 `main` 或 `main` 状态混乱，可以使用：

```bash
git fetch cu616 --prune
git switch -c main cu616/main
```

## 四、提交自己的修改

提交前先检查变更：

```bash
git status --short
```

只添加本次任务相关文件，不要盲目使用 `git add -A`。例如只提交非 Blockly 自研应用：

```bash
git add app README.md docs/Git协作流程与分支规则.md
```

提交：

```bash
git commit -m "feat: optimize workspace UI"
```

推送当前分支：

```bash
git push cu616 HEAD
```

推送成功后，到 GitHub 页面创建 Pull Request：

```text
base: main
compare: 当前功能分支
```

## 五、吸收队友已经合入 main 的更新

如果自己正在功能分支上开发，想把队友已经合入 `main` 的内容同步进来，推荐使用 merge：

```bash
cd /c/Users/lbc/dachuang

git fetch cu616 --prune
git merge cu616/main
```

如果没有冲突，Git 会自动完成合并。若出现冲突，处理冲突文件后运行：

```bash
git status --short
git add 冲突已解决的文件
git commit -m "merge: integrate latest main"
```

注意：合并时不要把无关的未跟踪文件一起加入提交。

## 六、GitHub 网页上的便捷合并

PR 页面如果出现：

```text
This branch is out-of-date with the base branch
```

或者出现按钮：

```text
Update branch
```

可以直接点击 `Update branch`，让 GitHub 自动把 `main` 合进当前 PR 分支。

如果 GitHub 提示无法自动处理冲突，就回到本地执行：

```bash
git fetch cu616 --prune
git merge cu616/main
```

然后手动解决冲突、提交、推送。

## 七、PR 合并后的处理

PR 页面显示紫色 `Merged`，并写着：

```text
Pull request successfully merged and closed
```

说明该 PR 已经合并完成。

这时源分支仍然可能显示在 GitHub 的 branch 列表中，这是正常现象。确认该分支不再继续开发后，可以点击 PR 页面底部的 `Delete branch` 删除远程功能分支。

不要点击旧 PR 页面上的 `Revert`，除非小组明确决定撤销该 PR 已经合入 `main` 的全部修改。

## 八、本项目特别注意

当前仓库包含一些本地资料和参考工程，默认不要纳入普通功能提交：

- `docs/Ky X1芯片手册.pdf`
- `docs/OPI RV2 V1_1_SCH_20250508(1).pdf`
- `docs/OrangePi_RV2_X1_用户手册_v1.1.pdf`
- `ohos_electron_hap/`

提交前必须看一眼：

```bash
git status --short
```

如果只是提交 Windows 桌面端或非 Blockly 自研应用，不要使用：

```bash
git add -A
```

应改用定向添加，例如：

```bash
git add app docs/自动化开发执行记录.md
```

OpenHarmony 端的 `openharmony-port/entry/src/main/resources/rawfile/app/` 是由 `app/` 同步生成的资源。修改主应用后，应运行：

```bash
npm.cmd run oh:check
```

再检查并提交同步后的 OpenHarmony rawfile 变化。

## 九、推荐提交前检查

非 Blockly 自研应用主线提交前建议运行：

```bash
npm.cmd run check
npm.cmd test
npm.cmd run smoke
npm.cmd run oh:check
```

Blockly 桌面端提交前建议运行：

```bash
npm.cmd --prefix ./desktop run check
npm.cmd --prefix ./desktop run test:core
```

如果检查失败，先修复再开 PR；如果确实无法运行，需要在 PR 描述里写清楚原因。
