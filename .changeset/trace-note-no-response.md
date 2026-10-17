---
'@molecule/api-ai-tools': patch
---

`failureTraceNote` names a request whose response Playwright never recorded as exactly that — not as a failure — and reports a network error with its own error text; the "a click that changed nothing is usually one of these requests failing" line now appears only when a listed request really failed.
