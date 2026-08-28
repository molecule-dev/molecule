---
'@molecule/api-resource-ai-models': patch
---

Correct the Anthropic `codeExecutionToolType` to the current `code_execution_20260521` (the previous value was a beta-header date, not a tool type) and remove `webSearchToolType` from OpenAI entries — the chat-completions endpoint the OpenAI provider uses has no such tool type, so advertising it surfaced a capability that could never work.
