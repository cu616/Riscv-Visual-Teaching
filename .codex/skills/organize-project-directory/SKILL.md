---
name: organize-project-directory
description: 用于整理项目工程目录、文件分层和仓库结构。Use when Codex needs to analyze or reorganize folders, move files, propose a cleaner repository layout, separate docs/scripts/src/tests/assets, add README navigation, remove structural clutter, or answer requests such as 整理工程目录, 项目目录规范化, 文件结构优化, 仓库结构梳理.
---

# Organize Project Directory Skill

## Workflow

1. Inventory the current tree with fast file search and identify source code, docs, scripts, tests, configs, assets, generated outputs, and temporary files.
2. Detect the project type and respect framework conventions before proposing moves.
3. Separate required moves from optional cleanup. Prefer a plan first when moving many files.
4. Preserve imports, links, script paths, README references, and tooling configuration after any move.
5. Update documentation navigation when directory names or document locations change.
6. Verify with search, tests, build commands, or link/path checks as appropriate.

## Directory Principles

- Keep project entry points easy to find.
- Put reusable scripts under `scripts/`.
- Put human documentation under `docs/` when documentation grows beyond a few root files.
- Put source code under the framework's conventional source directory.
- Keep generated outputs, caches, and local environment files out of versioned source unless intentionally tracked.
- Avoid moving files only for cosmetic reasons when it would create churn.

## Constraints

- Do not delete files unless the user explicitly asks or the file is clearly generated and safe to regenerate.
- Do not move files before checking references that may break.
- When the repository is small, recommend structure without over-engineering.

## Output

- Current structure summary
- Proposed structure or completed moves
- Broken-reference checks performed
- Follow-up cleanup suggestions
