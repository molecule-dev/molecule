# @molecule/app-state

Client state management interface for molecule.dev.

Provides a unified state management API that works across different
state management solutions (hooks, Zustand, Redux, Jotai, etc.).

## Type
`core`

## Installation
```bash
npm install @molecule/app-state
```

## API

### Interfaces

#### `AsyncState`

Async state tuple.

```typescript
interface AsyncState<T> {
  /**
   * Current data value.
   */
  data: T

  /**
   * Whether the state is loading.
   */
  loading: boolean

  /**
   * Error if any occurred.
   */
  error: Error | null
}
```

#### `AsyncStateActions`

Async state actions.

```typescript
interface AsyncStateActions<T> {
  /**
   * Sets the data value.
   */
  setData(data: T): void

  /**
   * Sets the loading state.
   */
  setLoading(loading: boolean): void

  /**
   * Sets an error.
   */
  setError(error: Error | null): void

  /**
   * Resets to initial state.
   */
  reset(): void

  /**
   * Executes an async operation, handling loading/error states.
   */
  execute<R>(fn: () => Promise<R>): Promise<R>
}
```

#### `PersistStorage`

Simple storage adapter interface for persist middleware.
Compatible with `localStorage`, `sessionStorage`, and
`@molecule/app-storage` providers.

```typescript
interface PersistStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
```

#### `StateProvider`

State provider interface that all state management bond packages
must implement. Provides the store creation factory.

```typescript
interface StateProvider {
  /**
   * Creates a new store.
   */
  createStore<T>(config: StoreConfig<T>): Store<T>
}
```

#### `Store`

Reactive state container with getState, setState, subscribe, and destroy.

All state management providers must implement this interface.

```typescript
interface Store<T> {
  /**
   * Gets the current state.
   */
  getState(): T

  /**
   * Sets the state (partial or via updater function).
   */
  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void

  /**
   * Subscribes to state changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: StateListener<T>): () => void

  /**
   * Destroys the store and cleans up subscriptions.
   */
  destroy(): void
}
```

#### `StoreConfig`

Configuration for creating a store (initial state, optional name, and middleware chain).

```typescript
interface StoreConfig<T> {
  /**
   * Initial state value.
   */
  initialState: T

  /**
   * Optional name for debugging.
   */
  name?: string

  /**
   * Optional middleware functions.
   */
  middleware?: StoreMiddleware<T>[]
}
```

### Types

#### `EqualityFn`

Equality comparator for selectors. When provided, prevents
re-renders if the selected value is equal to the previous one.

```typescript
type EqualityFn<T> = (a: T, b: T) => boolean
```

#### `GetState`

Get state function type.

```typescript
type GetState<T> = () => T
```

#### `Selector`

Selector function that derives a value from store state.

```typescript
type Selector<T, S> = (state: T) => S
```

#### `SetState`

Function to update store state with a partial object or updater function.

```typescript
type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void
```

#### `StateListener`

Callback invoked whenever store state changes.

```typescript
type StateListener<T> = (state: T, prevState: T) => void
```

#### `StoreMiddleware`

Store middleware function. Wraps the `set` function to intercept
state updates (e.g. for logging, persistence, or devtools).

```typescript
type StoreMiddleware<T> = (set: SetState<T>, get: GetState<T>) => SetState<T>
```

### Functions

#### `combineStores(stores)`

Combines multiple stores into a single composite store. Each key
in `stores` becomes a top-level key in the combined state.

```typescript
function combineStores(stores: { [K in keyof T]: Store<T[K]>; }): Store<T>
```

- `stores` — A record mapping keys to individual stores.

**Returns:** A composite `Store` that delegates to the individual stores.

#### `createAsyncState(initialData)`

Creates an async state container with loading/error tracking.

```typescript
function createAsyncState(initialData: T): [AsyncState<T>, AsyncStateActions<T>]
```

- `initialData` — The initial data value.

**Returns:** A tuple of `[state, actions]` for reading and updating the async state.

#### `createSimpleStateProvider()`

Creates a vanilla JavaScript state provider that manages stores
with simple object spreading and listener-based subscriptions.

```typescript
function createSimpleStateProvider(): StateProvider
```

**Returns:** A `StateProvider` implementation.

#### `createStore(config)`

Creates a new reactive state store using the bonded provider.

```typescript
function createStore(config: StoreConfig<T>): Store<T>
```

- `config` — Store configuration including initial state, actions, selectors, and middleware.

**Returns:** A reactive store instance with `getState()`, `setState()`, and `subscribe()` methods.

#### `getProvider()`

Retrieves the bonded state provider, throwing if none is configured.

```typescript
function getProvider(): StateProvider
```

**Returns:** The bonded state provider.

#### `hasProvider()`

Checks whether a state provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a state provider is bonded.

#### `loggerMiddleware(name)`

Logging middleware — logs previous and next state on every update.

```typescript
function loggerMiddleware(name?: string): StoreMiddleware<T>
```

- `name` — Optional store name for log prefix (defaults to `'store'`).

**Returns:** A store middleware that logs state transitions.

#### `persistMiddleware(key, storage)`

Persist middleware — saves state to storage on every update and
restores it on initialization.

Accepts any object implementing `PersistStorage` (`getItem` + `setItem`).
Defaults to in-memory storage.

```typescript
function persistMiddleware(key: string, storage?: PersistStorage): StoreMiddleware<T>
```

- `key` — The storage key to persist state under.
- `storage` — A `PersistStorage`-compatible object (defaults to in-memory).

**Returns:** A store middleware that persists state to the given storage.

#### `produce(state, recipe)`

Simplified produce helper for immutable state updates.
Creates a shallow copy, applies the recipe, and returns the result.

```typescript
function produce(state: T, recipe: (draft: T) => void): T
```

- `state` — The current state object.
- `recipe` — A function that mutates the draft copy.

**Returns:** A new state object with the recipe's mutations applied.

#### `setProvider(provider)`

Registers a state provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: StateProvider): void
```

- `provider` — The state provider implementation to bond.

#### `shallowEqual(a, b)`

Performs a shallow equality comparison between two values.
Returns `true` if both values have the same top-level keys
with identical values (using `Object.is`).

```typescript
function shallowEqual(a: T, b: T): boolean
```

- `a` — First value to compare.
- `b` — Second value to compare.

**Returns:** `true` if the values are shallowly equal.

### Constants

#### `simpleProvider`

Pre-created default state provider instance.

```typescript
const simpleProvider: StateProvider
```

## Available Providers

| Provider | Package |
|----------|---------|
| Jotai | `@molecule/app-state-jotai` |
| Redux | `@molecule/app-state-redux` |
| Zustand | `@molecule/app-state-zustand` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-logger` ^1.0.0
