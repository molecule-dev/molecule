/**
 * Solid sort-by picker.
 *
 * Exports `SortPicker` — the Solid counterpart of
 * `@molecule/app-sort-picker-react` with the same props and the same DOM:
 * a single-select wrapper around `<Select>` from `@molecule/app-ui-solid`
 * with a conventional "Sort by" label — and the `SortOption` type.
 * Different from `<FilterBar>`, which manages multiple filter fields.
 *
 * Props: `value`, `onChange(value)`, `options` (`{ value, label }[]`),
 * `label`, `ariaLabel`, `labelPosition` (`'inline' | 'above'`, default
 * inline), `className`.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 *
 * import { SortPicker } from '@molecule/app-sort-picker-solid'
 *
 * export function ListToolbar() {
 *   const [sort, setSort] = createSignal('newest')
 *   return (
 *     <SortPicker
 *       value={sort()}
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
 * - `SortOption.label` is a plain `string` — a native `<select>`/`<option>`
 *   can only display text, so it is rendered as the option's text child.
 * - The outer `label` prop is JSX rendered as-is, so icons/styled elements
 *   display as nodes. When it is a non-string node, pass `ariaLabel` to name
 *   the select (a node cannot be an `aria-label`).
 * - The default "Sort by" label uses the `sort.label` i18n key; pass
 *   `label` to override.
 *
 * @module
 */

export * from './SortPicker.jsx'
export * from './types.js'
