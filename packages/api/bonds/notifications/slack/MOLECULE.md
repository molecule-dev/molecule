# @molecule/api-notifications-slack

Slack notifications provider for molecule.dev.

Sends notifications to Slack via incoming webhooks.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-notifications-slack
```

## Usage

```typescript
import { setProvider } from '@molecule/api-notifications'
import { provider } from '@molecule/api-notifications-slack'

setProvider('slack', provider)
```

## API

### Interfaces

#### `ProcessEnv`

Environment variables consumed by the Slack notifications provider.

```typescript
interface ProcessEnv {
  NOTIFICATIONS_SLACK_WEBHOOK_URL: string
}
```

#### `SlackConfig`

Configuration for the Slack notifications provider.

```typescript
interface SlackConfig {
  /** Slack incoming webhook URL. Defaults to NOTIFICATIONS_SLACK_WEBHOOK_URL env var. */
  webhookUrl?: string
  /** Request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number
}
```

### Functions

#### `createProvider(config)`

Creates a Slack notifications provider.

```typescript
function createProvider(config?: SlackConfig): NotificationsProvider
```

- `config` — Optional configuration.

**Returns:** A NotificationsProvider that sends via Slack webhook.

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

- `SLACK_WEBHOOK_URL` *(required)*
