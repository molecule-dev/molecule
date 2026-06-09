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

## API

### Functions

#### `InlineEdit(root0, root0, root0, root0, root0, root0, root0)`

Click-to-edit text. Renders the value as text by default; on click
(or focus via tab + Enter), swaps in an `<Input>` / `<Textarea>` for
inline editing. Enter submits, Escape cancels.

Common in titles, descriptions, table cells where modal-based forms
would be heavyweight.

```typescript
function InlineEdit({
  value,
  onSubmit,
  variant = 'input',
  renderRead,
  placeholder,
  className,
}: InlineEditProps): ReactNode
```

- `root0` — *
- `root0` — .value
- `root0` — .onSubmit
- `root0` — .variant
- `root0` — .renderRead
- `root0` — .placeholder
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
