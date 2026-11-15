/**
 * Angular editor layout scaffold.
 *
 * Exports `EditorLayout` — sticky top bar + main canvas + optional side
 * panel. It is the Angular counterpart of `@molecule/app-editor-layout-react`:
 * the same props (React names) and the same DOM for the same input. Used for
 * blog post editors, product editors, bot flow editors, etc.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { EditorLayout } from '@molecule/app-editor-layout-angular'
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-angular'
 * import { ArticleEditor } from './article-editor.component'
 * import { MetadataPanel } from './metadata-panel.component'
 *
 * @Component({
 *   selector: 'app-editor',
 *   standalone: true,
 *   imports: [EditorLayout, EditorToolbar, ArticleEditor, MetadataPanel],
 *   template: `
 *     <div mol-editor-layout [sidePanelOpen]="true">
 *       <app-editor-toolbar slot="topBar" title="Untitled post" />
 *       <app-article-editor slot="canvas" />
 *       <app-metadata-panel slot="sidePanel" />
 *     </div>
 *   `,
 * })
 * export class Editor {}
 * ```
 *
 * @remarks
 * - The scaffold claims the FULL viewport height (h-screen flex column).
 *   Render it as the page root; nesting it below another fixed-height app
 *   shell produces double scrollbars.
 * - The side panel container sets flex-shrink 0 but NO width — your
 *   `sidePanel` content must define its own width.
 * - `topBar` is wrapped in a sticky container by the layout itself (unlike
 *   `<DetailPageLayout>`); the slot does not need its own stickiness, but
 *   should bring a surface background.
 * - The node props are projected content: `topBar` and `canvas` are selected
 *   by `[slot=topBar]` / `[slot=canvas]`, the side panel by
 *   `[slot=sidePanel]`.
 * - `ArticleEditor` and `MetadataPanel` above are your own components.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup). No text of its own.
 *
 * @module
 */

export * from './editor-layout.component.js'
export * from './types.js'
