---
'@molecule/api-push-notifications-molecule': minor
---

`send` throws `PushServiceError` (with the push service's `statusCode`) when the push service answers outside 2xx, as the web-push provider does, so pruning dead subscriptions on `error.statusCode` 404/410 works with either provider.
