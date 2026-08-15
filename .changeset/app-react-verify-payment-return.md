---
'@molecule/app-react': minor
---

Adds `useVerifyPaymentReturn`, which confirms a purchase with `POST /users/:id/verify-payment/:provider` after a payment provider redirects back to the app, reading the transaction id a provider left in the query.
