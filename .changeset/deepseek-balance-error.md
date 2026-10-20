---
'@molecule/api-ai-deepseek': patch
---

Surface an exhausted provider account (HTTP 402 "Insufficient Balance") as its own non-retryable balance error instead of the generic "try again" message, treat 500/502/504/529 like 503 overload, and carry the HTTP status on other API errors so callers can distinguish a billing problem from a transient outage.
