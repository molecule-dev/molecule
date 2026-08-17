---
'@molecule/api-resource-user': minor
---

`PATCH /users/:id/plan` accepts an optional `quantity`, passed to the payment provider for per-seat plans and clamped to a whole number of at least one.
