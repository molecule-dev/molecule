# @molecule/app-list-item-row-react

Generic list-item row.

Exports `<ListItemRow>` — thumbnail + title + subtitle + metadata + actions.
Use for nav lists, mobile menus, search results, picker dialogs, inbox threads.

## Quick Start

```tsx
import { ListItemRow } from '@molecule/app-list-item-row-react'

<ListItemRow
  title="Project Alpha"
  subtitle="Last edited 2 hours ago"
  metadata="3 collaborators · 12 files"
  leading={<img src="/icons/folder.svg" alt="" width={32} height={32} />}
  actions={<button onClick={() => openMenu('alpha')}>...</button>}
  onClick={() => navigate('/projects/alpha')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-list-item-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `ListItemRow(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Generic "thumbnail + text + actions" row — used everywhere:
navigation lists, mobile menus, inbox-style threads, search
results, picker dialogs, bookmark lists, etc.

Different from `<RowWithActions>` in `@molecule/app-data-table-ui-react`
in NOT being a `<tr>` — use this for non-table lists.

```typescript
function ListItemRow({
  title,
  subtitle,
  metadata,
  leading,
  actions,
  onClick,
  selected,
  disabled,
  density = 'comfortable',
  className,
}: ListItemRowProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .subtitle
- `root0` — .metadata
- `root0` — .leading
- `root0` — .actions
- `root0` — .onClick
- `root0` — .selected
- `root0` — .disabled
- `root0` — .density
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
