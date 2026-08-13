---
'@molecule/api-resource-user': patch
---

`updatePlan` now logs every rejected plan update (with `errorKey` context) and analytics-tracking failures instead of silently swallowing them.
