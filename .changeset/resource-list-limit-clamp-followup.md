---
'@molecule/api-resource-workspace': patch
'@molecule/api-resource-follow': patch
'@molecule/api-resource-thread': patch
'@molecule/api-resource-message': patch
'@molecule/api-resource-activity-feed': patch
'@molecule/api-resource-share': patch
'@molecule/api-resource-template': patch
'@molecule/api-resource-comment': patch
'@molecule/api-resource-device': patch
---

The list endpoints clamp the `limit` query parameter into 1..500 — an oversized `limit` previously passed through unbounded to the store query (and the device query allowed up to 10000).
