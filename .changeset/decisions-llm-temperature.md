---
'@molecule/api-ai-decisions-llm': patch
---

Omit the `temperature` parameter by default — several catalog models (gpt-6-luna and the other `rejectsTemperature` entries) reject the parameter itself with a 400, which made every decide call fail against them (caught live 2026-10-05; the same fix `api-ocr-llm` shipped). Pin sampling with the new optional `temperature` config only when you know the bonded model accepts it.
