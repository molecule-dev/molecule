---
'@molecule/api-ai-decisions-liquid-d1': patch
---

Every request now carries a deadline (30 s by default, `timeoutMs` config), so a connection that never answers fails instead of leaving `decide()` pending forever. The caller's `signal` and the deadline both apply, whichever fires first.
