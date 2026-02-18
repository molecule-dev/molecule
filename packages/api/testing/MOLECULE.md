# @molecule/api-testing

Testing utilities for molecule.dev API packages.

Provides mock implementations and test helpers for all core interfaces.

## Type
`utility`

## Installation
```bash
npm install @molecule/api-testing
```

## API

### Interfaces

#### `Deferred`

Deferred promise structure.

```typescript
interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}
```

#### `DeviceFixture`

Device fixture properties.

```typescript
interface DeviceFixture {
  id: string
  userId: string
  platform: string
  createdAt: string
  updatedAt: string
}
```

#### `DeviceFixtureOverrides`

Device fixture override options.

```typescript
interface DeviceFixtureOverrides {
  id?: string
  userId?: string
  platform?: string
  createdAt?: string
  updatedAt?: string
}
```

#### `LogEntry`

Log entry captured by the mock logger.

```typescript
interface LogEntry {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  message: string
  args: unknown[]
  timestamp: Date
}
```

#### `SessionFixture`

Session fixture properties.

```typescript
interface SessionFixture {
  userId: string
  deviceId: string
  token: string
  expiresAt: string
}
```

#### `SessionFixtureOverrides`

Session fixture override options.

```typescript
interface SessionFixtureOverrides {
  userId?: string
  deviceId?: string
  token?: string
  expiresAt?: string
}
```

#### `Spy`

Spy function with call tracking, count, and reset capabilities.

```typescript
interface Spy<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>
  calls: Array<SpyCall<Parameters<T>, ReturnType<T>>>
  callCount: number
  reset: () => void
}
```

#### `SpyCall`

Spy call record.

```typescript
interface SpyCall<TArgs extends unknown[], TResult> {
  args: TArgs
  result: TResult
}
```

#### `UserFixture`

User fixture properties.

```typescript
interface UserFixture {
  id: string
  username: string
  email: string | null
  name: string | null
  createdAt: string
  updatedAt: string
}
```

#### `UserFixtureOverrides`

User fixture override options.

```typescript
interface UserFixtureOverrides {
  id?: string
  username?: string
  email?: string
  name?: string
  createdAt?: string
  updatedAt?: string
}
```

#### `WaitForOptions`

Options for waitFor utility.

```typescript
interface WaitForOptions {
  timeout?: number
  interval?: number
}
```

### Functions

#### `createDeferred()`

Creates a deferred promise that can be resolved or rejected externally.

```typescript
function createDeferred(): Deferred<T>
```

**Returns:** An object with `promise`, `resolve`, and `reject` properties.

#### `createDeviceFixture(overrides)`

Creates a device fixture with random defaults, optionally overridden.

```typescript
function createDeviceFixture(overrides?: Partial<DeviceFixtureOverrides>): DeviceFixture
```

- `overrides` — Partial overrides for device properties (id, userId, platform, timestamps).

**Returns:** A complete DeviceFixture object.

#### `createMany(factory, count)`

Creates an array of fixtures by calling a factory function `count` times.

```typescript
function createMany(factory: (index: number) => T, count: number): T[]
```

- `factory` — A function that receives the index and returns a fixture.
- `count` — Number of fixtures to create.

**Returns:** An array of `count` fixture objects.

#### `createMockCache()`

Creates a mock cache provider for testing.

```typescript
function createMockCache(): CacheProvider & { store: Map<string, { value: unknown; tags?: string[]; }>; reset: () => void; }
```

**Returns:** The created instance.

#### `createMockDatabase()`

Creates a mock database pool for testing.

```typescript
function createMockDatabase(): DatabasePool & { queries: Array<{ text: string; values?: unknown[]; }>; setQueryResult: <T>(result: QueryResult<T>) => void; reset: () => void; }
```

**Returns:** The created instance.

#### `createMockEmail()`

Creates a mock email transport for testing.

```typescript
function createMockEmail(): EmailTransport & { sentMessages: EmailMessage[]; reset: () => void; failNext: (error: Error) => void; }
```

**Returns:** The created instance.

#### `createMockLogger()`

Creates a mock Logger that captures all log entries for assertions.

```typescript
function createMockLogger(): Logger & { logs: LogEntry[]; reset: () => void; getLogsByLevel: (level: LogEntry["level"]) => LogEntry[]; setLevel: (level: string) => void; getLevel: () => string; }
```

**Returns:** A Logger with exposed `logs` array, `reset()`, and `getLogsByLevel()` for test inspection.

#### `createMockQueue()`

Creates a mock QueueProvider for testing, with lazily-created in-memory queues and a `reset()` method.

```typescript
function createMockQueue(): QueueProvider & { queues: Map<string, ReturnType<typeof createMockQueueInstance>>; reset: () => void; }
```

**Returns:** A QueueProvider with exposed `queues` map and `reset()` for test cleanup.

#### `createSessionFixture(overrides)`

Creates a session fixture with random defaults and a 7-day expiry, optionally overridden.

```typescript
function createSessionFixture(overrides?: Partial<SessionFixtureOverrides>): SessionFixture
```

- `overrides` — Partial overrides for session properties (userId, deviceId, token, expiresAt).

**Returns:** A complete SessionFixture object.

#### `createSpy(implementation)`

Creates a spy function that records all calls with arguments and return values.

```typescript
function createSpy(implementation?: T): Spy<T>
```

- `implementation` — Optional real implementation to delegate to.

**Returns:** A spy function with `calls`, `callCount`, and `reset()` properties.

#### `createUserFixture(overrides)`

Creates a user fixture with random defaults, optionally overridden.

```typescript
function createUserFixture(overrides?: Partial<UserFixtureOverrides>): UserFixture
```

- `overrides` — Partial overrides for user properties (id, username, email, name, timestamps).

**Returns:** A complete UserFixture object.

#### `expectThrows(fn, errorType)`

Runs a function and asserts it throws. Optionally checks the error type.

```typescript
function expectThrows(fn: () => Promise<unknown> | unknown, errorType?: (new (...args: unknown[]) => T)): Promise<T>
```

- `fn` — The function expected to throw (sync or async).
- `errorType` — Optional error constructor to assert against.

**Returns:** The caught error instance.

#### `randomEmail()`

Generates a random email address at `test.molecule.dev`.

```typescript
function randomEmail(): string
```

**Returns:** A random email string.

#### `randomString(length)`

Generates a random alphanumeric string.

```typescript
function randomString(length?: number): string
```

- `length` — Character count (default 10).

**Returns:** A random string of the specified length.

#### `randomUUID()`

Generates a random UUID v4 via `crypto.randomUUID()`.

```typescript
function randomUUID(): string
```

**Returns:** A random UUID string.

#### `wait(ms)`

Waits for a specified number of milliseconds.

```typescript
function wait(ms: number): Promise<void>
```

- `ms` — Milliseconds to wait.

**Returns:** A promise that resolves after the delay.

#### `waitFor(condition, options)`

Polls a condition function until it returns true, or throws after the timeout.

```typescript
function waitFor(condition: () => boolean | Promise<boolean>, options?: WaitForOptions): Promise<void>
```

- `condition` — A function that returns `true` (or a Promise resolving to `true`) when the condition is met.
- `options` — Timeout and polling interval configuration.

### Constants

#### `mockCache`

Pre-configured mock cache for quick setup.

```typescript
const mockCache: CacheProvider & { store: Map<string, { value: unknown; tags?: string[]; }>; reset: () => void; }
```

#### `mockDatabase`

Pre-configured mock database for quick setup.

```typescript
const mockDatabase: DatabasePool & { queries: Array<{ text: string; values?: unknown[]; }>; setQueryResult: <T>(result: QueryResult<T>) => void; reset: () => void; }
```

#### `mockEmail`

Pre-configured mock email for quick setup.

```typescript
const mockEmail: EmailTransport & { sentMessages: EmailMessage[]; reset: () => void; failNext: (error: Error) => void; }
```

#### `mockLogger`

Pre-configured mock logger instance for quick test setup.

```typescript
const mockLogger: Logger & { logs: LogEntry[]; reset: () => void; getLogsByLevel: (level: LogEntry["level"]) => LogEntry[]; setLevel: (level: string) => void; getLevel: () => string; }
```

#### `mockQueue`

Pre-configured mock queue provider instance for quick test setup.

```typescript
const mockQueue: QueueProvider & { queues: Map<string, ReturnType<typeof createMockQueueInstance>>; reset: () => void; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-cache` ^1.0.0
- `@molecule/api-queue` ^1.0.0
- `@molecule/api-emails` ^1.0.0
- `@molecule/api-logger` ^1.0.0
