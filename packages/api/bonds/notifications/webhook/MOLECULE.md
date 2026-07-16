# @molecule/api-notifications-webhook

Webhook notifications provider for molecule.dev.

Sends notifications as HTTP POST requests with optional HMAC signing.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-notifications'
import { provider } from '@molecule/api-notifications-webhook'

setProvider('webhook', provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-notifications-webhook @molecule/api-notifications @molecule/api-secrets
```

## API

### Interfaces

#### `ProcessEnv`

Environment variables consumed by the webhook notifications provider.

```typescript
interface ProcessEnv {
  NOTIFICATIONS_WEBHOOK_URL: string
  NOTIFICATIONS_WEBHOOK_SECRET?: string
}
```

#### `WebhookConfig`

Configuration for the webhook notifications provider.

```typescript
interface WebhookConfig {
  /** The webhook URL to POST to. Defaults to NOTIFICATIONS_WEBHOOK_URL env var. */
  url?: string
  /** Optional HMAC secret for request signing. Defaults to NOTIFICATIONS_WEBHOOK_SECRET env var. */
  secret?: string
  /** Request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number
}
```

### Functions

#### `createProvider(config)`

Creates a webhook notifications provider.

```typescript
function createProvider(config?: WebhookConfig): NotificationsProvider
```

- `config` — Optional configuration.

**Returns:** A NotificationsProvider that sends via HTTP webhook.

### Constants

#### `notificationsWebhookSecretDefinitions`

Secret definitions required by the webhook notifications bond.

```typescript
const notificationsWebhookSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation.

```typescript
const provider: NotificationsProvider
```

## Core Interface
Implements `@molecule/api-notifications` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-notifications` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `NOTIFICATIONS_WEBHOOK_URL` *(required)* — Notification webhook URL
  - Setup: HTTPS endpoint that receives notification POSTs from your app.
  - Example: `https://example.com/hooks/notify`
- `NOTIFICATIONS_WEBHOOK_SECRET` *(optional)* — Notification webhook signing secret
  - **Auto-generated at scaffold — no manual setup.**

### Runtime Dependencies

- `@molecule/api-notifications`
- `@molecule/api-secrets`

Wire format: the POST body is
`{ subject, body, timestamp, metadata }` — `metadata` is nested under its
own key (never spread at the top level), so a `Notification.metadata`
object can safely use keys like `subject`/`body`/`timestamp` without
colliding with the canonical envelope fields the receiver (and the HMAC
signature, when a secret is configured) depends on.

- **Signature (when a secret is configured):** the POST carries
  `X-Signature-256: sha256=<hex>` where `<hex>` is the HMAC-SHA256 of the
  EXACT raw JSON body, keyed by `NOTIFICATIONS_WEBHOOK_SECRET` (or
  `config.secret`). Receivers must compute the HMAC over the raw request
  bytes BEFORE parsing (a re-serialized body will not match) and compare
  timing-safely. No secret → no header.
- **`send()` never throws — it fails open.** Missing URL, non-2xx, or
  timeout (default 10 s) resolve to `{ success: false, error }`; check
  `result.success` when delivery matters.
- URL/secret/timeout are captured on first use (lazy) and frozen — env
  changes after the first send require a restart or a fresh
  `createProvider()` instance.
