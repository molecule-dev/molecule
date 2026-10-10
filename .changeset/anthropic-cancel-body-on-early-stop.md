---
'@molecule/api-ai-anthropic': patch
---

Cancel the response body when streaming stops before the body is exhausted, so a truncated turn does not strand its connection.
