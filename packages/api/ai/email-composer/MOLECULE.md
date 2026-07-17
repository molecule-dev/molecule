# @molecule/api-ai-email-composer

`@molecule/api-ai-email-composer` — AI-assisted email drafting.

Generates email drafts (subject + body) with tone / length / audience
controls, plus an optional reply mode that grounds the draft in a
previous message.

## Quick Start

```ts
import { composeEmail } from '@molecule/api-ai-email-composer'

const draft = await composeEmail({
  brief: 'Tell the team the launch moved to Friday; apologize for the short notice.',
  tone: 'apologetic',
  length: 'short',
  audience: 'the engineering team',
  senderName: 'Priya',
})
// draft = { subject, body, reasoning? }
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-email-composer @molecule/api-ai @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation
```

## API

### Interfaces

#### `ComposeOptions`

Options accepted by {@link composeEmail} to control the generated draft.

```typescript
interface ComposeOptions {
  /** Plain-English description of what the email should say. */
  brief: string
  /** Tone preset. Default 'professional'. */
  tone?: EmailTone
  /** Length preset. Default 'medium'. */
  length?: EmailLength
  /** Who you're writing to (e.g. "the engineering team", "a vendor"). */
  audience?: string
  /** Optional prior message to reply to — anchors the response. */
  inReplyTo?: { from?: string; subject?: string; body: string }
  /** Sender name (for signature). */
  senderName?: string
  /** Pass-through to AI provider. */
  model?: string
}
```

#### `EmailDraft`

AI-generated email draft returned by {@link composeEmail}.

```typescript
interface EmailDraft {
  subject: string
  body: string
  reasoning?: string
}
```

### Types

#### `EmailLength`

Length preset controlling how many sentences / paragraphs the draft contains.

```typescript
type EmailLength = 'short' | 'medium' | 'long'
```

#### `EmailTone`

Tone preset controlling the voice and register of the generated email.

```typescript
type EmailTone =
  | 'professional'
  | 'friendly'
  | 'concise'
  | 'persuasive'
  | 'apologetic'
  | 'enthusiastic'
```

### Functions

#### `composeEmail(opts)`

Generates an email draft (subject + body) from a plain-English brief using the wired AI provider.

```typescript
function composeEmail(opts: ComposeOptions): Promise<EmailDraft>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `@molecule/api-ai` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`

Requires a bonded `ai` chat provider — `composeEmail()` resolves it via
`@molecule/api-ai`'s `requireProvider()` and throws if none is bonded. Wire
one at startup (`bond('ai', provider)` or a named provider); with several
named providers and no explicit default, resolution declines — see the
`@molecule/api-ai` core docs.

Failure shape (no rejection): when the model returns non-JSON output — or the
provider fails mid-call (API errors arrive as in-band `error` events, which
this package does not treat as fatal) — the promise still RESOLVES with
`{ subject: '(draft failed)', body: <raw model text or ''>, reasoning:
'malformed JSON' }`. Check for that subject (or validate the draft) before
sending anything automatically. Only a missing `ai` bond throws.
