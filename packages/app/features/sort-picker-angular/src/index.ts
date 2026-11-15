/**
 * Angular sort-by picker — the counterpart of `@molecule/app-sort-picker-react`:
 * the same props and the same DOM for the same input.
 *
 * Exports `<SortPicker>` — a single-select wrapper around `<Select>` from
 * `@molecule/app-ui-angular` with a conventional "Sort by" label — and the
 * `SortOption` type. Different from `<FilterBar>`, which manages multiple
 * filter fields.
 *
 * Props: `value`, `onChange(value)`, `options` (`{ value, label }[]`),
 * `label`, `ariaLabel`, `labelPosition` (`'inline' | 'above'`, default
 * inline), `className`.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { SortPicker } from '@molecule/app-sort-picker-angular'
 *
 * @Component({
 *   selector: 'app-list-toolbar',
 *   standalone: true,
 *   imports: [SortPicker],
 *   template: `
 *     <div
 *       mol-sort-picker
 *       [value]="sort()"
 *       [options]="options"
 *       [onChange]="setSort"
 *     ></div>
 *   `,
 * })
 * export class ListToolbar {
 *   sort = signal('newest')
 *   options = [
 *     { value: 'newest', label: 'Newest' },
 *     { value: 'oldest', label: 'Oldest' },
 *     { value: 'popular', label: 'Most Popular' },
 *   ]
 *   setSort = (value: string): void => this.sort.set(value)
 * }
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - `SortOption.label` is a plain `string` — a native `<select>`/`<option>`
 *   can only display text, so it is rendered as the option's text child.
 * - The outer `label` prop is a string input, or projected content selected
 *   by `[slot=label]` when it is a node, so icons/styled elements display as
 *   nodes. When it is a node, pass `ariaLabel` to name the select (a node
 *   cannot be an `aria-label`).
 * - The default "Sort by" label uses the `sort.label` i18n key; pass
 *   `label` to override.
 *
 * @module
 */

export * from './sort-picker.component.js'
export * from './types.js'
