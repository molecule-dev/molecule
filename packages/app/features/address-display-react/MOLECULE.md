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
npm install @molecule/app-address-display-react
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

### Functions

#### `AddressDisplay(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .address
- `root0` — .name
- `root0` — .phone
- `root0` — .leading
- `root0` — .actions
- `root0` — .inline
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
