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

## API

### Interfaces

#### `SortOption`

A single option entry for the SortPicker select list.

```typescript
interface SortOption<T extends string = string> {
  value: T
  label: ReactNode
}
```

### Functions

#### `SortPicker(root0, root0, root0, root0, root0, root0, root0)`

Standalone sort-by selector. Thin wrapper around `<Select>` with a
conventional "Sort by:" label and a focused single-select API.

Different from `<FilterBar>` which manages multiple filter fields.

```typescript
function SortPicker({
  value,
  onChange,
  options,
  label,
  labelPosition = 'inline',
  className,
}: SortPickerProps<T>): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .value
- `root0` — .onChange
- `root0` — .options
- `root0` — .label
- `root0` — .labelPosition
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
