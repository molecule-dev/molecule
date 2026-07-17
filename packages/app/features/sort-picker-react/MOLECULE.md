# @molecule/app-sort-picker-react

React sort-by picker.

Exports `<SortPicker>` — single-select wrapper around `<Select>` from
`@molecule/app-ui-react` with a conventional "Sort by" label — and the
`SortOption` type. Different from `<FilterBar>`, which manages
multiple filter fields.

Props: `value`, `onChange(value)`, `options` (`{ value, label }[]`),
`label`, `ariaLabel`, `labelPosition` (`'inline' | 'above'`, default
inline), `className`.

## Quick Start

```tsx
import { useState } from 'react'

import { SortPicker } from '@molecule/app-sort-picker-react'

function ListToolbar() {
  const [sort, setSort] = useState('newest')
  return (
    <SortPicker
      value={sort}
      onChange={setSort}
      options={[
        { value: 'newest', label: 'Newest' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'popular', label: 'Most Popular' },
      ]}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-sort-picker-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SortOption`

A single option entry for the SortPicker select list.

```typescript
interface SortOption<T extends string = string> {
  value: T
  /**
   * Option label. A native `<select>`/`<option>` can only display text,
   * so this is a plain `string` — it is rendered as the option's text
   * child (never `String()`-coerced). For a rich label above/beside the
   * control, use the {@link SortPickerProps.label} prop, which accepts a
   * `ReactNode`.
   */
  label: string
}
```

#### `SortPickerProps`

Props for the {@link SortPicker} component.

```typescript
interface SortPickerProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: SortOption<T>[]
  /**
   * Optional label rendered above or to the left of the select. Rendered
   * as JSX children, so a `ReactNode` (icon + text, styled element, …)
   * displays as nodes — it is never stringified. When you pass a
   * non-string node, also pass {@link SortPickerProps.ariaLabel} to give
   * the select an accessible name.
   */
  label?: ReactNode
  /**
   * Accessible name for the underlying `<select>`. Defaults to `label`
   * when it is a plain string, otherwise the translated "Sort by". Pass
   * this whenever `label` is a non-string `ReactNode` (a node cannot be
   * used as an `aria-label` attribute value).
   */
  ariaLabel?: string
  /** Where to render the label. Defaults to `'inline'`. */
  labelPosition?: 'inline' | 'above'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `SortPicker(props)`

Standalone sort-by selector. Thin wrapper around `<Select>` with a
conventional "Sort by:" label and a focused single-select API.

Different from `<FilterBar>` which manages multiple filter fields.

```typescript
function SortPicker({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  labelPosition = 'inline',
  className,
}: SortPickerProps<T>): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link SortPickerProps}).

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

- Must render inside the app's i18n provider and with a ClassMap bond
  wired (`useTranslation()` / `getClassMap()` throw otherwise).
- `SortOption.label` is a plain `string` — a native `<select>`/`<option>`
  can only display text, so it is rendered as the option's text child
  (never `String()`-coerced, so it never renders "[object Object]").
- The outer `label` prop is a `ReactNode` rendered as JSX children, so
  icons/styled elements display as nodes. When `label` is a non-string
  node, pass `ariaLabel` to name the select (a node cannot be an
  `aria-label`).
- The default "Sort by" label uses the `sort.label` i18n key; pass
  `label` to override.

## Translations

Translation strings are provided by `@molecule/app-locales-sort-picker`.
