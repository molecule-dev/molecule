---
'@molecule/api-ai-decisions-liquid-d1': patch
---

A missing answer for a question whose id is `"__proto__"` now raises the usual "no answer for question" error instead of being fabricated into a zero-confidence answer.
