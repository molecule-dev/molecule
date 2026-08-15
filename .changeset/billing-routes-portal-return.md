---
'@molecule/api-billing-routes': minor
---

`POST /portal` no longer passes a caller-supplied `returnUrl` straight to the payment provider — the provider renders it as a link on its own domain, so an arbitrary one was an open redirect. Send an app-relative `returnPath` instead; a `returnUrl` is honored only when it is already on the app origin. Requires `@molecule/api-payments` ^1.1.0.
