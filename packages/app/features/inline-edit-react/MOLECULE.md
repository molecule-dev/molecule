# @molecule/app-inline-edit-react

Click-to-edit inline field.

Exports `<InlineEdit>`.

## Quick Start

```tsx
import { InlineEdit } from '@molecule/app-inline-edit-react'

<InlineEdit
  value={deal.title}
  onSubmit={async (next) => { await updateDeal({ title: next }) }}
  placeholder="Enter deal title"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-inline-edit-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
