# @molecule/app-state-redux

Redux state provider for molecule.dev.

Provides a Redux Toolkit-based implementation of the molecule state interface.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-state-redux
```

## API

### Interfaces

#### `ConfigureStoreOptions`

Options for `configureStore()`.

```typescript
interface ConfigureStoreOptions<S = any, A extends Action = UnknownAction, M extends Tuple<Middlewares<S>> = Tuple<Middlewares<S>>, E extends Tuple<Enhancers> = Tuple<Enhancers>, P = S> {
    /**
     * A single reducer function that will be used as the root reducer, or an
     * object of slice reducers that will be passed to `combineReducers()`.
     */
    reducer: Reducer<S, A, P> | ReducersMapObject<S, A, P>;
    /**
     * An array of Redux middleware to install, or a callback receiving `getDefaultMiddleware` and returning a Tuple of middleware.
     * If not supplied, defaults to the set of middleware returned by `getDefaultMiddleware()`.
     *
     * @example `middleware: (gDM) => gDM().concat(logger, apiMiddleware, yourCustomMiddleware)`
     * @see https://redux-toolkit.js.org/api/getDefaultMiddleware#intended-usage
     */
    middleware?: (getDefaultMiddleware: GetDefaultMiddleware<S>) => M;
    /**
     * Whether to enable Redux DevTools integration. Defaults to `true`.
     *
     * Additional configuration can be done by passing Redux DevTools options
     */
    devTools?: boolean | DevToolsEnhancerOptions;
    /**
     * Whether to check for duplicate middleware instances. Defaults to `true`.
     */
    duplicateMiddlewareCheck?: boolean;
    /**
     * The initial state, same as Redux's createStore.
     * You may optionally specify it to hydrate the state
     * from the server in universal apps, or to restore a previously serialized
     * user session. If you use `combineReducers()` to produce the root reducer
     * function (either directly or indirectly by passing an object as `reducer`),
     * this must be an object with the same shape as the reducer map keys.
     */
    preloadedState?: P;
    /**
     * The store enhancers to apply. See Redux's `createStore()`.
     * All enhancers will be included before the DevTools Extension enhancer.
     * If you need to customize the order of enhancers, supply a callback
     * function that will receive a `getDefaultEnhancers` function that returns a Tuple,
     * and should return a Tuple of enhancers (such as `getDefaultEnhancers().concat(offline)`).
     * If you only need to add middleware, you can use the `middleware` parameter instead.
     */
    enhancers?: (getDefaultEnhancers: GetDefaultEnhancers<M>) => E;
}
```

#### `ReduxStoreConfig`

Extended store config for Redux-specific options.

```typescript
interface ReduxStoreConfig<T> extends StoreConfig<T> {
  /**
   * Enable Redux DevTools.
   */
  devTools?: boolean

  /**
   * Additional Redux middleware.
   */
  reduxMiddleware?: ConfigureStoreOptions['middleware']

  /**
   * Preloaded state (overrides initialState if provided).
   */
  preloadedState?: T
}
```

#### `ReduxStoreWithSlicesConfig`

Redux store with slices configuration.

```typescript
interface ReduxStoreWithSlicesConfig {
  slices: Array<{ name: string; reducer: (state: unknown, action: unknown) => unknown }>
  devTools?: boolean
  middleware?: ConfigureStoreOptions['middleware']
  preloadedState?: Record<string, unknown>
}
```

#### `Slice`

Slice type with actions.

```typescript
interface Slice<
  T extends object,
  Reducers extends Record<string, (state: T, action: PayloadAction<unknown>) => T | void>,
> {
  name: string
  initialState: T
  reducer: (state: T | undefined, action: { type: string; payload?: unknown }) => T
  actions: {
    [K in keyof Reducers]: Reducers[K] extends (state: T, action: PayloadAction<infer P>) => unknown
      ? (payload: P) => PayloadAction<P>
      : () => PayloadAction<void>
  }
}
```

#### `SliceConfig`

Redux slice configuration.

```typescript
interface SliceConfig<
  T extends object,
  Reducers extends Record<string, (state: T, action: PayloadAction<unknown>) => T | void>,
> {
  name: string
  initialState: T
  reducers: Reducers
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

#### `ThunkAPI`

Thunk API interface for async actions.

```typescript
interface ThunkAPI<T> {
  dispatch: (action: { type: string; payload?: unknown }) => void
  getState: () => T
  signal: AbortSignal
}
```

### Types

#### `EnhancedStore`

A Redux store returned by `configureStore()`. Supports dispatching
side-effectful _thunks_ in addition to plain actions.

```typescript
type EnhancedStore<S = any, A extends Action = UnknownAction, E extends Enhancers = Enhancers> = ExtractStoreExtensions<E> & Store<S, A, UnknownIfNonSpecific<ExtractStateExtensions<E>>>;
```

#### `GetState`

Get state function type.

```typescript
type GetState<T> = () => T;
```

#### `PayloadAction`

An action with a string type and an associated payload. This is the
type of action returned by `createAction()` action creators.

```typescript
type PayloadAction<P = void, T extends string = string, M = never, E = never> = {
    payload: P;
    type: T;
} & ([M] extends [never] ? {} : {
    meta: M;
}) & ([E] extends [never] ? {} : {
    error: E;
});
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

#### `createAsyncAction(typePrefix, payloadCreator)`

Create an async thunk action creator with automatic pending/fulfilled/rejected lifecycle.

```typescript
function createAsyncAction(typePrefix: string, payloadCreator: (arg: Arg, thunkAPI: ThunkAPI<unknown>) => Promise<Result>): ((arg: Arg) => (dispatch: (action: unknown) => void, getState: () => unknown) => Promise<Result>) & { pending: string; fulfilled: string; rejected: string; }
```

- `typePrefix` — The action type prefix (e.g., 'user/fetch'). Generates pending, fulfilled, and rejected subtypes.
- `payloadCreator` — Async function receiving the argument and thunk API, returning the result.

**Returns:** A thunk action creator with `.pending`, `.fulfilled`, and `.rejected` string properties for use in reducers.

#### `createProvider()`

Creates a Redux state provider for use with `setProvider()` from `@molecule/app-state`.

```typescript
function createProvider(): StateProvider
```

**Returns:** A `StateProvider` that creates Redux Toolkit-backed stores.

#### `createReduxStore(config)`

Create a configured Redux store that combines multiple slices into one store.

```typescript
function createReduxStore(config: ReduxStoreWithSlicesConfig): Store<any, UnknownAction, unknown>
```

- `config` — Store configuration with slices, devTools flag, optional middleware, and preloaded state.

**Returns:** A configured Redux EnhancedStore with combined reducers from all provided slices.

#### `createSelector(args)`

Selector helper with memoization.

```typescript
function createSelector(args?: [...selectors: ((state: T) => unknown)[], resultFn: (...args: Args) => R]): (state: T) => R
```

- `args` — Input selectors followed by a result function. The result function receives the output of each input selector.

**Returns:** A memoized selector that only recomputes when its input selector results change (shallow equality).

#### `createSlice(config)`

Creates a Redux slice (for modular stores).

```typescript
function createSlice(config: SliceConfig<T, Reducers>): Slice<T, Reducers>
```

- `config` — The configuration.

**Returns:** A `Slice` with `name`, `reducer`, `actions`, and `initialState`.

#### `createStore(config)`

Creates a Redux Toolkit-backed store that conforms to the molecule `Store` interface.
Uses `createSlice` and `configureStore` internally, with support for molecule middleware,
Redux DevTools, and preloaded state.

```typescript
function createStore(config: ReduxStoreConfig<T>): Store<T>
```

- `config` — Store configuration including `initialState`, optional `name`, `devTools` flag, molecule `middleware`, Redux `reduxMiddleware`, and `preloadedState`.

**Returns:** A molecule `Store` with `getState`, `setState`, `subscribe`, and `destroy`.

### Constants

#### `provider`

Default Redux state provider instance.

```typescript
const provider: StateProvider
```

## Core Interface
Implements `@molecule/app-state` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-state` ^1.0.0
