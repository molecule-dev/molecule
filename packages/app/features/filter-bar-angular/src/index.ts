/**
 * Composable, field-driven Angular filter bar.
 *
 * Exports:
 * - `<div mol-filter-bar>` — data-driven filter row with text, select, multi,
 *   and date-range fields.
 * - `FilterField`, `FilterValues` types for configuring the fields +
 *   storing state.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { FilterBar } from '@molecule/app-filter-bar-angular'
 * import type { FilterField, FilterValues } from '@molecule/app-filter-bar-angular'
 *
 * const fields: FilterField[] = [
 *   { id: 'search', type: 'text', label: 'Search' },
 *   { id: 'status', type: 'select', label: 'Status',
 *     options: [{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }] },
 *   { id: 'created', type: 'date-range', label: 'Created' },
 * ]
 *
 * @Component({
 *   selector: 'app-issue-filters',
 *   standalone: true,
 *   imports: [FilterBar],
 *   template: `<div
 *     mol-filter-bar
 *     [fields]="fields"
 *     [values]="values()"
 *     [onChange]="setValues"
 *     [onClear]="clear"
 *   >
 *     <button slot="actions" type="button">Save view</button>
 *   </div>`,
 * })
 * export class IssueFilters {
 *   readonly fields = fields
 *   readonly values = signal<FilterValues>({})
 *   readonly setValues = (next: FilterValues): void => this.values.set(next)
 *   readonly clear = (): void => this.values.set({})
 * }
 * ```
 *
 * @remarks
 * Fully controlled: every field change calls `onChange` with the FULL
 * updated `FilterValues` map — store it in URL params / app state and
 * pass it back via `values`.
 *
 * `type: 'multi'` currently renders as a comma-separated text input
 * (values are split on commas), not a multi-select control — plan UX
 * accordingly or compose your own control via the `actions` slot.
 *
 * Set `showLabels` to render each field's label above its control
 * (settings-page style); the default is a compact unlabeled toolbar
 * row. Controls are the `Input` / `Select` / `Button` primitives from
 * the `@molecule/app-ui-angular` peer dependency.
 *
 * This is the Angular counterpart of `@molecule/app-filter-bar-react`: the
 * same props and the same DOM for the same input.
 *
 * @module
 */

export * from './filter-bar.component.js'
export * from './types.js'
