---
'@molecule/api-ai-tools': minor
---

Accept common parameter aliases on every tool (`cmd` for `command`, `file` for `path`, `body` for `content`, camelCase for snake_case) and return an actionable error instead of an internal TypeError when a required parameter is missing. `exec_command` now also accepts an optional `timeout`, clamped to the tool's ceiling and reported when a larger one is asked for. New exports: `guardAITool`, `guardToolExecute`, `normalizeToolInput`.
