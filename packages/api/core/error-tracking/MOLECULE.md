# @molecule/api-error-tracking

Error tracking core interface for molecule.dev.

Defines the standard interface for error tracking / crash reporting
providers (Sentry, console, etc.) plus never-throwing convenience
functions (`captureException`, `captureMessage`, `setUser`, `flush`)
that delegate to the bonded provider.

This is distinct from `@molecule/api-monitoring`, which is health checks
(is the database up?). Error tracking captures individual unexpected
exceptions with context so they can be aggregated and triaged.

## Quick Start

```typescript
import { setProvider, captureException, captureMessage } from '@molecule/api-error-tracking'
import { provider } from '@molecule/api-error-tracking-sentry'

// Bond a provider at startup (skip this and every capture is a no-op)
setProvider(provider)

// Report an unexpected exception with normalized context
try {
  await chargeCustomer(order)
} catch (error) {
  captureException(error, {
    tags: { source: 'billing' },
    user: { id: order.userId },
    extra: { orderId: order.id },
  })
  throw error
}

// Report a standalone message
captureMessage('Payment retry queue is backing up', 'warning')
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-error-tracking
```

## API

### Interfaces

#### `ErrorTrackingContext`

Normalized context attached to a captured exception or message.

```typescript
interface ErrorTrackingContext {
  /** Short, indexable key/value pairs (e.g. `{ source: 'express' }`). */
  tags?: Record<string, string | number | boolean>

  /** The user the event occurred for. */
  user?: ErrorTrackingUser

  /** Arbitrary additional (non-indexed) structured data. */
  extra?: Record<string, unknown>

  /** The request the event occurred in. */
  request?: ErrorTrackingRequestContext
}
```

#### `ErrorTrackingProvider`

Error tracking provider interface.

All error tracking providers must implement this interface. Providers
receive the normalized {@link ErrorTrackingContext} and map it to their
own event model (tags/user/extra scopes, etc.).

```typescript
interface ErrorTrackingProvider {
  /**
   * Reports an exception (or any thrown value) to the tracking backend.
   *
   * @param error - The thrown value to report.
   * @param context - Optional normalized context (tags/user/extra/request).
   * @returns The backend's event id when available, otherwise `undefined`.
   */
  captureException(error: unknown, context?: ErrorTrackingContext): string | void

  /**
   * Reports a standalone message (no exception object) to the tracking backend.
   *
   * @param message - The message to report.
   * @param level - Severity level (providers default to `'info'` when omitted).
   * @param context - Optional normalized context (tags/user/extra/request).
   * @returns The backend's event id when available, otherwise `undefined`.
   */
  captureMessage(
    message: string,
    level?: ErrorTrackingLevel,
    context?: ErrorTrackingContext,
  ): string | void

  /**
   * Optionally associates subsequent captures with a user (`null` clears it).
   * Providers whose backend has no user scoping may leave this undefined.
   *
   * @param user - The user to associate, or `null` to clear.
   */
  setUser?(user: ErrorTrackingUser | null): void

  /**
   * Optionally flushes buffered events to the backend — call before process
   * exit so queued reports aren't lost. Providers that deliver synchronously
   * may leave this undefined.
   *
   * @param timeoutMs - Maximum time to wait for delivery.
   * @returns `true` when everything flushed within the timeout.
   */
  flush?(timeoutMs?: number): Promise<boolean>
}
```

#### `ErrorTrackingRequestContext`

Normalized, provider-agnostic description of the HTTP request (or
request-like operation) an event occurred in.

```typescript
interface ErrorTrackingRequestContext {
  /** HTTP method (e.g. `GET`). */
  method?: string

  /** Request URL or path, including the query string (e.g. `/api/users/123?full=true`). */
  url?: string

  /**
   * Selected request headers. Callers must NOT include credential-bearing
   * headers (`cookie`, `authorization`) — error trackers are third-party
   * sinks and must never receive session material.
   */
  headers?: Record<string, string | string[] | undefined>

  /** Parsed query parameters. */
  query?: Record<string, unknown>
}
```

#### `ErrorTrackingUser`

Normalized description of the user an event occurred for.

```typescript
interface ErrorTrackingUser {
  /** Application-level user id. */
  id?: string

  /** The user's email address. */
  email?: string

  /** The user's username / display handle. */
  username?: string

  /** The user's IP address. */
  ipAddress?: string
}
```

### Types

#### `ErrorTrackingLevel`

Severity level for a captured message or exception.

```typescript
type ErrorTrackingLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug'
```

### Functions

#### `captureException(error, context)`

Reports an exception (or any thrown value) to the bonded error tracking
provider. Silent no-op when no provider is bonded; never throws.

```typescript
function captureException(error: unknown, context?: ErrorTrackingContext): string | undefined
```

- `error` — The thrown value to report.
- `context` — Optional normalized context (tags/user/extra/request).

**Returns:** The backend's event id when available, otherwise `undefined`.

#### `captureMessage(message, level, context)`

Reports a standalone message to the bonded error tracking provider.
Silent no-op when no provider is bonded; never throws.

```typescript
function captureMessage(message: string, level?: ErrorTrackingLevel, context?: ErrorTrackingContext): string | undefined
```

- `message` — The message to report.
- `level` — Severity level (providers default to `'info'` when omitted).
- `context` — Optional normalized context (tags/user/extra/request).

**Returns:** The backend's event id when available, otherwise `undefined`.

#### `flush(timeoutMs)`

Flushes buffered events to the backend — call before process exit so
queued reports aren't lost. Resolves `true` when no provider is bonded or
the provider delivers synchronously (nothing to flush); never rejects.

```typescript
function flush(timeoutMs?: number): Promise<boolean>
```

- `timeoutMs` — Maximum time to wait for delivery.

**Returns:** `true` when everything flushed within the timeout.

#### `getOptionalProvider()`

Retrieves the bonded error tracking provider, returning `null` if none is
bonded. Prefer this over `getProvider()` in optional reporting code paths.

```typescript
function getOptionalProvider(): ErrorTrackingProvider | null
```

**Returns:** The bonded error tracking provider, or `null`.

#### `getProvider()`

Retrieves the bonded error tracking provider, throwing if none is
configured. Application code should normally use the never-throwing
convenience functions (`captureException`/`captureMessage`) or
`getOptionalProvider()` instead.

```typescript
function getProvider(): ErrorTrackingProvider
```

**Returns:** The bonded error tracking provider.

#### `hasProvider()`

Checks whether an error tracking provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an error tracking provider is bonded.

#### `setProvider(provider)`

Registers an error tracking provider as the active singleton. Called by
bond packages during application startup.

```typescript
function setProvider(provider: ErrorTrackingProvider): void
```

- `provider` — The error tracking provider implementation to bond.

#### `setUser(user)`

Associates subsequent captures with a user (`null` clears it). Silent
no-op when no provider is bonded or the provider has no user scoping;
never throws.

```typescript
function setUser(user: ErrorTrackingUser | null): void
```

- `user` — The user to associate, or `null` to clear.

## Available Providers

| Provider | Package |
|----------|---------|
| Console | `@molecule/api-error-tracking-console` |
| Sentry | `@molecule/api-error-tracking-sentry` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

- **The convenience functions NEVER throw and no-op when unbonded.** Error
  tracking is a diagnostic side-channel: an app without a bonded tracker
  (or with a broken one) must behave exactly as if the calls weren't
  there. Do NOT wrap `captureException` in defensive try/catch — it is
  already safe to call anywhere, including inside error middleware.
- The default Express error path (`@molecule/api-server-default-express`)
  already calls `captureException` for genuine unexpected errors (untagged
  500s, uncaught exceptions, unhandled rejections). Tagged config-missing
  503s and 4xx responses are deliberately NOT captured — they are expected,
  user-actionable conditions, not defects.
- `getProvider()` throws when unbonded (like other cores); prefer the
  convenience functions or `getOptionalProvider()` in reporting paths.
- Context is normalized (`tags`/`user`/`extra`/`request`) — never pass
  provider-specific (e.g. Sentry) scope objects through this interface.
