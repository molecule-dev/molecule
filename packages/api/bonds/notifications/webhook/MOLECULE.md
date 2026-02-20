# @molecule/api-notifications-webhook

Webhook notifications provider for molecule.dev.

Sends notifications as HTTP POST requests with optional HMAC signing.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-notifications-webhook
```

## Usage

```typescript
import { setProvider } from '@molecule/api-notifications'
import { provider } from '@molecule/api-notifications-webhook'

setProvider('webhook', provider)
```

## API

### Interfaces

#### `ProcessEnv`

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

### Environment Variables

- `WEBHOOK_URL` *(required)*
- `WEBHOOK_SECRET` *(optional)*
