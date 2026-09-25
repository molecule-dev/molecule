---
'@molecule/api-ai-summarization-llm': patch
---

Summaries are plain text (markdown the model adds is removed) and the model is asked for a length under the cap, so answers stop landing exactly on it.
