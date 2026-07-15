# @molecule/app-notification-center-default

Default notification center provider for molecule.dev.

Implements `NotificationCenterProvider` from `@molecule/app-notification-center`
using pure TypeScript in-memory state management with support for polling,
realtime push updates, and subscription-based state notifications.

## Quick Start

```typescript
import { provider } from '@molecule/app-notification-center-default'
import { setProvider } from '@molecule/app-notification-center'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-notification-center-default @molecule/app-notification-center
```

## API

### Interfaces

#### `DefaultNotificationCenterConfig`

Provider-specific configuration for the default notification center provider.

```typescript
interface DefaultNotificationCenterConfig {
  /**
   * Default number of notifications to fetch per page.
   * Defaults to `20`.
   */
  defaultPageSize?: number

  /**
   * Whether to automatically refresh the unread count when polling.
   * Defaults to `true`.
   */
  refreshUnreadOnPoll?: boolean
}
```

### Functions

#### `createDefaultProvider(config)`

Creates a default notification center provider.

```typescript
function createDefaultProvider(config?: DefaultNotificationCenterConfig): NotificationCenterProvider
```

- `config` — Optional provider-specific configuration.

**Returns:** A `NotificationCenterProvider` backed by in-memory state management.

### Constants

#### `provider`

Default notification center provider instance.

```typescript
const provider: NotificationCenterProvider
```

## Core Interface
Implements `@molecule/app-notification-center` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-notification-center'
import { provider } from '@molecule/app-notification-center-default'

export function setupNotificationCenterDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-notification-center` >=1.0.0

### Runtime Dependencies

- `@molecule/app-notification-center`

`poll()`, `loadMore()`, and `refresh()` all catch their own fetch
failures — the in-memory list is never wiped and the loop/promise chain
never throws — but the failure is not silently discarded: it is captured
into `NotificationCenterState.lastError` (cleared back to `undefined` on
the next successful call of that same method) and emitted to subscribers,
so a UI consumer can render a retry affordance even while a
stale-but-populated list continues to display.
