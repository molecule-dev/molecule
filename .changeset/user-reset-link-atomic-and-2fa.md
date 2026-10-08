---
'@molecule/api-resource-user': patch
---

Password resets submitted through the emailed link are consumed atomically, and logging in with a reset link no longer spends the link on the two-factor challenge, so the retried request with the 2FA code now succeeds.
