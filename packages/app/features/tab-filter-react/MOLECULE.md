# @molecule/app-tab-filter-react

React tab-style filter with inline count badges.

Exports `<TabFilter>` — horizontally-scrolling pill-tabs with counts —
and the `TabFilterTab` type. Different from `<Tabs>` in
`@molecule/app-ui-react`: this one surfaces per-tab count badges and
scrolls horizontally on overflow.

## Quick Start

```tsx
import { useState } from 'react'

import { TabFilter } from '@molecule/app-tab-filter-react'

function TicketFilters() {
  const [activeTab, setActiveTab] = useState('all')
  const tabs = [
    { id: 'all', label: 'All', count: 42 },
    { id: 'open', label: 'Open', count: 8 },
    { id: 'closed', label: 'Closed', count: 34 },
  ]
  return <TabFilter tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
}
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

#### `TabFilterProps`

Props for the {@link TabFilter} component.

```typescript
interface TabFilterProps {
  /** Tabs to render. */
  tabs: TabFilterTab[]
  /** Currently active tab id. */
  activeId: string
  /** Called when an enabled tab is clicked. */
  onChange: (id: string) => void
  /** Whether to allow the row to scroll horizontally. Defaults to true. */
  scrollable?: boolean
  /**
   * When `true` (default), draws filled-pill backgrounds matching the
   * polished flagship apps: active = `bg-primary text-on-primary`,
   * inactive = `bg-surface-container-low hover:bg-surface-container`.
   * Pass `false` for the older bare-text-only style (no background).
   */
  filled?: boolean
  /** Extra classes. */
  className?: string
}
```

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

#### `TabFilter(props)`

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

- `props` — Component props (see {@link TabFilterProps}).

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

- Requires a wired ClassMap bond (`getClassMap()` throws before
  bonding). Labels are ReactNode — pass translated strings.
- The default `filled` pill backgrounds use Material-3 token utilities
  (`bg-primary text-on-primary`, `bg-surface-container-low`, …) that
  only produce CSS when the app theme defines those tokens (flagship
  themes do; the minimal scaffold does not). In token-less apps pass
  `filled={false}` (font-weight-only active state) or add the tokens.
- Counts render via `toLocaleString()`; `disabled` tabs are
  non-interactive. Keyboard interaction is click/tab-focus only — no
  roving arrow-key navigation.
