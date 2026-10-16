---
'@molecule/api-ai': patch
'@molecule/api-ai-deepseek': patch
---

Requests can carry `stop` sequences. `ChatParams.stop` declares the sequences a provider must stop generating at (OpenAI-compatible `stop`), and the DeepSeek bond sends them, capped at the 16 its API takes. The matched text is dropped from the reply, so a caller can end a reply it would discard at the cost of the tokens written before the match instead of the whole answer.
