---
'@molecule/api-ai-openai': patch
'@molecule/api-ai-local': patch
---

Serialize `tool_use` and `tool_result` message blocks as native `tool_calls` and `role:"tool"` messages instead of flattening them to placeholder text. Multi-turn agentic tool loops now receive real tool results, so models that previously looped on their first tool call and never finished can complete a tool-driven conversation.
