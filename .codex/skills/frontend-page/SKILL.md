---
name: frontend-page
description: 用于生成或修改前端页面和可视化界面。Use when Codex needs to build React/Vue/HTML pages, dashboards, forms, teaching demos, Blockly-style visual tools, UI prototypes, page layouts, components, or requests such as 生成页面, 前端原型, 登录页, 首页, 可视化页面.
---

# Frontend Page Skill

## Workflow

1. Identify the existing frontend stack, entry files, routing, styling system, and component conventions.
2. Define the smallest usable page or component set needed for the request.
3. Reuse existing layout, tokens, components, icons, and data-fetching patterns when present.
4. Use mock data only when no backend contract exists, and keep it easy to replace.
5. Implement complete visible states: loading, empty, normal, and error states when relevant.
6. Verify the page by running the project command or a focused build/lint check when available.

## Design Rules

- Make the first screen the actual usable interface, not a marketing landing page unless requested.
- Keep UI dense enough for real work, with clear hierarchy and responsive constraints.
- Use familiar controls for interactions: buttons for commands, inputs for data, tabs for views, toggles for booleans.
- Avoid unrelated visual flourishes, one-off design systems, and oversized hero text inside app panels.
- Ensure text does not overflow controls on mobile or desktop.

## Output

- Summary of the page behavior
- Files changed
- How to run or view the page
- Verification result
