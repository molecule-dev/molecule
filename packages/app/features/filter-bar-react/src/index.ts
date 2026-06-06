/**
 * Composable, field-driven React filter bar.
 *
 * Exports:
 * - `<FilterBar>` — data-driven filter row with text, select, multi, and date-range fields.
 * - `FilterField`, `FilterValues` types for configuring the fields + storing state.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { FilterBar } from '@molecule/app-filter-bar-react'
 * import type { FilterField, FilterValues } from '@molecule/app-filter-bar-react'
 *
 * const fields: FilterField[] = [
 *   { id: 'search', type: 'text', label: 'Search' },
 *   { id: 'status', type: 'select', label: 'Status',
 *     options: [{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }] },
 *   { id: 'created', type: 'date-range', label: 'Created' },
 * ]
 *
 * export function IssueFilters() {
 *   const [values, setValues] = useState<FilterValues>({})
 *   return (
 *     <FilterBar fields={fields} values={values} onChange={setValues} onClear={() => setValues({})} />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './FilterBar.js'
export * from './types.js'
