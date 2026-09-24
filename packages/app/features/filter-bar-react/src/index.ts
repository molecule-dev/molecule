/**
 * Composable, field-driven React filter bar.
 *
 * Exports:
 * - `<FilterBar>` — data-driven filter row with text, select, multi, and
 *   date-range fields.
 * - `FilterField`, `FilterValues` types for configuring the fields +
 *   storing state.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { FilterBar, type FilterField, type FilterValues } from '@molecule/app-filter-bar-react'
 *
 * const fields: FilterField[] = [
 *   { id: 'search', type: 'text', label: 'Search' },
 *   { id: 'status', type: 'select', label: 'Status',
 *     options: [{ value: '', label: 'Any status' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }] },
 *   { id: 'created', type: 'date-range', label: 'Created' },
 * ]
 *
 * const issues = [
 *   { id: 1, title: 'Login fails on Safari', status: 'open', created: '2026-03-02' },
 *   { id: 2, title: 'Typo on pricing page', status: 'closed', created: '2026-01-15' },
 * ]
 *
 * export function IssueList() {
 *   const [values, setValues] = useState<FilterValues>({})
 *   const search = typeof values.search === 'string' ? values.search.toLowerCase() : ''
 *   const status = typeof values.status === 'string' ? values.status : ''
 *   const created = (values.created ?? {}) as { from?: string; to?: string }
 *   const visible = issues.filter(
 *     (i) =>
 *       i.title.toLowerCase().includes(search) &&
 *       (!status || i.status === status) &&
 *       (!created.from || i.created >= created.from) &&
 *       (!created.to || i.created <= created.to),
 *   )
 *   return (
 *     <section>
 *       <FilterBar fields={fields} values={values} onChange={setValues} onClear={() => setValues({})} />
 *       <ul>{visible.map((i) => <li key={i.id}>{i.title}</li>)}</ul>
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * Fully controlled: every field change calls `onChange` with the FULL
 * updated `FilterValues` map — store it in URL params / app state and
 * pass it back via `values`. It does NOT filter anything: apply `values` to
 * your data (or send them as query params) yourself. Value shapes: `text` /
 * `select` → `string`, `multi` → `string[]`, `date-range` →
 * `{ from?: string; to?: string }` as `YYYY-MM-DD` strings.
 *
 * `select` fields get NO "any" option: with no value, the browser shows
 * the first option while the filter is actually unset. Put
 * `{ value: '', label: 'Any …' }` first in `options`.
 *
 * It calls `useTranslation()`, so it must render inside `<I18nProvider>` /
 * `<MoleculeProvider>`; `getClassMap()` throws unless
 * `setClassMap(classMap)` from `@molecule/app-ui` ran at startup, and a
 * `select` field's chevron throws unless an icon set is bonded
 * (`setIconSet(iconSet)` from `@molecule/app-icons` +
 * `@molecule/app-icons-molecule`).
 *
 * `type: 'multi'` currently renders as a comma-separated text input
 * (values are split on commas), not a multi-select control — plan UX
 * accordingly or compose your own control via `actions`.
 *
 * Set `showLabels` to render each field's label above its control
 * (settings-page style); the default is a compact unlabeled toolbar
 * row. Controls are the `Input` / `Select` / `Button` primitives from
 * the `@molecule/app-ui-react` peer dependency.
 *
 * @module
 */

export * from './FilterBar.js'
export * from './types.js'
