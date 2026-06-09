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
npm install @molecule/app-contact-form-react
```

## API

### Interfaces

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

#### `ContactForm(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .onSubmit
- `root0` — .title
- `root0` — .description
- `root0` — .submitLabel
- `root0` — .successContent
- `root0` — .extraFields
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
