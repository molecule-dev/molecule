# @molecule/api-ai-email-composer

`@molecule/api-ai-email-composer` — AI-assisted email drafting.

Generates email drafts (subject + body) with tone / length / audience
controls, plus an optional reply mode that grounds the draft in a
previous message.

Extracted from ai-email-composer flagship.

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-email-composer
```

## API

### Interfaces

#### `ComposeOptions`

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

```typescript
interface EmailDraft {
  subject: string
  body: string
  reasoning?: string
}
```

### Types

#### `EmailLength`

```typescript
type EmailLength = 'short' | 'medium' | 'long'
```

#### `EmailTone`

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
- `express` ^5.0.0
- `zod` ^4.0.0
- `@molecule/api-ai` ^1.0.0
