/**
 * Composable, field-driven Vue filter bar.
 *
 * Exports:
 * - `<FilterBar>` — data-driven filter row with text, select, multi, and
 *   date-range fields.
 * - `FilterField`, `FilterValues` types for configuring the fields +
 *   storing state.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { FilterBar } from '@molecule/app-filter-bar-vue'
 * import type { FilterField, FilterValues } from '@molecule/app-filter-bar-vue'
 *
 * const fields: FilterField[] = [
 *   { id: 'search', type: 'text', label: 'Search' },
 *   { id: 'status', type: 'select', label: 'Status',
 *     options: [{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }] },
 *   { id: 'created', type: 'date-range', label: 'Created' },
 * ]
 *
 * const IssueFilters = defineComponent({
 *   setup() {
 *     const values = ref<FilterValues>({})
 *     return () =>
 *       h(FilterBar, {
 *         fields,
 *         values: values.value,
 *         onChange: (next: FilterValues) => (values.value = next),
 *         onClear: () => (values.value = {}),
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * Fully controlled: every field change calls `onChange` with the FULL
 * updated `FilterValues` map — store it in URL params / app state and
 * pass it back via `values`.
 *
 * `type: 'multi'` currently renders as a comma-separated text input
 * (values are split on commas), not a multi-select control — plan UX
 * accordingly or compose your own control via `actions`.
 *
 * Set `showLabels` to render each field's label above its control
 * (settings-page style); the default is a compact unlabeled toolbar
 * row. Controls are the `Input` / `Select` / `Button` primitives from
 * the `@molecule/app-ui-vue` peer dependency.
 *
 * This is the Vue counterpart of `@molecule/app-filter-bar-react`: the same
 * props and the same DOM for the same input.
 *
 * @module
 */

export * from './FilterBar.js'
export * from './types.js'
