# @molecule/app-newsletter-signup-react

Email subscribe form.

Exports `<NewsletterSignup>` with inline + stacked layouts. Tracks its
own submitting / error / success state; the app owns the subscription
side-effect via `onSubscribe`.

## Quick Start

```tsx
import { NewsletterSignup } from '@molecule/app-newsletter-signup-react'

declare const api: { subscribe: (email: string) => Promise<void> }

<NewsletterSignup
  title="Stay in the loop"
  description="Get weekly updates delivered to your inbox."
  onSubscribe={async (email) => { await api.subscribe(email) }}
  layout="inline"
  successContent={<p>Thanks for subscribing!</p>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-newsletter-signup-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `NewsletterSignupProps`

```typescript
interface NewsletterSignupProps {
  /** Called with the email on submit. Return a Promise to block double-submit. */
  onSubscribe: (email: string) => void | Promise<void>
  /** Optional title above the form. */
  title?: ReactNode
  /** Optional supporting copy under the title. */
  description?: ReactNode
  /** Placeholder for the email input. */
  placeholder?: string
  /** Submit-button label. */
  buttonLabel?: ReactNode
  /** Rendered after successful subscription. */
  successContent?: ReactNode
  /** Layout — `'inline'` default (input + button on one row) or `'stacked'`. */
  layout?: 'inline' | 'stacked'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `NewsletterSignup(props)`

Email + subscribe button widget. Tracks its own submitting/error/success
state. Apps own the actual subscription side-effect via `onSubscribe`.

```typescript
function NewsletterSignup({
  onSubscribe,
  title,
  description,
  placeholder,
  buttonLabel,
  successContent,
  layout = 'inline',
  className,
}: NewsletterSignupProps): JSX.Element
```

- `props` — Component props (see {@link NewsletterSignupProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Requires a wired ClassMap bond and a React `I18nProvider` ancestor —
`getClassMap()` and `useTranslation()` both throw before wiring.
Pair with `@molecule/app-locales-newsletter-signup` for the
placeholder / button strings in 79 languages.

ALWAYS pass `successContent` — without it a successful submit only
clears the input and re-renders the empty form (no built-in "thanks"
message). Return a Promise from `onSubscribe` so double-submits are
blocked while in flight; a rejected Promise renders the error's
`message` verbatim below the form, so throw user-readable (ideally
pre-translated) messages.

## Translations

Translation strings are provided by `@molecule/app-locales-newsletter-signup`.
