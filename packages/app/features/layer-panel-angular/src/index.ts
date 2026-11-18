/**
 * Angular Photoshop / Figma–style reorderable layer panel.
 *
 * Exports:
 * - `<LayerPanel>` (`ul[mol-layer-panel]`) — the panel component
 *   (drag-to-reorder via pointer events, visibility / lock toggles,
 *   double-click inline rename, click-to-select, optional thumbnail +
 *   opacity + blend-mode metadata).
 * - Types: `LayerPanelProps`, `Layer`, `LayerBlendMode`.
 * - Helpers: `moveLayer()`, `formatOpacityPercent()`.
 *
 * It is the Angular counterpart of `@molecule/app-layer-panel-react`: the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input. The host element IS React's root `<ul>`, so an app places it on a
 * `<ul>` in its template.
 *
 * The panel is fully controlled — the host application owns the `Layer[]`
 * array and re-renders with the next state in response to the `onReorder` /
 * `onVisibilityToggle` / `onLockToggle` / `onSelect` / `onRename` inputs.
 *
 * Layers are rendered top-down per Photoshop convention: index 0 is the first
 * row in the UI and represents the front-most layer.
 *
 * Toggle/rename labels route through `t()` — add the companion
 * `@molecule/app-locales-layer-panel` bond to translate them. Locked layers
 * cannot be dragged or renamed. The eye / lock toggles render emoji glyphs.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { LayerPanel, type Layer } from '@molecule/app-layer-panel-angular'
 *
 * @Component({
 *   selector: 'app-editor',
 *   standalone: true,
 *   imports: [LayerPanel],
 *   template: `
 *     <ul
 *       mol-layer-panel
 *       [layers]="layers()"
 *       [activeId]="activeId()"
 *       [onReorder]="setLayers"
 *       [onVisibilityToggle]="toggleVisibility"
 *       [onLockToggle]="toggleLock"
 *       [onSelect]="select"
 *       [onRename]="rename"
 *     ></ul>
 *   `,
 * })
 * export class Editor {
 *   readonly layers = signal<Layer[]>([
 *     { id: 'bg', name: 'Background', visible: true, locked: false },
 *     { id: 'fg', name: 'Sketch', visible: true, locked: false, opacity: 0.8 },
 *   ])
 *   readonly activeId = signal<string | undefined>(undefined)
 *
 *   readonly setLayers = (next: Layer[]): void => this.layers.set(next)
 *   readonly select = (id: string): void => this.activeId.set(id)
 *   readonly rename = (id: string, name: string): void => {
 *     this.layers.update((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)))
 *   }
 *   private patch(id: string, next: Partial<Layer>): void {
 *     this.layers.update((ls) => ls.map((l) => (l.id === id ? { ...l, ...next } : l)))
 *   }
 *   readonly toggleVisibility = (id: string): void => {
 *     this.patch(id, { visible: !this.layers().find((l) => l.id === id)?.visible })
 *   }
 *   readonly toggleLock = (id: string): void => {
 *     this.patch(id, { locked: !this.layers().find((l) => l.id === id)?.locked })
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond and `@molecule/app-angular`'s i18n provider
 *   above it — `getClassMap()` and `useTranslation()` both throw before
 *   wiring. Pair with `@molecule/app-locales-layer-panel` for the toggle /
 *   rename strings in 79 languages.
 * - The rename field commits on Enter or blur, and cancels on Escape. An
 *   empty or unchanged trimmed name is not reported.
 * - Locked layers cannot be dragged or renamed; their eye / lock toggles
 *   still work.
 *
 * @module
 */

export * from './layer-panel.component.js'
export * from './types.js'
export * from './utilities.js'
