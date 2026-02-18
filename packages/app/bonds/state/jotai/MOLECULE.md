# @molecule/app-state-jotai

Jotai state provider for molecule.dev.

Provides a Jotai-based implementation of the molecule state interface.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-state-jotai
```

## API

### Interfaces

#### `Atom`

```typescript
interface Atom<Value> {
    toString: () => string;
    read: Read<Value>;
    debugLabel?: string;
    /**
     * To ONLY be used by Jotai libraries to mark atoms as private. Subject to change.
     * @private
     */
    debugPrivate?: boolean;
    /**
     * Fires after atom is referenced by the store for the first time
     * This is an internal API and subject to change without notice.
     */
    INTERNAL_onInit?: (store: Store) => void;
}
```

#### `AtomWithAccessors`

Atom with accessor functions.

```typescript
interface AtomWithAccessors<T> {
  atom: PrimitiveAtom<T>
  get: (store: JotaiStore) => T
  set: (store: JotaiStore, value: T | ((prev: T) => T)) => void
}
```

#### `JotaiStoreConfig`

Extended store config for Jotai-specific options.

```typescript
interface JotaiStoreConfig<T> extends StoreConfig<T> {
  /**
   * External Jotai store to use.
   */
  jotaiStore?: JotaiStore
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

### Types

#### `GetState`

Get state function type.

```typescript
type GetState<T> = () => T;
```

#### `JotaiStore`

Jotai store type.

```typescript
type JotaiStore = ReturnType<typeof createJotaiStore>
```

#### `PrimitiveAtom`

```typescript
type PrimitiveAtom<Value> = WritableAtom<Value, [
    SetStateAction<Value>
], void>;
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

#### `atom(read, write)`

```typescript
function atom(read: Read<Value, SetAtom<Args, unknown>>, write: Write<Args, Result>): WritableAtom<Value, Args, Result>
```

#### `combineAtoms(atoms)`

Combine multiple atoms into a single derived atom whose value is an object
with the resolved values of all input atoms.

```typescript
function combineAtoms(atoms: T): Atom<{ [K in keyof T]: T[K] extends Atom<infer V> ? V : never; }>
```

- `atoms` — A record of named atoms to combine.

**Returns:** A derived atom whose value is an object with the resolved values of all input atoms.

#### `createAsyncAtom(asyncFn)`

Create an async atom whose value is fetched asynchronously.

```typescript
function createAsyncAtom(asyncFn: () => Promise<T>): Atom<Promise<T>>
```

- `asyncFn` — An async function that returns the atom's value.

**Returns:** A Jotai atom whose value is a Promise, resolved when accessed via useAtom or store.get.

#### `createAtom(initialValue)`

Creates a primitive atom with get/set functions.

```typescript
function createAtom(initialValue: T): AtomWithAccessors<T>
```

- `initialValue` — The starting value for the atom.

**Returns:** An `AtomWithAccessors` containing the raw Jotai atom plus `get(store)` and `set(store, value)` helpers.

#### `createAtomFamily(createInitialValue)`

Create an atom family — a factory function that returns cached atoms keyed by parameter.
Each unique parameter value creates a new atom with its own state.

```typescript
function createAtomFamily(createInitialValue: (param: P) => T): (param: P) => AtomWithAccessors<T>
```

- `createInitialValue` — A factory function that creates the initial value for a given parameter.

**Returns:** A parameterized factory function that returns cached AtomWithAccessors instances keyed by parameter.

#### `createDerivedAtom(read)`

Create a read-only derived (computed) atom whose value is derived from other atoms.

```typescript
function createDerivedAtom(read: (get: <V>(atom: Atom<V>) => V) => T): Atom<T>
```

- `read` — A function that receives `get` and derives a value from other atoms.

**Returns:** A read-only Jotai Atom whose value is computed from the read function.

#### `createJotaiStore()`

```typescript
function createJotaiStore(): INTERNAL_Store
```

#### `createJotaiStoreInstance()`

Creates a new Jotai store instance for atom state management.

```typescript
function createJotaiStoreInstance(): INTERNAL_Store
```

**Returns:** A fresh Jotai store that can be used with `store.get()`, `store.set()`, and `store.sub()`.

#### `createPersistentAtom(key, initialValue, storage)`

Creates an atom with localStorage persistence.

```typescript
function createPersistentAtom(key: string, initialValue: T, storage?: Storage): AtomWithAccessors<T>
```

- `key` — The `localStorage` key to persist under.
- `initialValue` — The default value if nothing is stored.
- `storage` — The `Storage` backend to use (defaults to `localStorage`).

**Returns:** An `AtomWithAccessors` that automatically persists to storage on set.

#### `createProvider()`

Creates a Jotai-based `StateProvider` for use with `setProvider()` from `@molecule/app-state`.

```typescript
function createProvider(): StateProvider
```

**Returns:** A `StateProvider` that creates Jotai-backed stores.

#### `createStore(config)`

Creates a Jotai-backed `Store` implementing the molecule state interface. Wraps a Jotai atom
with `getState`, `setState` (with partial merge), `subscribe`, and optional middleware.

```typescript
function createStore(config: JotaiStoreConfig<T>): Store<T>
```

- `config` — Store configuration with initial state, optional middleware, and optional Jotai store instance.

**Returns:** A `Store` with getState/setState/subscribe/destroy methods.

#### `createWritableDerivedAtom(read, write)`

Create a writable derived atom with both computed read and custom write logic.

```typescript
function createWritableDerivedAtom(read: (get: <V>(atom: Atom<V>) => V) => T, write: (get: <V>(atom: Atom<V>) => V, set: <V>(atom: PrimitiveAtom<V>, value: V) => void, ...args: Args) => void): Atom<T> & { write: typeof write; }
```

- `read` — A function that receives `get` and derives a value from other atoms.
- `write` — A function that receives `get`, `set`, and args to update underlying atoms.

**Returns:** A writable derived Jotai atom with both read and write capabilities.

### Constants

#### `defaultStore`

The default shared Jotai store instance used across the application.

```typescript
const defaultStore: INTERNAL_Store
```

#### `provider`

Default Jotai state provider instance.

```typescript
const provider: StateProvider
```

## Core Interface
Implements `@molecule/app-state` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-state` ^1.0.0
