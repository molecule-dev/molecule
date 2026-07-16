# @molecule/api-testing

Testing utilities for molecule.dev API packages.

Provides in-memory mock implementations for five core interfaces —
database (`DatabasePool`), cache, queue, emails, logger — plus generic
async test helpers (`waitFor`, `createDeferred`, `expectThrows`,
`createSpy`, `randomString`/`randomEmail`/`randomUUID`) and
user/device/session fixture factories (`createUserFixture`,
`createDeviceFixture`, `createSessionFixture`, `createMany`).

## Quick Start

```typescript
import { setPool } from '@molecule/api-database'
import { setTransport } from '@molecule/api-emails'
import {
  createMockDatabase,
  createMockEmail,
  createUserFixture,
} from '@molecule/api-testing'

// Fresh mocks per test file, wired exactly like a real bond — the code
// under test needs zero changes.
const db = createMockDatabase()
const email = createMockEmail()
setPool(db)
setTransport(email)

// Queue per-query results (FIFO, one per query), then a persistent fallback.
db.setQueryResultOnce({ rows: [createUserFixture()], rowCount: 1 })
db.setQueryResult({ rows: [], rowCount: 0 })

// ...run the code under test, then assert on what it did:
console.log(db.queries)          // every { text, values } issued
console.log(email.sentMessages)  // every EmailMessage sent

email.failNext(new Error('SMTP down')) // next sendMail() rejects once
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-testing @molecule/api-cache @molecule/api-database @molecule/api-emails @molecule/api-logger @molecule/api-queue
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
function createMockDatabase(): DatabasePool & { queries: Array<{ text: string; values?: unknown[]; }>; setQueryResult: <T>(result: QueryResult<T>) => void; setQueryResultOnce: <T>(result: QueryResult<T>) => void; reset: () => void; }
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

The call is recorded even when the implementation throws (with `result`
left `undefined`), so `callCount` reflects "the spy was invoked", not
"the implementation returned" — callers can tell "called and threw"
apart from "never called".

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

The condition is always checked one final time after the deadline passes, so a
condition that becomes true during the last polling interval still resolves
instead of being falsely reported as timed out.

```typescript
function waitFor(condition: () => boolean | Promise<boolean>, options?: WaitForOptions): Promise<void>
```

- `condition` — A function that returns `true` (or a Promise resolving to `true`) when the condition is met.
- `options` — Timeout and polling interval configuration.

### Constants

#### `mockCache`

Pre-configured mock cache for quick setup. Shared module-level instance —
call `reset()` in `beforeEach` so stored entries don't bleed between tests.

```typescript
const mockCache: CacheProvider & { store: Map<string, { value: unknown; tags?: string[]; }>; reset: () => void; }
```

#### `mockDatabase`

Pre-configured mock database for quick setup. Shared module-level instance —
call `reset()` in `beforeEach` so recorded queries don't bleed between tests.

```typescript
const mockDatabase: DatabasePool & { queries: Array<{ text: string; values?: unknown[]; }>; setQueryResult: <T>(result: QueryResult<T>) => void; setQueryResultOnce: <T>(result: QueryResult<T>) => void; reset: () => void; }
```

#### `mockEmail`

Pre-configured mock email for quick setup. Shared module-level instance —
call `reset()` in `beforeEach` so sent messages don't bleed between tests.

```typescript
const mockEmail: EmailTransport & { sentMessages: EmailMessage[]; reset: () => void; failNext: (error: Error) => void; }
```

#### `mockLogger`

Pre-configured mock logger instance for quick test setup. Shared
module-level instance — call `reset()` in `beforeEach` so captured log
entries don't bleed between tests.

```typescript
const mockLogger: Logger & { logs: LogEntry[]; reset: () => void; getLogsByLevel: (level: LogEntry["level"]) => LogEntry[]; setLevel: (level: string) => void; getLevel: () => string; }
```

#### `mockQueue`

Pre-configured mock queue provider instance for quick test setup. Shared
module-level instance — call `reset()` in `beforeEach` so queued messages
and subscribers don't bleed between tests.

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

### Runtime Dependencies

- `@molecule/api-cache`
- `@molecule/api-database`
- `@molecule/api-emails`
- `@molecule/api-logger`
- `@molecule/api-queue`

- Wire mocks through each core's OWN setter — `setPool`
  (`@molecule/api-database`), `setTransport` (`@molecule/api-emails`),
  `setProvider` (`@molecule/api-cache`, `@molecule/api-queue`), `setLogger`
  (`@molecule/api-logger`). Mocks exist ONLY for those five cores; for any
  other core, mock its bond with your test runner (e.g. `vi.mock`).
- `createMockDatabase().setQueryResult(result)` is **persistent** — every
  subsequent `query()` call (pool, connection, or transaction) returns that
  same result until you call `setQueryResult` again or `reset()`. Despite the
  name's resemblance to vitest's `mockResolvedValueOnce`, it is NOT a
  one-shot queue. A handler test that issues multiple distinct queries and
  needs each to see a different result must use `setQueryResultOnce(result)`
  instead — queued once-results are consumed first, in FIFO order, one per
  query, before queries fall back to the persistent `setQueryResult` value
  (or the empty `{ rows: [], rowCount: 0 }` default).
- The prebuilt `mockDatabase` / `mockCache` / `mockQueue` / `mockEmail` /
  `mockLogger` constants are shared module-level singletons — recorded
  queries, sent messages, and cache entries BLEED between test files that
  import them. Call `reset()` in `beforeEach`, or prefer the
  `createMockX()` factories for per-file isolation.
- Name collisions: `waitFor` also exists as vitest's `vi.waitFor` and in
  @testing-library; `createSpy` overlaps `vi.fn`. Import from ONE source
  per file so the wrong signature isn't picked up silently.
