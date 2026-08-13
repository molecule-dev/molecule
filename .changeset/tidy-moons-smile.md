---
'@molecule/api-resource-ai-models': minor
---

Model definitions can stage an announced price change with `scheduledPricing`: a dated rate card that replaces the base rates from its `effectiveFrom` instant. Pricing resolves per request, so the catalog is correct on both sides of a switch without an edit landed at the moment it takes effect. `GET /ai/models` serves whichever rates are billing now. DeepSeek V4 Pro and Flash carry the provider's 2026-08-16 rise, including its peak-hour windows. New exports: `effectiveBaseRates`, `effectivePeakPricing`, `withEffectivePricing`; `modelRegionRates` takes an optional instant.
