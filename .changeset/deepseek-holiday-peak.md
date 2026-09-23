---
'@molecule/api-resource-ai-models': minor
'@molecule/app-ai-models': minor
'@molecule/app-ide-react': patch
---

Peak pricing can exclude dates (`peakPricing.excludedDatesUtc`), and the DeepSeek models exclude Chinese public holidays, which DeepSeek bills off-peak. `peakPricing.rule` records the provider's own peak-hours sentence and where it is published.
