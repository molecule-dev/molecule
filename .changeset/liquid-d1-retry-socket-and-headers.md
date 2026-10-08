---
'@molecule/api-ai-decisions-liquid-d1': patch
---

Retries cancel the failed response body before backing off (no stranded sockets), and the `headers` hook is re-resolved on every attempt so short-lived tokens are re-minted. A 2xx response with a non-JSON body fails with a status-carrying error instead of a raw `SyntaxError`. Configuration is resolved on each call, so keys the secrets registry writes into the environment after startup are picked up without a restart.
