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
npm install @molecule/app-list-item-row-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
