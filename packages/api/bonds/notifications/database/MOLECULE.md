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
npm install @molecule/api-notification-center-database @molecule/api-database @molecule/api-notification-center
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

## Core Interface
Implements `@molecule/api-notification-center` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` 1.0.0
- `@molecule/api-notification-center` 1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-notification-center`

- **The tables must already exist — nothing auto-creates them.** Add a
  migration for `notifications` (or your `tableName`) with columns:
  `id` (uuid/text, PK), `user_id` (text), `type` (text), `title` (text),
  `body` (text), `read` (boolean — 0/1 integers fine on SQLite/MySQL),
  `data` (text, JSON-serialized, nullable), `channels` (text,
  JSON-serialized, nullable), `created_at` (timestamp). Index
  `(user_id, read)` and `(user_id, created_at)` for the list/count paths.
  And `notification_preferences` (or `preferencesTableName`): `id` (uuid/
  text, PK), `user_id` (text, unique), `email`/`push`/`sms` (boolean),
  `channels` (text, JSON-serialized).
- **Bond the `@molecule/api-database` DataStore first** — every method
  calls `getStore()` and throws without it.
- `sendBulk()` inserts sequentially (one `create` per entry, no
  transaction) — a mid-batch failure leaves earlier rows written.
- `getAll()` defaults to `limit: 50`, newest first; drive pagination from
  the returned `total`, not `items.length`.
