# @molecule/api-notification-center-database

Database-backed notification center provider for molecule.dev.

Implements the `@molecule/api-notification-center` interface using the
bonded `@molecule/api-database` DataStore for persistence.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-notification-center'
import { createProvider } from '@molecule/api-notification-center-database'

// Bond at startup (requires @molecule/api-database to be bonded)
setProvider(createProvider())

// Or with custom table names
setProvider(createProvider({
  tableName: 'user_notifications',
  preferencesTableName: 'user_notification_prefs',
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-notification-center-database
```

## API

### Interfaces

#### `DatabaseNotificationCenterConfig`

Configuration for the database-backed notification center provider.

```typescript
interface DatabaseNotificationCenterConfig {
  /** Table name for notifications. Defaults to `'notifications'`. */
  tableName?: string

  /** Table name for notification preferences. Defaults to `'notification_preferences'`. */
  preferencesTableName?: string
}
```

### Functions

#### `createProvider(config)`

Creates a database-backed {@link NotificationCenterProvider}.

Requires a DataStore to be bonded via `@molecule/api-database` before use.

```typescript
function createProvider(config?: DatabaseNotificationCenterConfig): NotificationCenterProvider
```

- `config` — Database notification center configuration.

**Returns:** A fully initialised `NotificationCenterProvider` backed by the bonded DataStore.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` 1.0.0
- `@molecule/api-notification-center` 1.0.0
