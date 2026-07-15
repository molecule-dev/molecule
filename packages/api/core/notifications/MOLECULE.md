# @molecule/api-notifications

Notifications interface for molecule.dev.

Supports multiple notification channels (webhook, Slack, email, etc.)
through named bonds. Use notifyAll() to broadcast to all channels.

## Quick Start

```typescript
import { setProvider, notifyAll } from '@molecule/api-notifications'
import { provider as webhook } from '@molecule/api-notifications-webhook'

setProvider('webhook', webhook)

await notifyAll({
  subject: 'Service Down',
  body: 'API is not responding',
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-notifications @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `Notification`

A notification to send through a notification channel.

```typescript
interface Notification {
  /** Subject or title of the notification. */
  subject: string
  /** Body text of the notification (may contain markdown). */
  body: string
  /** Optional metadata for provider-specific features. */
  metadata?: Record<string, unknown>
}
```

#### `NotificationResult`

Result of a notification send attempt.

```typescript
interface NotificationResult {
  /** Whether the notification was sent successfully. */
  success: boolean
  /** Error message if the send failed. */
  error?: string
  /** Channel name this result came from (populated by notifyAll). */
  channel?: string
  /** ISO 8601 timestamp of the send attempt (populated by notifyAll). */
  sentAt?: string
}
```

#### `NotificationsProvider`

Notifications provider interface. Providers implement specific channels
(webhook, Slack, email, etc.).

Bonded as named providers: bond('notifications', 'webhook', provider)

```typescript
interface NotificationsProvider {
  /** The channel name (e.g. 'webhook', 'slack', 'email'). */
  readonly name: string

  /**
   * Sends a notification through this channel.
   *
   * @param notification - The notification to send.
   * @returns The result of the send attempt.
   */
  send(notification: Notification): Promise<NotificationResult>
}
```

### Functions

#### `getAllProviders()`

Returns all bonded notification providers.

```typescript
function getAllProviders(): Map<string, NotificationsProvider>
```

**Returns:** Map of channel name to provider.

#### `getProvider(name)`

Retrieves a specific notifications provider by channel name.

```typescript
function getProvider(name: string): NotificationsProvider | null
```

- `name` — The channel name.

**Returns:** The provider, or null if not bonded.

#### `hasProvider()`

Checks whether any notifications provider is bonded.

Notification channels are NAMED bonds (`bond('notifications', name, provider)`),
so this checks the named-provider map. (`isBonded('notifications')` alone checks
the singleton map and would always report `false` here — a channel registered
via {@link setProvider} never appears there.)

```typescript
function hasProvider(): boolean
```

**Returns:** true if at least one provider is bonded.

#### `notifyAll(notification)`

Sends a notification through ALL bonded channels CONCURRENTLY (via
`Promise.allSettled`), so one slow/hanging channel cannot delay every
other channel behind it. Failures in one channel do not prevent other
channels from being tried. Errors are logged, not thrown. Results are
reassembled in registration (Map insertion) order regardless of which
channel settles first.

```typescript
function notifyAll(notification: Notification): Promise<NotificationResult[]>
```

- `notification` — The notification to send.

**Returns:** Array of results, one per channel, in registration order.

#### `setProvider(name, provider)`

Registers a notifications provider under its channel name.

```typescript
function setProvider(name: string, provider: NotificationsProvider): void
```

- `name` — The channel name (e.g. 'webhook', 'slack').
- `provider` — The provider implementation.

## Available Providers

| Provider | Package |
|----------|---------|
| Slack | `@molecule/api-notifications-slack` |
| Webhook | `@molecule/api-notifications-webhook` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

`notifyAll()` fans out to every bonded channel CONCURRENTLY
(`Promise.allSettled`), not serially — a slow or hanging channel does not
delay the delivery of any other channel behind it. Per-channel failures
(rejected result or thrown error) are isolated and logged; results are
always returned in the channels' registration order, regardless of which
settles first.

## Translations

Translation strings are provided by `@molecule/api-locales-notifications`.
