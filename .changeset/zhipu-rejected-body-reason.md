---
'@molecule/api-ai-zhipu': minor
---

Report the upstream reason with each rejected 429/503 body, read exactly once, and stop retrying Zhipu's documented balance, usage, and spend quota failures under a bounded retry budget.
