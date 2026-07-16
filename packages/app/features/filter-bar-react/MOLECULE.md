# @molecule/app-filter-bar-react

Composable, field-driven React filter bar.

Exports:
- `<FilterBar>` — data-driven filter row with text, select, multi, and
  date-range fields.
- `FilterField`, `FilterValues` types for configuring the fields +
  storing state.

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

function IssueFilters() {
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
npm install @molecule/app-filter-bar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `FilterBarProps`

```typescript
interface FilterBarProps {
  /** Field definitions. */
  fields: FilterField[]
  /** Current filter values keyed by field id. */
  values: FilterValues
  /** Called on any individual field change. */
  onChange: (next: FilterValues) => void
  /** Optional "Clear all" handler — renders a clear button when provided. */
  onClear?: () => void
  /** Extra right-side actions (e.g. "Add filter", "Save view"). */
  actions?: ReactNode
  /**
   * When `true`, renders each field's `label` above its input as a
   * 10px-uppercase-tracking-widest label (matching the polished flagship
   * apps' settings/filter sections). Default `false` keeps the original
   * unlabeled inline-row layout used by simple toolbar consumers.
   */
  showLabels?: boolean
  /** Extra classes. */
  className?: string
}
```

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

#### `FilterBar(props)`

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

- `props` — Component props (see {@link FilterBarProps}).

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

Fully controlled: every field change calls `onChange` with the FULL
updated `FilterValues` map — store it in URL params / app state and
pass it back via `values`.

`type: 'multi'` currently renders as a comma-separated text input
(values are split on commas), not a multi-select control — plan UX
accordingly or compose your own control via `actions`.

Set `showLabels` to render each field's label above its control
(settings-page style); the default is a compact unlabeled toolbar
row. Controls are the `Input` / `Select` / `Button` primitives from
the `@molecule/app-ui-react` peer dependency.

## Translations

Translation strings are provided by `@molecule/app-locales-filter-bar`.
