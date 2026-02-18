# @molecule/app-state-zustand

Zustand state provider for molecule.dev.

Provides a Zustand-based implementation of the molecule state interface.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-state-zustand
```

## API

### Interfaces

#### `Slice`

A Zustand store slice: a named partition of state with its initial values and action creators.

```typescript
interface Slice<T extends object, A extends object> {
  name: string
  initialState: T
  actions: (set: SetState<T>, get: GetState<T>) => A
}
```

#### `SliceConfig`

Configuration for a Zustand store slice (name, initial state, and action creators).

```typescript
interface SliceConfig<T extends object, A extends object> {
  name: string
  initialState: T
  actions: (set: SetState<T>, get: GetState<T>) => A
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
    createStore<T>(config: StoreConfig<T>): Store<T>;
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
    getState(): T;
    /**
     * Sets the state (partial or via updater function).
     */
    setState(partial: Partial<T> | ((state: T) => Partial<T>)): void;
    /**
     * Subscribes to state changes.
     * Returns an unsubscribe function.
     */
    subscribe(listener: StateListener<T>): () => void;
    /**
     * Destroys the store and cleans up subscriptions.
     */
    destroy(): void;
}
```

#### `StoreConfig`

Configuration for creating a store (initial state, optional name, and middleware chain).

```typescript
interface StoreConfig<T> {
    /**
     * Initial state value.
     */
    initialState: T;
    /**
     * Optional name for debugging.
     */
    name?: string;
    /**
     * Optional middleware functions.
     */
    middleware?: StoreMiddleware<T>[];
}
```

#### `StoreWithActionsConfig`

Store with actions configuration.

```typescript
interface StoreWithActionsConfig<T extends object, A extends object> {
  initialState: T
  actions: (set: SetState<T>, get: GetState<T>) => A
  name?: string
  middleware?: StoreMiddleware<T>[]
  devtools?: boolean
  persist?: ZustandStoreConfig<T>['persist']
}
```

#### `ZustandStoreConfig`

Extended store config for Zustand-specific options.

```typescript
interface ZustandStoreConfig<T> extends StoreConfig<T> {
  /**
   * Enable devtools integration.
   */
  devtools?: boolean

  /**
   * Persist options.
   */
  persist?: {
    /**
     * Storage key.
     */
    name: string

    /**
     * Storage to use (defaults to localStorage).
     */
    storage?: Storage

    /**
     * Partialize the state to persist.
     */
    partialize?: (state: T) => Partial<T>
  }
}
```

### Types

#### `GetState`

Get state function type.

```typescript
type GetState<T> = () => T;
```

#### `SetState`

Function to update store state with a partial object or updater function.

```typescript
type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
```

#### `StateListener`

Callback invoked whenever store state changes.

```typescript
type StateListener<T> = (state: T, prevState: T) => void;
```

#### `StoreMiddleware`

Store middleware function. Wraps the `set` function to intercept
state updates (e.g. for logging, persistence, or devtools).

```typescript
type StoreMiddleware<T> = (set: SetState<T>, get: GetState<T>) => SetState<T>;
```

### Functions

#### `combineSlices(slices)`

Combines multiple slices into a single Zustand store. Each slice's state is nested under
its `name` key, and each slice's actions are exposed as top-level methods on the store.

```typescript
function combineSlices(slices: S): Store<Record<string, unknown>>
```

- `slices` — Array of slices created by `createSlice`.

**Returns:** A molecule `Store` with combined state and all slice actions merged onto it.

#### `createProvider()`

Creates a Zustand state provider for use with `setProvider()` from `@molecule/app-state`.

```typescript
function createProvider(): StateProvider
```

**Returns:** A `StateProvider` that creates Zustand-backed stores.

#### `createSelector(selector, equalityFn)`

Creates a memoized selector that only recomputes when the selected value changes
(determined by the equality function, defaulting to `Object.is`).

```typescript
function createSelector(selector: (state: T) => R, equalityFn?: (a: R, b: R) => boolean): (state: T) => R
```

- `selector` — Function that extracts a derived value from state.
- `equalityFn` — Equality comparator for the derived value; defaults to `Object.is`.

**Returns:** A memoized selector function that returns the cached result when the derived value is equal.

#### `createSlice(config)`

Creates a named slice of state for use with `combineSlices`. A slice defines a `name`,
`initialState`, and an `actions` factory that receives scoped `set`/`get` functions.

```typescript
function createSlice(config: SliceConfig<T, A>): Slice<T, A>
```

- `config` — Slice configuration with `name`, `initialState`, and `actions` factory.

**Returns:** A `Slice` object (the config itself, used as a descriptor by `combineSlices`).

#### `createStore(config)`

Creates a Zustand-backed store that conforms to the molecule `Store` interface.
Uses `zustand/vanilla` with `subscribeWithSelector` middleware. Supports molecule middleware,
and optional persistence to `localStorage` (or a custom storage backend).

```typescript
function createStore(config: ZustandStoreConfig<T>): Store<T>
```

- `config` — Store configuration including `initialState`, optional molecule `middleware`, and optional `persist` config with `name`, `storage`, and `partialize`.

**Returns:** A molecule `Store` with `getState`, `setState`, `subscribe`, and `destroy`.

#### `createStoreWithActions(config)`

Creates a store with actions (Zustand pattern).

```typescript
function createStoreWithActions(config: StoreWithActionsConfig<T, A>): Store<T> & A
```

- `config` — Configuration with `initialState` and an `actions` factory `(set, get) => actionMap`.

**Returns:** A molecule `Store` merged with the action functions, so actions can be called directly on the store.

### Constants

#### `provider`

Default Zustand state provider instance.

```typescript
const provider: StateProvider
```

## Core Interface
Implements `@molecule/app-state` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-state` ^1.0.0
