---
name: refactor-code
description: 用于在保持行为稳定的前提下整理、简化和优化代码。Use when Codex needs to remove duplication, improve naming, split large functions, clarify module boundaries, simplify components, improve maintainability, or handle requests such as 重构, 优化代码结构, 清理重复代码, 不改变功能.
---

# Refactor Code Skill

## Workflow

1. Identify the concrete maintainability problem and the behavior that must stay unchanged.
2. Inspect nearby tests, callers, public APIs, and configuration before editing.
3. Choose the smallest refactor that improves the stated problem.
4. Keep changes behavior-preserving unless the user explicitly asks for behavior changes.
5. Run existing tests or a focused verification command.
6. Explain what became simpler and what behavior was preserved.

## Constraints

- Do not mix feature work with refactoring unless requested.
- Do not rename public APIs, routes, files, or exported symbols without checking all callers.
- Avoid broad formatting-only changes in unrelated files.
- Prefer local helper extraction over new architecture unless the codebase already uses that pattern.
- If test coverage is weak, call out the residual risk.

## Output

- Refactor goal
- Files changed
- Behavior preservation notes
- Verification result
