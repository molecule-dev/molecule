---
'@molecule/api-resource-user': minor
---

Adds `POST /users/:id/billing-portal/:provider`, which opens the bonded provider's hosted billing portal so a subscriber can update their card, read invoices, and cancel. Returns `{ url }`; an optional `returnPath` sends them back to a specific app page. Requires `@molecule/api-payments` ^1.1.0.
