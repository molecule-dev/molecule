---
'@molecule/api-resource-user': patch
---

Log-in, sign-up and OAuth log-in responses no longer include secret user columns (confirmation/reset tokens, OAuth material) — the same denylist the self-read endpoints already apply.
