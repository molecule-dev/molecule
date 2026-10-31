---
'@molecule/api-ai-openai': minor
---

Report the upstream reason with each rejected 429/503 body, read exactly once, and stop retrying OpenAI's documented billing, spend, and quota failures under a bounded retry budget.
