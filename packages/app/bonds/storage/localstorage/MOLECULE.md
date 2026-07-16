# @molecule/app-storage-localstorage

localStorage provider for `@molecule/app-storage`.

This package provides a localStorage-based implementation of the molecule StorageProvider interface,
with support for both localStorage and sessionStorage, key prefixing, and custom serialization.

## Quick Start

```ts
import { createLocalStorageProvider } from '@molecule/app-storage-localstorage'
import { setProvider } from '@molecule/app-storage'

const storage = createLocalStorageProvider({
  prefix: 'myapp_',
})

setProvider(storage)

// Use via `@molecule/app-storage`
import { get, set, remove } from '@molecule/app-storage'

await set('user', { name: 'John' })
const user = await get<User>('user')
await remove('user')
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-storage-localstorage @molecule/app-i18n @molecule/app-logger @molecule/app-storage
```

## API

### Interfaces

#### `LocalStorageConfig`

localStorage-specific configuration.

```typescript
interface LocalStorageConfig {
  /**
   * Key prefix for all stored values.
   * Useful for namespacing storage in shared environments.
   */
  prefix?: string

  /**
   * Custom serializer function.
   * @default JSON.stringify
   */
  serialize?: <T>(value: T) => string

  /**
   * Custom deserializer function.
   * @default JSON.parse
   */
  deserialize?: <T>(value: string) => T

  /**
   * Storage instance to use (localStorage or sessionStorage).
   * @default localStorage
   */
  storage?: Storage
}
```

#### `StorageProvider`

Storage provider interface.

All storage providers must implement this interface.

```typescript
interface StorageProvider {
    /**
     * Gets a value from storage.
     */
    get<T = unknown>(key: string): Promise<T | null>;
    /**
     * Sets a value in storage.
     */
    set<T = unknown>(key: string, value: T): Promise<void>;
    /**
     * Removes a value from storage.
     */
    remove(key: string): Promise<void>;
    /**
     * Clears all values from storage.
     */
    clear(): Promise<void>;
    /**
     * Gets all keys in storage.
     */
    keys(): Promise<string[]>;
    /**
     * Gets multiple values from storage.
     */
    getMany?<T = unknown>(keys: string[]): Promise<Map<string, T | null>>;
    /**
     * Sets multiple values in storage.
     */
    setMany?<T = unknown>(entries: Array<[string, T]>): Promise<void>;
    /**
     * Removes multiple values from storage.
     */
    removeMany?(keys: string[]): Promise<void>;
}
```

### Functions

#### `createLocalStorageProvider(config)`

Creates a localStorage-based storage provider that implements the molecule StorageProvider interface.

```typescript
function createLocalStorageProvider(config?: LocalStorageConfig): StorageProvider
```

- `config` — Optional configuration for key prefix, serialization, and storage backend.

**Returns:** A `StorageProvider` backed by `localStorage` with an in-memory fallback for SSR.

#### `createSessionStorageProvider(config)`

Creates a `sessionStorage`-based provider using the same implementation as `createLocalStorageProvider`
but backed by `window.sessionStorage` (data cleared when the browser tab closes).

```typescript
function createSessionStorageProvider(config?: Omit<LocalStorageConfig, "storage">): StorageProvider
```

- `config` — Optional configuration for key prefix and serialization.

**Returns:** A `StorageProvider` backed by `sessionStorage`.

### Constants

#### `provider`

Default `localStorage` provider created with no prefix and JSON serialization.

```typescript
const provider: StorageProvider
```

#### `sessionProvider`

Session storage provider.

```typescript
const sessionProvider: StorageProvider
```

## Core Interface
Implements `@molecule/app-storage` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-storage'
import { provider } from '@molecule/app-storage-localstorage'

export function setupStorageLocalstorage(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-storage` ^1.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-logger`
- `@molecule/app-storage`

- **Unavailable localStorage falls back to in-memory SILENTLY** (SSR, private
  browsing, disabled storage): all operations succeed against a process-local Map,
  so nothing persists and no error reaches the caller. If persistence is critical,
  feature-check before relying on it.
- **Set a `prefix` in real apps.** With no prefix, `clear()` wipes the ENTIRE
  origin's localStorage — including keys owned by other libraries. A prefix scopes
  `clear()` and `keys()` to this app's entries.
- `set()` throws a quota-exceeded error when the origin's storage is full — the one
  storage failure worth catching and surfacing to the user.
- `get()` returns `null` when a stored value fails to deserialize (logged warning) —
  corrupted entries look like missing keys.
- Tab-scoped variant: `createSessionStorageProvider()` / the `sessionProvider`
  const use `sessionStorage` with identical semantics.
