# @molecule/api-activity

Activity capture core interface for molecule.dev.

Defines the {@link ActivityEvent} shape and the {@link ActivitySink}
interface (`record(event)`), bonded via `bond('activity-sink', sink)`.
Per-category capture provider bonds build events from the call args of the
category interface they wrap and forward them to the bonded sink via the
free-function {@link record}, which no-ops if no sink is bonded.

## Quick Start

```typescript
import { setSink, record } from '@molecule/api-activity'
import { provider } from '@molecule/api-activity-console'

// Wire a sink at startup
setSink(provider)

// Record an event from a capture provider (no-ops if no sink bonded)
await record({
  id: crypto.randomUUID(),
  type: 'email',
  status: 'captured',
  recipient: 'user@example.com',
  summary: 'Welcome email',
  timestamp: new Date().toISOString(),
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-activity
```

## API

### Interfaces

#### `ActivityEvent`

A single captured outbound side effect.

Built by a capture provider from the wrapped call's arguments, recorded
to the bonded {@link ActivitySink}, then surfaced in the IDE Activity panel
and as an inline card in the Synthase chat.

```typescript
interface ActivityEvent {
  /** Unique identifier for this event (typically a UUID). */
  id: string

  /** The category of side effect this event represents. */
  type: ActivityType

  /** The lifecycle status of the side effect. */
  status: ActivityStatus

  /** Primary recipient (email address, phone number, channel id, URL, etc.). */
  recipient?: string

  /** Short human-readable label for the inline card (e.g. an email subject). */
  summary?: string

  /** Full captured payload (dev only — may contain PII). */
  payload?: unknown

  /** The result returned to the caller (synthetic or real). */
  result?: unknown

  /** When the side effect was captured, as an ISO 8601 timestamp. */
  timestamp: string
}
```

#### `ActivitySink`

Activity sink interface.

Sink bonds implement this to persist or forward captured events — e.g. a
console logger for standalone scaffolded apps, or an HTTP POST to
molecule.dev for sandboxed/managed apps.

```typescript
interface ActivitySink {
  /**
   * Records a single captured activity event.
   *
   * Implementations MUST be best-effort: a capture failure must never break
   * the calling application, so sinks should catch and log their own errors
   * rather than throwing.
   *
   * @param event - The captured activity event to record.
   */
  record(event: ActivityEvent): Promise<void>
}
```

### Types

#### `ActivityStatus`

The lifecycle status of a captured side effect.

- `'captured'` — intercepted in dev, not actually delivered (synthetic success).
- `'sent'` — delegated to a real provider and accepted for delivery.
- `'delivered'` — confirmed delivered by the provider.
- `'failed'` — delivery (or capture) failed.

```typescript
type ActivityStatus = 'captured' | 'sent' | 'delivered' | 'failed'
```

#### `ActivityType`

The category of outbound side effect an {@link ActivityEvent} represents.

```typescript
type ActivityType = 'email' | 'sms' | 'push' | 'webhook' | 'channel'
```

### Functions

#### `getSink()`

Retrieves the bonded activity sink, or `null` if none is bonded.

```typescript
function getSink(): ActivitySink | null
```

**Returns:** The bonded activity sink, or `null`.

#### `hasSink()`

Checks whether an activity sink is currently bonded.

```typescript
function hasSink(): boolean
```

**Returns:** `true` if an activity sink is bonded.

#### `record(event)`

Records a captured activity event to the bonded sink.

No-ops silently if no sink is bonded, so capture providers can call this
unconditionally without checking {@link hasSink} first. Delegates to the
sink's `record()` otherwise.

```typescript
function record(event: ActivityEvent): Promise<void>
```

- `event` — The captured activity event to record.

#### `setSink(sink)`

Registers an activity sink as the active singleton. Called by sink bond
packages during application startup.

```typescript
function setSink(sink: ActivitySink): void
```

- `sink` — The activity sink implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Console | `@molecule/api-activity-console` |
| HTTP | `@molecule/api-activity-http` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
