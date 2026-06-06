# @molecule/app-sort-picker-react

React sort-by picker.

Exports `<SortPicker>` — single-select wrapper for "Sort by" controls.

## Quick Start

```tsx
import { SortPicker } from '@molecule/app-sort-picker-react'

const [sort, setSort] = useState('newest')

<SortPicker
  value={sort}
  onChange={setSort}
  options={[
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'popular', label: 'Most Popular' },
  ]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-sort-picker-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
