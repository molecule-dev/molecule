---
'@molecule/api-ai-deepseek': patch
---

Relax a forced `toolChoice` to the model's own choice when thinking is enabled. DeepSeek rejects the combination with `400 Thinking mode does not support this tool_choice`, which fails the whole request; the thinking setting is kept and the tool nudge is degraded instead.
