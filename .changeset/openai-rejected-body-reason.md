---
'@molecule/api-ai-openai': minor
---

Report each rejected 429/503 body's upstream reason, read it exactly once, stop retrying OpenAI's own documented billing, spend, and quota failures, and preserve retries for compatible-endpoint throttling.
