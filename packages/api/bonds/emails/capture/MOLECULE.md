# @molecule/api-emails-capture

Email capture provider for molecule.dev.

Records every `sendMail()` call as an activity event. Intercept-only by
default (synthetic success); delegates + tees when wrapping a real transport.

## Quick Start

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-capture'

setTransport(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-capture @molecule/api-activity @molecule/api-emails
```

## API

### Functions

#### `createEmailCaptureProvider(realTransport)`

Creates an email capture transport.

When `realTransport` is provided, each message is delivered through it and
the captured event records the real outcome (delegate + tee). When omitted
(the dev default), messages are intercepted and a synthetic success result
is returned.

```typescript
function createEmailCaptureProvider(realTransport?: EmailTransport): EmailTransport
```

- `realTransport` — Optional real transport to delegate to and tee.

**Returns:** An {@link EmailTransport} that records activity for every send.

### Constants

#### `provider`

Default email capture transport (intercept-only).

```typescript
const provider: EmailTransport
```

## Core Interface
Implements `@molecule/api-emails` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-capture'

export function setupEmailsCapture(): void {
  setTransport(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-activity` ^1.0.0
- `@molecule/api-emails` ^1.0.0

### Runtime Dependencies

- `@molecule/api-activity`
- `@molecule/api-emails`

Recording is best-effort: a bonded `ActivitySink` that throws NEVER
changes the outcome of `sendMail()` — a successful real send always
resolves successfully and a failed real send always rejects with the
REAL transport error, even if the activity record itself failed. This
matters because a naive delegate-then-record implementation can turn an
actually-SENT email into an apparent failure, causing callers to retry
and recipients to get duplicates.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks). The
sandbox CAPTURES outbound email instead of sending — read each message with
the `read_activity` tool (filter type 'email'); the verification/reset link
is in its payload. Never mock the send or modify production code to expose
it. Adapt each item to this app's actual screens/flows, and check every box
off one by one. A box you can't check is an integration bug to fix — not a
skip:
- [ ] Each email-triggering flow (signup verification, password-reset request,
  invites/notifications the app defines) confirms the send in the UI ("check
  your inbox") and a message actually reaches the transport.
- [ ] The password-reset round-trip completes: request a reset → open the
  captured message → follow its single-use link → set a new password → log
  in with it (and the old password no longer works).
- [ ] The message body contains a LINK, never the raw token/secret, and renders
  with the app's real name/content (no `undefined` placeholders).
- [ ] Requesting a reset for an unknown email shows the same neutral UI response
  as a known one (no account-existence oracle).
- [ ] Account emails go only to the account's own address — no UI or endpoint
  lets an unauthenticated caller send to an arbitrary address.
