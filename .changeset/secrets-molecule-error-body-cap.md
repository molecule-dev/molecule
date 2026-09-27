---
'@molecule/api-secrets-molecule': patch
---

Vault error bodies embedded in thrown messages and warn logs are now capped at 200 characters, so an oversized or gateway-generated error page can no longer flood an exception message or the log stream.
