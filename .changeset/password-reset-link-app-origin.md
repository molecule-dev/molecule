---
'@molecule/api-resource-user': patch
---

The password-reset email now links to the reset page when only `APP_ORIGIN` is configured (it used to require `SITE_ORIGIN`), and the link carries the account's email so the reset page can prefill it.
