# @molecule/api-notifications-slack

Slack notifications provider for molecule.dev.

Sends notifications to a Slack channel via an incoming webhook
(`NOTIFICATIONS_SLACK_WEBHOOK_URL` or `createProvider({ webhookUrl })`).

## Quick Start

```typescript
import { setProvider } from '@molecule/api-notifications'
import { provider } from '@molecule/api-notifications-slack'

setProvider('slack', provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-notifications-slack @molecule/api-notifications @molecule/api-secrets
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

#### `notificationsSlackSecretDefinitions`

Secret definitions required by the Slack notifications bond.

```typescript
const notificationsSlackSecretDefinitions: SecretDefinition[]
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

- `NOTIFICATIONS_SLACK_WEBHOOK_URL` *(required)* — Slack incoming webhook URL
  - Setup: Create a Slack app → Incoming Webhooks → Add New Webhook to Workspace, then copy the URL.
  - Get it here: [https://api.slack.com/apps](https://api.slack.com/apps)
  - Example: `https://hooks.slack.com/services/T00000000/B00000000/XXXX`

### Runtime Dependencies

- `@molecule/api-notifications`
- `@molecule/api-secrets`

- **`send()` never throws — it fails open.** A missing webhook URL, a non-2xx
  from Slack, or a timeout (default 10 s) all resolve to
  `{ success: false, error }`. If delivery matters, check `result.success`
  (or the per-channel results from the core `notifyAll()`); an
  unconfigured channel is otherwise silent.
- The message is a single mrkdwn `text` field: `*subject*` newline `body`.
  **`Notification.metadata` is not sent to Slack** — bake anything the
  receiver needs into `body`.
- The webhook URL and timeout are captured on first use (lazy) and frozen —
  env changes after the first send require a restart, or build a fresh
  instance via `createProvider()`.

## E2E Tests

Integration checklist — drive the real flow (no mocks), adapt each item
to this app's actual events/triggers, and check every box off one by
one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Each ops/event trigger the app defines (service down, new signup,
  a threshold crossed) actually calls `notifyAll()` and the message
  reaches every bonded channel. The sandbox CAPTURES outbound
  notifications instead of sending — read them with the `read_activity`
  tool and confirm the subject+body match the event that fired. Never
  mock the flow or modify production code to expose it.
- [ ] MULTI-CHANNEL: with >1 channel bonded, `notifyAll()` returns one
  `NotificationResult` per channel and a single channel failing
  (`success: false`) does not swallow the others — every other channel
  still captured, its own result still `success: true`.
- [ ] The body carries the real event data (no `undefined` placeholders)
  and nothing that must not leave the system — no secrets, tokens, or
  PII that an external channel (Slack/webhook) should never receive.
- [ ] Triggers are not end-user SPAMMABLE — no public endpoint lets a
  caller fire unbounded notifications; the trigger is internal (an
  ops/system event) or rate-limited.
