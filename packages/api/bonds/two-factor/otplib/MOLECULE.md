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

Integration checklist — drive the app's REAL UI as the user would (in
molecule.dev: navigate_preview → read_preview_ui → interact_preview, targeting
elements by data-mol-id), adapt to this app's actual auth/settings screens, and
check every box off one by one. A box you can't check is an integration bug to
fix — not a skip:
- [ ] Sign up + log in through the real auth screens still works — do this
  FIRST; the most common 2FA-integration regression is a broken login.
- [ ] Open security/settings → "Set up 2FA" → a QR code / secret key is
  VISIBLE. An error here means the server-side setup route or 2FA store is broken.
- [ ] Entering a REAL TOTP code enables 2FA; a made-up `000000` must FAIL.
  COUNTERPARTY: the secret is shown on screen during setup — compute the current
  6-digit code from it with the preinstalled otplib (v13: `await generate({ secret })`;
  both otplib's `generate()` and this package's `verify()` are async). NEVER add
  an endpoint that leaks the stored secret to the client to obtain the code.
- [ ] Log out, log back in → the 2FA challenge appears AFTER the password → a
  valid code completes login; a wrong code is rejected with a clear error.
- [ ] Disable 2FA from settings → log out / log back in → no challenge.
Keep a real-path integration test in the repo (the second `@example`) so the
lifecycle stays covered on every later build.
