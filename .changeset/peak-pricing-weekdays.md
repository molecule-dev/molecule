---
'@molecule/api-resource-ai-models': minor
'@molecule/app-ai-models': minor
'@molecule/app-ide-react': patch
---

Peak-hour pricing windows can be restricted to certain UTC weekdays (`peakPricing.windows[].daysOfWeekUtc`), and the DeepSeek entries now carry the Monday-through-Friday qualifier their rate card publishes, so weekend hours inside those windows no longer meter at the peak multiplier. The `/models` picker labels a weekday-only window with the days it applies on.
