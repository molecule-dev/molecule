---
'@molecule/api-payments-stripe': patch
---

Checkout sessions now attach their metadata to the subscription they create, so subscription webhooks can be matched to the buying account on a first purchase.
