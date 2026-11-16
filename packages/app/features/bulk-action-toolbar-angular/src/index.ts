/**
 * Angular selection-aware bulk action toolbar — the counterpart of
 * `@molecule/app-bulk-action-toolbar-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports `<BulkActionToolbar>` — the selection count + a row of action
 * buttons + a "Clear selection" link, styled via the ClassMap bond, shown
 * only while rows are selected.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { BulkActionToolbar } from '@molecule/app-bulk-action-toolbar-angular'
 *
 * @Component({
 *   selector: 'app-table',
 *   standalone: true,
 *   imports: [BulkActionToolbar],
 *   template: `
 *     <ng-template #deleteLabel>Delete</ng-template>
 *     <div
 *       mol-bulk-action-toolbar
 *       [count]="selected().length"
 *       [actions]="[
 *         { id: 'delete', label: deleteTpl, onClick: () => handleDelete(selected()), destructive: true },
 *         { id: 'export', label: 'Export', onClick: () => handleExport(selected()) },
 *       ]"
 *       [onClearSelection]="() => selected.set([])"
 *     />
 *   `,
 * })
 * export class Table {}
 * ```
 *
 * @remarks
 * Renders nothing while `count <= 0` — mount it unconditionally and drive
 * it from selection state; the host element detaches from the DOM in that
 * state (React returns null) and is restored when rows are selected again.
 * `position` defaults to `'sticky-bottom'` (16px inset, z-30);
 * `'sticky-top'` and `'inline'` are also supported. Destructive actions
 * render as solid error-colored buttons. The count label, the Clear button
 * and the toolbar's own `aria-label` are translated via `useTranslation()`
 * (React's exact keys and default values) and the companion
 * `@molecule/app-locales-bulk-action-toolbar` locale bond. An action's
 * node-valued fields (`label`, `icon`) are `<ng-template>` refs or plain
 * strings.
 *
 * @module
 */

export * from './bulk-action-toolbar.component.js'
export * from './types.js'
