---
'@molecule/api-payments-stripe': patch
---

Checkout now returns the buyer to the app's `/plan-updated` page instead of the API's verify endpoint, whose host holds no session cookie (the redirect answered 401 and the plan was never granted), and the session carries `client_reference_id` + `metadata.userId` so the resulting customer can be linked to the account that paid. `createCheckoutSession` accepts `clientReferenceId`. Requires `@molecule/api-payments` ^1.1.0.
