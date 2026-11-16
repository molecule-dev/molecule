# @molecule/api-push-notifications-molecule

## 1.2.0

### Minor Changes

- `send` throws `PushServiceError` (with the push service's `statusCode`) when the push service answers outside 2xx, as the web-push provider does, so pruning dead subscriptions on `error.statusCode` 404/410 works with either provider.
- `send` and `sendMany` take optional `SendOptions` (`ttl`, `urgency`, `topic`), sent to the push service as the Web Push TTL, Urgency and Topic headers.

## 1.1.1

### Patch Changes

- cdcdabb: Republished through trusted publishing; no code changes.

## 1.1.0

### Minor Changes

- New bond: deliver web push notifications through molecule.dev — VAPID handled for you, sends metered to your project. The hosted counterpart to `@molecule/api-push-notifications-web-push`; swap without code changes.
