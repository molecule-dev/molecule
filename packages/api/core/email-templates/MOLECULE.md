# @molecule/api-email-templates

Transactional email templates for molecule.dev.

Provides a small registry of i18n-driven templates (subscription started,
renewed, canceled, payment failed, usage-limit warning, trial ending) plus
a `sendTemplate(...)` convenience wrapper around the bonded
`@molecule/api-emails` transport.

Apps can override individual templates by calling `registerTemplate(...)`
with the same key, register entirely new templates, or render templates
directly via `renderTemplate(...)` for delivery channels other than email.

## Quick Start

```typescript
import { sendTemplate, TEMPLATE_KEYS } from '@molecule/api-email-templates'

await sendTemplate(TEMPLATE_KEYS.subscriptionStarted, {
  from: 'support@example.com',
  to: 'user@example.com',
  locale: 'en',
  variables: {
    appName: 'Personal Finance',
    userName: 'Lou',
    planName: 'Pro',
    amount: '$19.00',
    period: 'month',
    manageUrl: 'https://app.example.com/billing',
  },
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-email-templates
```

## API

### Interfaces

#### `EmailTemplate`

Definition of a transactional email template.

Each template defines i18n keys for the subject and body fields plus
English defaults that are used when no translation is registered for the
caller's locale. Variable interpolation is performed by the i18n library
(e.g. `Welcome, {{userName}}!` substitutes `vars.userName`).

```typescript
interface EmailTemplate {
  /** Stable identifier for the template (e.g. `'subscription.started'`). */
  key: string

  /** i18n key resolved by `t()` for the email subject line. */
  subjectKey: string

  /** English fallback used when no translation exists for `subjectKey`. */
  defaultSubject: string

  /** i18n key resolved by `t()` for the plain-text body. */
  textKey: string

  /** English fallback used when no translation exists for `textKey`. */
  defaultText: string

  /** Optional i18n key resolved by `t()` for the HTML body. */
  htmlKey?: string

  /** Optional English fallback used when no translation exists for `htmlKey`. */
  defaultHtml?: string

  /**
   * Optional declaration of the variables this template expects. Used purely
   * for type inference at registration sites — runtime rendering is permissive.
   */
  variables?: readonly string[]
}
```

#### `RenderedEmail`

Result of rendering a template — ready to feed into `EmailTransport.sendMail`.

```typescript
interface RenderedEmail {
  /** Rendered subject. */
  subject: string

  /** Rendered plain-text body. */
  text: string

  /** Rendered HTML body, when the template defined one. */
  html?: string
}
```

#### `SendTemplateOptions`

Options passed to `sendTemplate`.

```typescript
interface SendTemplateOptions {
  /** Recipient address (string or `EmailAddress`). */
  to: string | EmailAddress | (string | EmailAddress)[]

  /** Sender address. */
  from: string | EmailAddress

  /** Optional CC recipients. */
  cc?: string | EmailAddress | (string | EmailAddress)[]

  /** Optional BCC recipients. */
  bcc?: string | EmailAddress | (string | EmailAddress)[]

  /** Optional reply-to address. */
  replyTo?: string | EmailAddress

  /** Variables interpolated into the rendered template. */
  variables?: EmailTemplateVariables

  /**
   * Optional locale override used when looking up translations. Most apps
   * resolve locale from the request and pass it explicitly.
   */
  locale?: string
}
```

### Types

#### `EmailTemplateVariables`

Variables passed at render time. Values are flattened to strings for
substitution; objects/arrays are JSON-stringified.

```typescript
type EmailTemplateVariables = Record<string, unknown>
```

#### `TransactionalTemplateKey`

Type of every key declared in `TEMPLATE_KEYS`. Use this for type-safe
`sendTemplate(...)` calls.

```typescript
type TransactionalTemplateKey = (typeof TEMPLATE_KEYS)[keyof typeof TEMPLATE_KEYS]
```

### Functions

#### `clearRegistry()`

Drop every override. The built-in defaults remain available via `getTemplate`.
Intended for tests; production code should not need to call this.

```typescript
function clearRegistry(): void
```

#### `getTemplate(key)`

Look up a template by key. Returns the registered override if any, then
falls back to the built-in defaults, and finally returns `undefined` when
no template is known.

```typescript
function getTemplate(key: string): EmailTemplate | undefined
```

- `key` — The template key.

**Returns:** The matching template, or `undefined` if unregistered.

#### `listTemplates()`

Returns every template currently visible — overrides, then any built-in
defaults whose key wasn't overridden.

```typescript
function listTemplates(): EmailTemplate[]
```

**Returns:** A snapshot of all available templates.

#### `registerTemplate(template)`

Register or override a single template. Subsequent calls with the same
`key` replace the previous registration.

```typescript
function registerTemplate(template: EmailTemplate): void
```

- `template` — The template to register.

#### `registerTemplates(templates)`

Register or override several templates in one call.

```typescript
function registerTemplates(templates: EmailTemplate[]): void
```

- `templates` — The templates to register.

#### `renderTemplate(template, variables, locale)`

Render a template into a `RenderedEmail` ready to send.

```typescript
function renderTemplate(template: EmailTemplate, variables?: EmailTemplateVariables, locale?: string): RenderedEmail
```

- `template` — The template to render.
- `variables` — Optional values used for `{{variable}}` interpolation.
- `locale` — Optional locale override (e.g. `'fr'`); defaults to the

**Returns:** The rendered subject, text, and (optional) html.

#### `sendTemplate(key, options)`

Render a template and send it via the bonded email transport.

Looks up the template via `getTemplate(key)` (registered overrides first,
then built-in defaults), renders it for the requested locale + variables,
and dispatches the rendered message via the bonded transport.

```typescript
function sendTemplate(key: string, options: SendTemplateOptions): Promise<EmailSendResult>
```

- `key` — The template key (e.g. `'subscription.started'`).
- `options` — Recipient, sender, optional cc/bcc/replyTo, variables, locale.

**Returns:** The transport's `EmailSendResult`.

### Constants

#### `defaultTemplates`

Built-in templates indexed by key. Read by `getTemplate(key)` whenever
the runtime registry has no override registered.

```typescript
const defaultTemplates: Record<string, EmailTemplate>
```

#### `TEMPLATE_KEYS`

Identifier of the built-in subscription lifecycle templates.

```typescript
const TEMPLATE_KEYS: { readonly subscriptionStarted: "subscription.started"; readonly subscriptionRenewed: "subscription.renewed"; readonly subscriptionCanceled: "subscription.canceled"; readonly paymentFailed: "subscription.paymentFailed"; readonly usageLimitWarning: "subscription.usageLimitWarning"; readonly trialEnding: "subscription.trialEnding"; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-emails` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
