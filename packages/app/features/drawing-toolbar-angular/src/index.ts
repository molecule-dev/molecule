/**
 * Angular whiteboard / canvas / annotation tool selector — the counterpart of
 * `@molecule/app-drawing-toolbar-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<DrawingToolbar>` (a `role="toolbar"` row/column of toggle
 * buttons) and the `DrawingTool` type. Selection is controlled: pass
 * `selectedId` + `onSelect`.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { DrawingToolbar } from '@molecule/app-drawing-toolbar-angular'
 *
 * @Component({
 *   selector: 'app-whiteboard',
 *   standalone: true,
 *   imports: [DrawingToolbar],
 *   template: `
 *     <div
 *       mol-drawing-toolbar
 *       [tools]="[
 *         { id: 'select', label: 'Select', icon: '↖' },
 *         { id: 'pen', label: 'Pen', icon: '✎' },
 *         { id: 'rectangle', label: 'Rectangle', icon: '▭' },
 *       ]"
 *       [selectedId]="tool()"
 *       [onSelect]="setTool"
 *       orientation="horizontal"
 *     >
 *       <app-stroke-width slot="extras" />
 *     </div>
 *   `,
 * })
 * export class Whiteboard {
 *   readonly tool = signal('select')
 *   readonly setTool = (id: string): void => this.tool.set(id)
 * }
 * ```
 *
 * @remarks
 * - `tools` defaults to a standard set (select, rectangle, ellipse, arrow,
 *   text, sticky, pen, eraser) — always pass your own list, with `label`
 *   already translated via your `t()` call (labels feed each button's
 *   `aria-label` and `title` verbatim).
 * - The toolbar's own aria-label resolves through `t('drawingToolbar.label')`
 *   with an English fallback; companion locale bond:
 *   `@molecule/app-locales-drawing-toolbar`.
 * - When a tool has no `icon`, the first character of `label` is shown.
 * - `extras` is projected content (`[slot=extras]`), rendered after the tool
 *   buttons — drop in color pickers or stroke-width controls.
 * - Buttons come from `@molecule/app-ui-angular`; requires a wired ClassMap
 *   bond and the app i18n provider (standard molecule app setup).
 *
 * @module
 */

export * from './drawing-toolbar.component.js'
export * from './types.js'
