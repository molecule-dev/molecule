# @molecule/app-contact-form-react

Generic contact form (name + email + message + extras).

Exports `<ContactForm>` and `ContactFormValues` type.

## Quick Start

```tsx
import { ContactForm } from '@molecule/app-contact-form-react'

<ContactForm
  title="Get in touch"
  description="We'll respond within one business day."
  onSubmit={async (values) => {
    await api.sendContactMessage(values)
  }}
  successContent={<p>Thanks! We'll be in touch soon.</p>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-contact-form-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ContactFormProps`

```typescript
interface ContactFormProps {
  /** Called with the form values on submit. Return a Promise to block double-submit. */
  onSubmit: (values: ContactFormValues) => void | Promise<void>
  /** Form heading. */
  title?: ReactNode
  /** Optional supporting copy under the heading. */
  description?: ReactNode
  /** Custom submit-button label. */
  submitLabel?: ReactNode
  /** Rendered when the form successfully submits. */
  successContent?: ReactNode
  /** Extra fields rendered above the message textarea. */
  extraFields?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `ContactFormValues`

Shape of values collected by the contact form and passed to `onSubmit`.

```typescript
interface ContactFormValues {
  name: string
  email: string
  message: string
  /** App-supplied additional fields. */
  [key: string]: string
}
```

### Functions

#### `ContactForm(props)`

Generic name + email + message contact form with submit handling and
success state. `extraFields` slot lets apps add domain-specific
inputs (subject, phone, agent id, etc.).

```typescript
function ContactForm({
  onSubmit,
  title,
  description,
  submitLabel,
  successContent,
  extraFields,
  className,
}: ContactFormProps): JSX.Element | null
```

- `props` — Component props (see {@link ContactFormProps}).

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

`onSubmit` receives ONLY `{ name, email, message }` — inputs rendered via
the `extraFields` slot are displayed but NOT collected; own their state in
the parent and merge them inside your `onSubmit` (or a wrapping form).
Always pass `successContent`: without it the form clears silently after a
successful submit with no user feedback. If `onSubmit` throws, the thrown
`Error.message` is shown verbatim below the form — throw translated,
user-safe messages. Placeholders/buttons use `contactForm.*` i18n keys
(companion bond: `@molecule/app-locales-contact-form`).
