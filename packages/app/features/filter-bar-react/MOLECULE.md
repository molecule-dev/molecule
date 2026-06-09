# @molecule/app-filter-bar-react

Composable, field-driven React filter bar.

Exports:
- `<FilterBar>` — data-driven filter row with text, select, multi, and date-range fields.
- `FilterField`, `FilterValues` types for configuring the fields + storing state.

## Quick Start

```tsx
import { useState } from 'react'
import { FilterBar } from '@molecule/app-filter-bar-react'
import type { FilterField, FilterValues } from '@molecule/app-filter-bar-react'

const fields: FilterField[] = [
  { id: 'search', type: 'text', label: 'Search' },
  { id: 'status', type: 'select', label: 'Status',
    options: [{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }] },
  { id: 'created', type: 'date-range', label: 'Created' },
]

export function IssueFilters() {
  const [values, setValues] = useState<FilterValues>({})
  return (
    <FilterBar fields={fields} values={values} onChange={setValues} onClear={() => setValues({})} />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-filter-bar-react
```

## API

### Interfaces

#### `FilterFieldBase`

Common properties shared by every filter field variant.

```typescript
interface FilterFieldBase {
  /** Unique field id — used as the state key. */
  id: string
  /** Display label (usually `t('...')`). */
  label: string
  /** Optional placeholder inside the control. */
  placeholder?: string
}
```

#### `FilterFieldDateRange`

A date-range filter field with optional from/to bounds.

```typescript
interface FilterFieldDateRange extends FilterFieldBase {
  type: 'date-range'
}
```

#### `FilterFieldMulti`

A multi-select filter field allowing multiple chosen values.

```typescript
interface FilterFieldMulti extends FilterFieldBase {
  type: 'multi'
  options: Array<{ value: string; label: string }>
}
```

#### `FilterFieldSelect`

A single-value dropdown select filter field.

```typescript
interface FilterFieldSelect extends FilterFieldBase {
  type: 'select'
  options: Array<{ value: string; label: string }>
}
```

#### `FilterFieldText`

A free-text input filter field.

```typescript
interface FilterFieldText extends FilterFieldBase {
  type: 'text'
}
```

### Types

#### `FilterField`

Discriminated union of all supported filter field types.

```typescript
type FilterField =
  | FilterFieldText
  | FilterFieldSelect
  | FilterFieldMulti
  | FilterFieldDateRange
```

#### `FilterValues`

Flat value map keyed by field id.

```typescript
type FilterValues = Record<
  string,
  string | string[] | { from?: string; to?: string } | undefined
>
```

### Functions

#### `FilterBar(root0, root0, root0, root0, root0, root0, root0)`

Data-driven filter bar. Renders one control per field in `fields`,
emits a full updated values map on each change so parents can store
filters in URL params, zustand, etc. Multi-select uses a comma-joined
`<Input>` fallback since multi-select UI isn't in the primitives yet.

```typescript
function FilterBar({
  fields,
  values,
  onChange,
  onClear,
  actions,
  showLabels = false,
  className,
}: FilterBarProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .fields
- `root0` — .values
- `root0` — .onChange
- `root0` — .onClear
- `root0` — .actions
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
