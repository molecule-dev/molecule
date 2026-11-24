---
'@molecule/api-billing-routes': minor
---

`GET /status` reports the user's stored plan, the routes use whichever bonded payments provider can check out, prices are listed for sale only when that provider can sell them, and a provider's missing-secret error is passed through.
