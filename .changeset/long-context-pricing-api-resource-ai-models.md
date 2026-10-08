---
'@molecule/api-resource-ai-models': minor
---

Adds `longContextPricing` to model definitions and an optional `promptTokens` argument to `modelRegionRates`, so models priced by prompt length (Claude Haiku 5.5 above 100K tokens) bill the long-context rates.
