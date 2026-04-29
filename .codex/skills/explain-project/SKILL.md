---
name: explain-project
description: 用于向新成员解释项目结构、代码逻辑和模块关系。Use when Codex should not edit code but should summarize a repository, identify entry files, explain frontend/backend flow, map key modules, describe call chains, or answer requests such as 讲解项目, 项目结构分析, 新成员上手, 入口文件在哪里.
---

# Explain Project Skill

## Workflow

1. Start with the repository purpose, technology stack, and how to run it if that is discoverable.
2. Map the top-level directories and separate source code, scripts, docs, tests, assets, and generated files.
3. Identify entry files, routing, configuration, data flow, and important module boundaries.
4. Explain the most relevant files in beginner-friendly language without oversimplifying behavior.
5. Include file links and line references when pointing to specific code.
6. End with the next three practical things a new contributor should inspect or try.

## Constraints

- Do not modify files.
- Do not claim certainty when a behavior is inferred but not proven.
- Avoid listing every file when a grouped explanation is clearer.
- Prefer diagrams or short flow descriptions for cross-module behavior.

## Output

- Project purpose
- Directory map
- Main entry points
- Key workflows
- Suggested next steps
