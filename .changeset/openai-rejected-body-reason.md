---
'@molecule/api-ai-openai': minor
---

Report the upstream reason with each rejected 429/503 body, read exactly once, and stop retrying an exhausted quota (`insufficient_quota`) under a bounded retry budget.
