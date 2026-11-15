/**
 * Angular generic list-item row.
 *
 * Exports `<ListItemRow>` — leading slot (icon/avatar/thumbnail) + up to three
 * text lines (title / subtitle / metadata) + right-side actions. Inputs: `title`,
 * `subtitle?`, `metadata?`, `leading?`, `actions?`, `onClick?`, `selected?`,
 * `disabled?`, `density?` (`'comfortable'` default | `'compact'`), `className?`.
 * Use for nav lists, mobile menus, search results, picker dialogs, inbox threads.
 * For table rows use `<RowWithActions>` from `@molecule/app-data-table-ui-angular`
 * instead — this component is not a `<tr>`. It is the Angular counterpart of
 * `@molecule/app-list-item-row-react`: same inputs and the same DOM for the same
 * input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ListItemRow } from '@molecule/app-list-item-row-angular'
 *
 * @Component({
 *   selector: 'project-list',
 *   standalone: true,
 *   imports: [ListItemRow],
 *   template: `
 *     <div mol-list-item-row
 *       title="Project Alpha"
 *       subtitle="Last edited 2 hours ago"
 *       metadata="3 collaborators · 12 files"
 *       [selected]="true"
 *       (click)="navigate('/projects/alpha')">
 *       <img slot="leading" src="/icons/folder.svg" alt="" width="32" height="32" />
 *     </div>
 *   `,
 * })
 * export class ProjectList {}
 * ```
 *
 * @remarks
 * - `selected` only sets the `aria-selected` attribute — no built-in highlight.
 *   Pass a highlight class via `className` (or target `[aria-selected="true"]` in
 *   host CSS) to make selection visible.
 * - Clicks inside the actions slot are stopPropagation'd automatically, so action
 *   buttons never trigger the row `onClick`.
 * - `disabled` halves the opacity and disables `onClick`; there is no
 *   `data-mol-id` input.
 * - Styling resolves through `getClassMap()` — wire a ClassMap bond first.
 * - The host element IS React's root `<div>` (`div[mol-list-item-row]`); node
 *   props are projected slots (`[slot=title]`, `[slot=leading]`, …), and string
 *   inputs render as text.
 *
 * @module
 */

export * from './list-item-row.component.js'
export * from './types.js'
