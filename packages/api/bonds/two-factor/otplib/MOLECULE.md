# @molecule/api-two-factor-otplib

Two-factor authentication provider using otplib for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-two-factor-otplib @molecule/api-two-factor otplib qrcode
npm install -D @types/qrcode
```

## API

### Constants

#### `provider`

Two-factor authentication provider backed by otplib and qrcode.

```typescript
const provider: TwoFactorProvider
```

## Core Interface
Implements `@molecule/api-two-factor` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-two-factor'
import { provider } from '@molecule/api-two-factor-otplib'

export function setupTwoFactorOtplib(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-two-factor` ^1.0.0

### Runtime Dependencies

- `@molecule/api-two-factor`
- `otplib`
- `qrcode`

**Testing the flow end-to-end without an authenticator app.** A TOTP feature
is only verified when a real code passes the challenge — and no phone is
needed for that: generate the current code from the stored base32 secret
with `otplib` itself (this bond's own dependency, already installed):

```bash
node -e "import('otplib').then(async o => console.log(await o.generate({ secret: process.argv[1] })))" <base32-secret>

(otplib v13 exposes `generate({ secret })` — the v12 `authenticator.generate()`
was removed and will throw.)
```

Use the secret returned by `generateSecret()` during setup (or read it back
from wherever the app stored it) to complete the enable + challenge steps in
a browser walkthrough or an integration test. Codes rotate every 30 seconds
— generate immediately before submitting. Never mock `verify()` to test the
flow; a generated real code exercises the same path a user's app does.

## E2E Tests

` checklist below.)

**Adding 2FA to an app that already has its OWN backend/database:** persist the 2FA record
in YOUR server-side datastore — the state (secret + `enabled`) has to live somewhere the
server controls. Do NOT assume the imported app's own hosted-DB ADMIN credentials are
available: an imported repo ships only its public/client config, so a server-side admin write
to the app's external database fails at runtime with a "missing env var". Use whatever
server-side datastore the ENVIRONMENT actually provides — in the molecule sandbox that's the
provisioned `DATABASE_URL` (`@molecule/api-database` or a `pg` pool) — keyed by the app's user
id. (Still route EVERY 2FA read AND write through the server — a direct read/write of the 2FA
table from the BROWSER exposes the secret; a leftover client-side DB call is a bug.)
