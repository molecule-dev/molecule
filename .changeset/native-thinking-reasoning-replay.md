---
'@molecule/api-ai-deepseek': patch
---

Replay each retained assistant turn's reasoning as `reasoning_content` when thinking mode is enabled, including turns without a tool call.
