# @molecule/app-notification-center-default

Default notification center provider for molecule.dev.

Implements `NotificationCenterProvider` from `@molecule/app-notification-center`
using pure TypeScript in-memory state management with support for polling,
realtime push updates, and subscription-based state notifications.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-notification-center-default
```

## Usage

```typescript
import { provider } from '@molecule/app-notification-center-default'
import { setProvider } from '@molecule/app-notification-center'

setProvider(provider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-notification-center` >=1.0.0
