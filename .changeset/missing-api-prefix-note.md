---
'@molecule/api-ai-tools': patch
---

When a traced request 404s on a path that lacks the API prefix the app's own calls carry, the failure trace note names the prefix and points at the unset HTTP client base URL instead of the route handler.
