---
'@molecule/api-ai-openai': minor
---

Report each rejected 429/503 body's upstream reason, read it exactly once, and use configurable upstream quota semantics to stop OpenAI/Azure billing, spend, and quota failures while preserving compatible-endpoint throttling.
