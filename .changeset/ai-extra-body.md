---
'@molecule/api-ai': minor
'@molecule/api-ai-openai': minor
'@molecule/api-ai-anthropic': minor
'@molecule/api-ai-google': minor
---

Add `ChatParams.extraBody` — extra provider-native request-body params (e.g. `reasoning_effort`, `enable_thinking`, `top_k`) shallow-merged into the outgoing request as a base, with the bond's structural fields (model, messages, tools, stream, token limit) always winning. The Gemini bond merges a nested `generationConfig` into its own rather than replacing it.
