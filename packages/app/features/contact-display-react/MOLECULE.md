# @molecule/app-contact-display-react

React contact display.

Exports `<ContactDisplay>` — avatar + name + role + email/phone/address with card/row/compact layouts.

## Quick Start

```tsx
import { ContactDisplay } from '@molecule/app-contact-display-react'

<ContactDisplay
  contact={{
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1 555 0100',
    role: 'Product Designer',
    company: 'Acme Corp',
  }}
  layout="row"
  onClick={() => openProfile('jane')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-contact-display-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
