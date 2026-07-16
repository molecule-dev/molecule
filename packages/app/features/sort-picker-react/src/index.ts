/**
 * React sort-by picker.
 *
 * Exports `<SortPicker>` — single-select wrapper around `<Select>` from
 * `@molecule/app-ui-react` with a conventional "Sort by" label — and the
 * `SortOption` type. Different from `<FilterBar>`, which manages
 * multiple filter fields.
 *
 * Props: `value`, `onChange(value)`, `options` (`{ value, label }[]`),
 * `label`, `labelPosition` (`'inline' | 'above'`, default inline),
 * `className`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { SortPicker } from '@molecule/app-sort-picker-react'
 *
 * function ListToolbar() {
 *   const [sort, setSort] = useState('newest')
 *   return (
 *     <SortPicker
 *       value={sort}
 *       onChange={setSort}
 *       options={[
 *         { value: 'newest', label: 'Newest' },
 *         { value: 'oldest', label: 'Oldest' },
 *         { value: 'popular', label: 'Most Popular' },
 *       ]}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - Option labels are string-coerced before being handed to the native
 *   `<Select>` — pass plain strings, NOT JSX (JSX renders as
 *   "[object Object]").
 * - The default "Sort by" label uses the `sort.label` i18n key; pass
 *   `label` to override.
 *
 * @module
 */

export * from './SortPicker.js'
