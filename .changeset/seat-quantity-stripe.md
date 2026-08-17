---
'@molecule/api-payments-stripe': minor
---

`createCheckoutSession` accepts a `quantity` for per-seat plans, and the idempotency key now includes it so changing the seat count starts a new session instead of replaying the previous one.
