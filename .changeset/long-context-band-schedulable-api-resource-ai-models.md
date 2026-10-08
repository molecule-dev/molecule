---
'@molecule/api-resource-ai-models': minor
---

`scheduledPricing` can carry a replacement `longContextPricing` band that takes effect from the same `effectiveFrom` (omitted → the existing band carries through), so a price change on a prompt-length-priced model moves both rate cards together. `effectiveLongContextPricing()` resolves the band in effect at an instant; `modelRegionRates()` and `withEffectivePricing()` use it.
