---
'@molecule/api-ai-deepseek': minor
---

Add a `waitForCredit` option that holds a cancellable request through HTTP 402 until the account is topped up, and report each wait to `params.onProviderWait`.
