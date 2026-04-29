---
name: debug
description: 用于定位和修复代码问题。Use when Codex needs to handle startup failures, build errors, runtime exceptions, blank pages, failing tests, dependency problems, API errors, or any request such as 修 bug, 报错排查, 项目启动失败, 最小修复, 不要重构.
---

# Debug Skill

## Workflow

1. Restate the symptom, command, error message, and expected behavior.
2. Inspect the smallest relevant surface first: logs, stack traces, recent diffs, entry files, configuration, and dependency manifests.
3. Identify the most likely root cause before editing.
4. Make the smallest high-confidence fix that preserves existing behavior.
5. Run the narrowest useful verification command.
6. Report the cause, changed files, verification result, and any remaining risk.

## Constraints

- Do not rewrite or restructure unrelated modules.
- Do not hide uncertainty. If the cause is not proven, say what evidence is missing.
- Prefer fixing the actual cause over adding defensive code that only masks the symptom.
- If a dependency is missing, check the project manifest before installing or adding a new package.
- If multiple fixes are possible, choose the one closest to the current project style.

## Output

- Root cause
- Files changed
- Verification performed
- Follow-up actions only when they are necessary
