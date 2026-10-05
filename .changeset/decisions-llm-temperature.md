---
'@molecule/api-ai-decisions-llm': patch
---

Omit the `temperature` parameter by default — several catalog models reject the parameter itself with a 400, which made every decide call fail against them. Pin sampling with the new optional `temperature` config only when the bonded model accepts it.
