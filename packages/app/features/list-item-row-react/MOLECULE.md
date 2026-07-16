# @molecule/app-list-item-row-react

Generic list-item row.

Exports `<ListItemRow>` — leading slot (icon/avatar/thumbnail) + up to three
text lines (title / subtitle / metadata) + right-side actions. Props: `title`,
`subtitle?`, `metadata?`, `leading?`, `actions?`, `onClick?`, `selected?`,
`disabled?`, `density?` (`'comfortable'` default | `'compact'`), `className?`.
Use for nav lists, mobile menus, search results, picker dialogs, inbox threads.
For table rows use `<RowWithActions>` from `@molecule/app-data-table-ui-react`
instead — this component is not a `<tr>`.

## Quick Start

```tsx
import { ListItemRow } from '@molecule/app-list-item-row-react'

<ListItemRow
  title="Project Alpha"
  subtitle="Last edited 2 hours ago"
  metadata="3 collaborators · 12 files"
  leading={<img src="/icons/folder.svg" alt="" width={32} height={32} />}
  actions={<button onClick={() => openMenu('alpha')}>Menu</button>}
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

### Interfaces

#### `ListItemRowProps`

```typescript
interface ListItemRowProps {
  /** Title — first line. */
  title: ReactNode
  /** Optional second line (excerpt, description). */
  subtitle?: ReactNode
  /** Optional third line (metadata — timestamps, counts, tags). */
  metadata?: ReactNode
  /** Optional leading slot — icon, avatar, thumbnail image. */
  leading?: ReactNode
  /** Optional right-side actions (buttons, action menu). */
  actions?: ReactNode
  /** Called when the row body is clicked. */
  onClick?: () => void
  /** When true, sets `aria-selected` on the row — no built-in visual highlight; style it via `className` or host CSS. */
  selected?: boolean
  /** When true, renders in a disabled visual state. */
  disabled?: boolean
  /** Dense vs comfortable spacing. Defaults to `'comfortable'`. */
  density?: 'comfortable' | 'compact'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `ListItemRow(props)`

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

- `props` — Component props (see {@link ListItemRowProps}).

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

- `selected` only sets the `aria-selected` attribute — no built-in highlight.
  Pass a highlight class via `className` (or target `[aria-selected="true"]` in
  host CSS) to make selection visible.
- Clicks inside `actions` are stopPropagation'd automatically, so action buttons
  never trigger the row `onClick`.
- `disabled` halves the opacity and disables `onClick`; there is no
  `data-mol-id` prop.
- Styling resolves through `getClassMap()` — wire a ClassMap bond first.
