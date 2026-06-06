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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
