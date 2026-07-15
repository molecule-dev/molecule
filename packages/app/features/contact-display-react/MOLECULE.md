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
npm install @molecule/app-contact-display-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ContactFields`

Fields describing a contact rendered by ContactDisplay.

```typescript
interface ContactFields {
  name: string
  email?: string
  phone?: string
  role?: ReactNode
  avatarSrc?: string
  address?: ReactNode
  company?: ReactNode
}
```

### Functions

#### `ContactDisplay(root0, root0, root0, root0, root0, root0)`

Formatted contact display — avatar + name + role + email/phone with
leading icons + optional address and company. Three layouts for
different densities.

```typescript
function ContactDisplay({
  contact,
  layout = 'card',
  actions,
  onClick,
  className,
}: ContactDisplayProps): JSX.Element
```

- `root0` — *
- `root0` — .contact
- `root0` — .layout
- `root0` — .actions
- `root0` — .onClick
- `root0` — .className

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
