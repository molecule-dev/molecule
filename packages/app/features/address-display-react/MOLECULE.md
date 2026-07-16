# @molecule/app-address-display-react

Address display.

Exports `<AddressDisplay>` — formatted multi-line (or inline) address with
name, phone, leading icon, and action slots.
Also exports the `Address` type.

## Quick Start

```tsx
import { AddressDisplay } from '@molecule/app-address-display-react'

<AddressDisplay
  name="Jane Smith"
  address={{
    line1: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701',
    country: 'US',
  }}
  phone="+1 555-867-5309"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-address-display-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `Address`

Structured postal address with optional individual fields.

```typescript
interface Address {
  /** First line — street + number. */
  line1?: string
  /** Second line — apartment, suite, unit. */
  line2?: string
  /** City. */
  city?: string
  /** State / province / region. */
  state?: string
  /** ZIP / postal code. */
  postalCode?: string
  /** Country. */
  country?: string
}
```

#### `AddressDisplayProps`

```typescript
interface AddressDisplayProps {
  /** Address fields. */
  address: Address
  /** Optional name / label preceding the address. */
  name?: ReactNode
  /** Optional phone number rendered under the address. */
  phone?: string
  /** Optional `<Icon>` / avatar leading slot. */
  leading?: ReactNode
  /** Optional right-side actions. */
  actions?: ReactNode
  /** Format as a single line instead of multi-line. */
  inline?: boolean
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `AddressDisplay(props)`

Formatted multi-line address display with optional name, phone,
leading slot, and right-side actions. Set `inline` to render all
fields on a single line (e.g., in a table cell).

```typescript
function AddressDisplay({
  address,
  name,
  phone,
  leading,
  actions,
  inline,
  className,
}: AddressDisplayProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link AddressDisplayProps}).

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
