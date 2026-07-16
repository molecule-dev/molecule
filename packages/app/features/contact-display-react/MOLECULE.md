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

#### `ContactDisplayProps`

```typescript
interface ContactDisplayProps {
  contact: ContactFields
  /** Layout preset. */
  layout?: 'card' | 'row' | 'compact'
  /** Optional right-side actions. */
  actions?: ReactNode
  /** Click handler on the row. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

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

#### `ContactDisplay(props)`

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

- `props` — Component props (see {@link ContactDisplayProps}).

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

`contact` fields are display-only data — `email`/`phone` render as
`mailto:`/`tel:` links; there is no formatting/validation. The email/phone/
address markers are text glyphs (✉ ☎ ⌂), not themed SVG icons. `role`,
`address`, and `company` accept ReactNodes — pass translated strings via
`t()` where needed. When `onClick` is provided the whole row becomes
clickable; supply your own keyboard affordance (e.g. wrap in a button/link)
for accessibility-critical surfaces.
