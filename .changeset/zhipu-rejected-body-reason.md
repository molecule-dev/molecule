---
'@molecule/api-ai-zhipu': minor
---

Report the upstream reason with each rejected 429/503 body, read exactly once, and stop retrying an exhausted balance (code 1113) under a bounded retry budget.
