# @molecule/api-error-tracking-console

Console (logger-based) error tracking provider for molecule.dev.

Zero-credential development default: captures are written as structured
log lines through the bonded logger instead of being sent to a remote
service. Swap in a remote bond (e.g. `@molecule/api-error-tracking-sentry`)
for production without changing any consumer code.

## Quick Start

```typescript
import { setProvider, captureException } from '@molecule/api-error-tracking'
import { provider } from '@molecule/api-error-tracking-console'

// Bond at startup (e.g. in setupBonds()) — no credentials needed
setProvider(provider)

// Logs a structured "error-tracking: exception captured" line
captureException(new Error('boom'), { tags: { source: 'worker' } })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-error-tracking-console @molecule/api-bond @molecule/api-error-tracking
```

## API

### Constants

#### `provider`

Console error tracking provider. Logs structured captures through the
bonded logger and reports a generated event id, mirroring the remote
providers' behavior so app code works identically in development.

```typescript
const provider: ErrorTrackingProvider
```

## Core Interface
Implements `@molecule/api-error-tracking` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setUser, setProvider } from '@molecule/api-error-tracking'
import { provider } from '@molecule/api-error-tracking-console'

export function setupErrorTrackingConsole(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-error-tracking` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-error-tracking`

- Requires no configuration or credentials — safe in every environment.
- Each capture gets a generated event id (returned and logged), mirroring
  remote providers so consumer code behaves identically in development.
- `setUser()` scopes subsequent captures like a remote provider's user
  scope; `flush()` trivially resolves `true` (nothing is buffered).
