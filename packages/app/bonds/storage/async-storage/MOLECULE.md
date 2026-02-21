# @molecule/app-storage-async-storage

AsyncStorage provider for `@molecule/app-storage`.

This package provides a React Native AsyncStorage-based implementation of the molecule StorageProvider
interface, with support for key prefixing and custom serialization.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-storage-async-storage
```

## Usage

```ts
import { createAsyncStorageProvider } from '@molecule/app-storage-async-storage'
import { setProvider } from '@molecule/app-storage'

const storage = createAsyncStorageProvider({
  prefix: 'myapp_',
})

setProvider(storage)

// Use via `@molecule/app-storage`
import { get, set, remove } from '@molecule/app-storage'

await set('user', { name: 'John' })
const user = await get<User>('user')
await remove('user')
```

## API

### Interfaces

#### `AsyncStorageConfig`

AsyncStorage-specific configuration.

```typescript
interface AsyncStorageConfig {
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

#### `createAsyncStorageProvider(config)`

Creates an AsyncStorage-based storage provider that implements the molecule StorageProvider interface.

Uses React Native's `@react-native-async-storage/async-storage` as the underlying storage engine.
Supports key prefixing and custom serialization/deserialization.

```typescript
function createAsyncStorageProvider(config?: AsyncStorageConfig): StorageProvider
```

- `config` — Optional configuration for key prefix and serialization.

**Returns:** A `StorageProvider` backed by React Native AsyncStorage.

### Constants

#### `provider`

Default AsyncStorage provider created with no prefix and JSON serialization.

```typescript
const provider: StorageProvider
```

## Core Interface
Implements `@molecule/app-storage` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-storage` ^1.0.0
- `@react-native-async-storage/async-storage` ^2.0.0
