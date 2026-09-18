---
'@molecule/api-resource-bookmark': patch
'@molecule/api-resource-comment': patch
'@molecule/api-resource-follow': patch
'@molecule/api-resource-trash': patch
'@molecule/api-resource-version-history': patch
'@molecule/api-resource-review': patch
'@molecule/api-resource-message': patch
---

The list endpoints now clamp the `limit` query parameter into 1..500 — an oversized `limit` previously passed through unbounded to the store query.
