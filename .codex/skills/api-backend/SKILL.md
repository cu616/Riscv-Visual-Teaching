---
name: api-backend
description: 用于设计、实现、解释或修复后端 API。Use when Codex needs to add Flask/FastAPI/Node/Java/Spring endpoints, route handlers, request and response schemas, CRUD logic, validation, service layers, database access, or requests such as 新增接口, 后端接口, API 设计, 路由, 数据库交互.
---

# API Backend Skill

## Workflow

1. Inspect the current backend framework, app entry, route registration, service structure, and dependency manifest.
2. Define the endpoint contract before editing: method, path, request body, query params, response body, status codes, and errors.
3. Follow existing project layering. Keep route, service, model, and validation code where the project already expects them.
4. Implement the smallest complete backend path.
5. Add or update focused tests or request examples when the project has a testing pattern.
6. Verify with the narrowest useful command, such as a unit test, route test, or startup check.

## Constraints

- Do not change existing authentication, database schema, or global middleware unless the task requires it.
- Do not invent a new response format if the project already has one.
- Validate external input at the boundary.
- Keep errors predictable and useful for frontend callers.
- Prefer explicit endpoint examples over vague descriptions.

## Output

- Endpoint contract
- Files changed
- Verification result
- Example request when useful
