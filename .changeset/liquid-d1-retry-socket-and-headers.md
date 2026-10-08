---
'@molecule/api-ai-decisions-liquid-d1': patch
---

Retries cancel the failed response body before backing off (no stranded sockets), and the `headers` hook is re-resolved on every attempt so short-lived tokens are re-minted.
