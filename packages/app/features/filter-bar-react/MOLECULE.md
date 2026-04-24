# @molecule/app-filter-bar-react

Composable, field-driven React filter bar.

Exports:
- `<FilterBar>` — data-driven filter row with text, select, multi, and date-range fields.
- `FilterField`, `FilterValues` types for configuring the fields + storing state.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-filter-bar-react
```

## API

### Interfaces

#### `FilterFieldBase`

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

```typescript
interface FilterFieldDateRange extends FilterFieldBase {
  type: 'date-range'
}
```

#### `FilterFieldMulti`

```typescript
interface FilterFieldMulti extends FilterFieldBase {
  type: 'multi'
  options: Array<{ value: string; label: string }>
}
```

#### `FilterFieldSelect`

```typescript
interface FilterFieldSelect extends FilterFieldBase {
  type: 'select'
  options: Array<{ value: string; label: string }>
}
```

#### `FilterFieldText`

```typescript
interface FilterFieldText extends FilterFieldBase {
  type: 'text'
}
```

### Types

#### `FilterField`

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
