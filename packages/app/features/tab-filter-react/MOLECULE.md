# @molecule/app-tab-filter-react

React tab-style filter with inline count badges.

Exports `<TabFilter>` — horizontally-scrolling pill-tabs with counts.

## Quick Start

```tsx
import { TabFilter } from '@molecule/app-tab-filter-react'

const tabs = [
  { id: 'all', label: 'All', count: 42 },
  { id: 'open', label: 'Open', count: 8 },
  { id: 'closed', label: 'Closed', count: 34 },
]

<TabFilter tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-tab-filter-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `TabFilterTab`

Shape of a single tab entry passed to {@link TabFilter}.

```typescript
interface TabFilterTab {
  /** Unique id / state key. */
  id: string
  /** Display label. */
  label: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional count badge (e.g. number of items matching this filter). */
  count?: number
  /** When true, the tab renders disabled. */
  disabled?: boolean
}
```

### Functions

#### `TabFilter(root0, root0, root0, root0, root0, root0, root0)`

Horizontal pill-style tab row used as a segmented filter. Different
from `<Tabs>` from `@molecule/app-ui-react` in surfacing inline count
badges per tab and scrolling horizontally on overflow.

Typical uses: "All (42) | Open (8) | Closed (34)", activity-type
filters, comment-thread filters, status switchers.

```typescript
function TabFilter({
  tabs,
  activeId,
  onChange,
  scrollable = true,
  filled = true,
  className,
}: TabFilterProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .tabs
- `root0` — .activeId
- `root0` — .onChange
- `root0` — .scrollable
- `root0` — .filled
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
