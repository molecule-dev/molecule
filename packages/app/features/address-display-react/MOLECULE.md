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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
