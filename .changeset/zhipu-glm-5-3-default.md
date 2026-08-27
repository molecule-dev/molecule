---
'@molecule/api-ai-zhipu': patch
---

Default model is now `glm-5.3` (was `glm-5.2`). Documents that glm-5.3 narrows `reasoning_effort` to low | high | max and can no longer disable reasoning; the budget-tokens fallback keeps returning the `'high'`/`'low'` both generations accept.
