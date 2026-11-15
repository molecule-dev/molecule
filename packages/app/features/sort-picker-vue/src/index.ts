/**
 * Vue sort-by picker.
 *
 * Exports `<SortPicker>` — single-select wrapper around `<Select>` from
 * `@molecule/app-ui-vue` with a conventional "Sort by" label — and the
 * `SortOption` type. Different from `<FilterBar>`, which manages multiple
 * filter fields. It is the Vue counterpart of
 * `@molecule/app-sort-picker-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * Props: `value`, `onChange(value)`, `options` (`{ value, label }[]`),
 * `label`, `ariaLabel`, `labelPosition` (`'inline' | 'above'`, default
 * inline), `className`.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 *
 * import { SortPicker } from '@molecule/app-sort-picker-vue'
 *
 * const ListToolbar = defineComponent({
 *   setup() {
 *     const sort = ref('newest')
 *     return () =>
 *       h(SortPicker, {
 *         value: sort.value,
 *         onChange: (value: string) => {
 *           sort.value = value
 *         },
 *         options: [
 *           { value: 'newest', label: 'Newest' },
 *           { value: 'oldest', label: 'Oldest' },
 *           { value: 'popular', label: 'Most Popular' },
 *         ],
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - `SortOption.label` is a plain `string` — a native `<select>`/`<option>`
 *   can only display text, so it is rendered as the option's text child.
 * - The outer `label` prop is a node rendered as-is, so icons/styled
 *   elements display as nodes. It arrives as a prop or as the same-named
 *   slot; both work. When `label` is a non-string node, pass `ariaLabel` to
 *   name the select (a node cannot be an `aria-label`).
 * - The default "Sort by" label uses the `sort.label` i18n key; pass
 *   `label` to override.
 *
 * @module
 */

export * from './SortPicker.js'
export * from './types.js'
