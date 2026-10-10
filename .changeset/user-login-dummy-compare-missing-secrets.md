---
'@molecule/api-resource-user': patch
---

Log in now runs the same dummy password comparison (and records the failure) when an account exists but its secrets row is missing.
