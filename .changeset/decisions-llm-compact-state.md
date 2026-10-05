---
'@molecule/api-ai-decisions-llm': patch
---

Serialise an object `state` as compact JSON instead of indented JSON, so deeply nested input no longer grows the prompt by orders of magnitude.
