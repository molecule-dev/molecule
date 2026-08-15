---
'@molecule/api-payments': minor
---

Adds `resolveCheckoutRedirectUrls` and `resolveBillingPortalReturnUrl`, which build the URLs a hosted checkout or billing portal returns the buyer to from the APP origin (`APP_ORIGIN`/`ORIGIN`) — configurable with `PAYMENTS_PLAN_UPDATED_PATH`, `PAYMENTS_CHECKOUT_CANCEL_PATH` and `PAYMENTS_BILLING_RETURN_PATH`.
