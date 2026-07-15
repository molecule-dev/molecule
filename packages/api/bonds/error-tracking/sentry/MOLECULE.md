# @molecule/api-error-tracking-sentry

Sentry error tracking provider for molecule.dev.

Reports exceptions and messages to Sentry via `@sentry/node`, mapping the
normalized `@molecule/api-error-tracking` context onto Sentry scopes
(tags/user/extra).

## Quick Start

```typescript
import { setProvider, captureException } from '@molecule/api-error-tracking'
import { provider } from '@molecule/api-error-tracking-sentry'

// Bond at startup (e.g. in setupBonds())
setProvider(provider)

// Anywhere in the app — delivered to Sentry once SENTRY_DSN is set
captureException(new Error('boom'), { tags: { source: 'worker' } })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-error-tracking-sentry @molecule/api-bond @molecule/api-error-tracking @molecule/api-secrets @sentry/node
```

## API

### Constants

#### `provider`

Sentry error tracking provider. Lazily initialized from `SENTRY_DSN`;
every method is a documented no-op while the DSN is unset.

```typescript
const provider: ErrorTrackingProvider
```

#### `sentrySecretDefinitions`

Secret definitions required by the Sentry error tracking bond.

```typescript
const sentrySecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-error-tracking` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setUser, setProvider } from '@molecule/api-error-tracking'
import { provider } from '@molecule/api-error-tracking-sentry'

export function setupErrorTrackingSentry(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-error-tracking` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `SENTRY_DSN` *(required)* — Sentry DSN
  - Setup: Sentry → Settings → Projects → your project → Client Keys (DSN); copy the DSN. Until it is set the bond is a no-op (no events are sent).
  - Get it here: [https://sentry.io/settings/projects/](https://sentry.io/settings/projects/)
  - Example: `https://examplePublicKey@o0.ingest.sentry.io/0`
- `SENTRY_ENVIRONMENT` *(optional)* — Sentry environment
  - Setup: Environment tag applied to every event (e.g. production, staging); defaults to NODE_ENV when unset.
  - Example: `production`
- `SENTRY_TRACES_SAMPLE_RATE` *(optional)* — Sentry traces sample rate
  - Setup: Fraction between 0 and 1 of transactions sampled for performance tracing (e.g. 0.1 = 10%); unset disables tracing.
  - Example: `0.1`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-error-tracking`
- `@molecule/api-secrets`
- `@sentry/node`

- **Without `SENTRY_DSN` the provider is a documented no-op.** It never
  throws or crashes an app that installed it but hasn't configured the
  key — captures simply do nothing, and the boot-time config report flags
  the missing `SENTRY_DSN` with setup instructions.
- The SDK is initialized lazily (once) on first use, from `SENTRY_DSN`,
  optional `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`), and optional
  `SENTRY_TRACES_SAMPLE_RATE` (0–1; unset disables tracing).
- **A returned event id does NOT confirm delivery.** The SDK buffers and
  sends asynchronously; a capture can return an id and still never reach
  Sentry (bad DSN, network egress blocked, process exited too soon). Call
  `flush(timeoutMs)` before process exit — `false` means events may have
  been dropped — and check the DSN/network before concluding the
  integration is broken.
