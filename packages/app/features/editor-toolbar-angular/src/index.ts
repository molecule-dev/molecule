/**
 * Angular editor-top toolbar — the counterpart of
 * `@molecule/app-editor-toolbar-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * Exports `<EditorToolbar>` — title + badge + primary/secondary action groups —
 * and the `ToolbarAction` shape. Pair it with the editor layout's `topBar`
 * slot.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-angular'
 *
 * @Component({
 *   selector: 'app-editor',
 *   standalone: true,
 *   imports: [EditorToolbar],
 *   template: `
 *     <div
 *       mol-editor-toolbar
 *       [primaryActions]="[
 *         { id: 'save', label: 'Save', onClick: save, variant: 'outline' },
 *         { id: 'publish', label: 'Publish', onClick: publish, color: 'primary' },
 *       ]"
 *     >
 *       <span slot="title">My Blog Post</span>
 *       <span slot="badge">Draft</span>
 *     </div>
 *   `,
 * })
 * export class EditorPage {
 *   readonly save = (): void => {
 *     console.log('save draft')
 *   }
 *
 *   readonly publish = (): void => {
 *     console.log('publish post')
 *   }
 * }
 * ```
 *
 * @remarks
 * - `sticky` defaults to TRUE and applies `position: sticky; top: 0` with a
 *   TRANSPARENT background — pass a surface class via `className` or page
 *   content will scroll visibly through the toolbar.
 * - Action `label`s render verbatim (into the button and nothing else) — pass
 *   already-translated strings; the component has no `t()` calls or locale
 *   bond of its own.
 * - Prefer `onClick` over `href`: an `href` action wraps the button in a plain
 *   anchor (full page navigation, and invalid button-in-anchor nesting for
 *   assistive tech).
 * - A 1px divider renders between the primary and secondary groups only when
 *   both are non-empty.
 * - Node props are projected content: `title`, `badge` and `leading` are
 *   selected by `[slot=title]`, `[slot=badge]` and `[slot=leading]`.
 * - Buttons come from `@molecule/app-ui-angular`; requires a wired ClassMap
 *   bond (standard molecule app setup).
 *
 * @module
 */

export * from './editor-toolbar.component.js'
export * from './types.js'
