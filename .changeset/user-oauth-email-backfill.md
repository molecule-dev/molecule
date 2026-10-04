---
'@molecule/api-resource-user': patch
---

OAuth login now backfills a missing email on an existing account from a provider-verified address (non-destructive: never when another account holds the email; an unverified same-address account is upgraded to verified instead).
