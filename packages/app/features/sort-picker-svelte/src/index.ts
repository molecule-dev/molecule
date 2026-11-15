/**
 * Svelte sort-by picker — the Svelte counterpart of
 * `@molecule/app-sort-picker-react`, with the same props and the same DOM.
 *
 * Exports `SortPicker` — a single-select wrapper around `<Select>` from
 * `@molecule/app-ui-svelte` with a conventional "Sort by" label — and the
 * `SortOption` type. Different from `<FilterBar>`, which manages multiple
 * filter fields.
 *
 * Props: `value`, `onChange(value)`, `options` (`{ value, label }[]`),
 * `label`, `ariaLabel`, `labelPosition` (`'inline' | 'above'`, default
 * inline), `className`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { SortPicker } from '@molecule/app-sort-picker-svelte'
 *
 *   let sort = $state('newest')
 *   const options = [
 *     { value: 'newest', label: 'Newest' },
 *     { value: 'oldest', label: 'Oldest' },
 *     { value: 'popular', label: 'Most Popular' },
 *   ]
 * </script>
 *
 * <SortPicker {options} value={sort} onChange={(value) => (sort = value)} />
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - `SortOption.label` is a plain `string` — a native `<select>`/`<option>`
 *   can only display text, so it is rendered as the option's text child.
 * - The outer `label` prop is a snippet when it is a node, so icons/styled
 *   elements display as nodes; a plain string renders as text. When it is a
 *   node, pass `ariaLabel` to name the select (a node cannot be an
 *   `aria-label`).
 * - The default "Sort by" label uses the `sort.label` i18n key; pass
 *   `label` to override.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
