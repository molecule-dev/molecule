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
npm install @molecule/app-tab-filter-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
