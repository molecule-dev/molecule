---
'@molecule/api-ai-openai': patch
---

Replay each tool call's preceding reasoning and web search items on the Responses API, so a model that searched does not search again and repeat its tool call on the next turn.
