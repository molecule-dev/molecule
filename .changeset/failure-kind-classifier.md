---
'@molecule/api-ai-tools': minor
---

`classifyRunFailure` reads what a failing request hit — the transport (refused, timeout, DNS, TLS), the HTTP status, or an assertion — and the failures-by-cause note names a connection error as a re-run, not as a cause in the app's code.
