# @molecule/app-storage

Client storage interface for molecule.dev.

Provides a unified storage API that works across web and native platforms.

## Type
`core`

## Installation
```bash
npm install @molecule/app-storage
```

## API

### Interfaces

#### `StorageProvider`

Storage provider interface.

All storage providers must implement this interface.

```typescript
interface StorageProvider {
  /**
   * Gets a value from storage.
   */
  get<T = unknown>(key: string): Promise<T | null>

  /**
   * Sets a value in storage.
   */
  set<T = unknown>(key: string, value: T): Promise<void>

  /**
   * Removes a value from storage.
   */
  remove(key: string): Promise<void>

  /**
   * Clears all values from storage.
   */
  clear(): Promise<void>

  /**
   * Gets all keys in storage.
   */
  keys(): Promise<string[]>

  /**
   * Gets multiple values from storage.
   */
  getMany?<T = unknown>(keys: string[]): Promise<Map<string, T | null>>

  /**
   * Sets multiple values in storage.
   */
  setMany?<T = unknown>(entries: Array<[string, T]>): Promise<void>

  /**
   * Removes multiple values from storage.
   */
  removeMany?(keys: string[]): Promise<void>
}
```

### Functions

#### `clear()`

Clears all values from storage.

```typescript
function clear(): Promise<void>
```

**Returns:** A promise that resolves when storage is cleared.

#### `createMemoryStorageProvider()`

Creates an in-memory StorageProvider backed by a `Map`.

Values are stored by reference (no serialization). Each call returns an
isolated instance with its own backing store.

```typescript
function createMemoryStorageProvider(): StorageProvider
```

**Returns:** An isolated StorageProvider backed by an in-memory Map.

#### `get(key)`

Gets a value from storage by key.

```typescript
function get(key: string): Promise<T | null>
```

- `key` — The storage key to look up.

**Returns:** The stored value, or `null` if not found.

#### `getProvider()`

Retrieves the bonded storage provider, throwing if none is configured.

```typescript
function getProvider(): StorageProvider
```

**Returns:** The bonded storage provider.

#### `hasProvider()`

Checks whether a storage provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a storage provider is bonded.

#### `keys()`

Returns all keys currently stored.

```typescript
function keys(): Promise<string[]>
```

**Returns:** An array of storage keys.

#### `remove(key)`

Removes a value from storage by key.

```typescript
function remove(key: string): Promise<void>
```

- `key` — The storage key to remove.

**Returns:** A promise that resolves when the key is removed.

#### `set(key, value)`

Sets a value in storage.

```typescript
function set(key: string, value: T): Promise<void>
```

- `key` — The storage key.
- `value` — The value to store.

**Returns:** A promise that resolves when the value is stored.

#### `setProvider(provider)`

Registers a storage provider as the active singleton.

```typescript
function setProvider(provider: StorageProvider): void
```

- `provider` — The storage provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| localStorage | `@molecule/app-storage-localstorage` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-storage`.
