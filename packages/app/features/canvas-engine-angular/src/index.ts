/**
 * `@molecule/app-canvas-engine-angular` — vector design-tool canvas
 * engine. Thin domain wrapper on top of
 * `@molecule/app-feature-canvas-angular` (peer dep) that adds:
 *
 * - Vector primitives — `rect`, `ellipse`, `line`, `path`, `text`, `group`
 * - Style fields — fill, stroke, opacity, blend mode
 * - Multi-select — marquee selector + shift/meta/ctrl additive click
 * - Alignment — `align('left' | 'center' | 'right' | 'top' | 'middle' | 'bottom')`
 * - Distribution — `distribute('horizontal' | 'vertical')`
 * - Grouping — `group()` / `ungroup()`
 * - Snap-to-grid — pointer-coords are snapped to `gridSize` (default 8)
 * - Undo/redo — bounded stack (default 100 entries)
 *
 * The engine never re-implements pan/zoom — that lives in the
 * `<CanvasSurface>` base.
 *
 * Exports:
 * - `<CanvasEngine>` (`div[mol-canvas-engine]`) — main component + its inputs.
 * - `<VectorElementSvg>` (`g[mol-vector-element-svg]`) — pure-presentational
 *   SVG renderer.
 * - `CanvasEngineHandle` — imperative API (undo/redo/align/group); on this
 *   component it is the instance `@ViewChild` hands back.
 * - `CanvasDocument`, `VectorElement` (rect/ellipse/line/path/text/group)
 *   and supporting types.
 * - `alignLayers`, `distributeLayers` — pure layer-list transforms.
 * - `combinedBounds`, `elementBounds`, `rectsIntersect`, `snapToGrid`,
 *   `translateElement`, `findElement`, `unionBounds` — geometry helpers.
 * - `HistoryStack`, `DEFAULT_HISTORY_LIMIT` — bounded undo/redo stack.
 *
 * @example
 * ```ts
 * import { Component, signal, viewChild } from '@angular/core'
 * import {
 *   CanvasEngine,
 *   type CanvasDocument,
 *   type CanvasSelection,
 * } from '@molecule/app-canvas-engine-angular'
 *
 * @Component({
 *   selector: 'app-editor',
 *   standalone: true,
 *   imports: [CanvasEngine],
 *   template: `
 *     <div
 *       mol-canvas-engine
 *       [document]="doc()"
 *       [onChange]="setDoc"
 *       [selection]="selection()"
 *       [onSelectionChange]="setSelection"
 *       [snapToGrid]="true"
 *       [gridSize]="8"
 *     ></div>
 *   `,
 * })
 * export class Editor {
 *   readonly engine = viewChild(CanvasEngine)
 *   readonly doc = signal<CanvasDocument>({
 *     width: 800,
 *     height: 600,
 *     layers: [
 *       { id: 'a', kind: 'rect', x: 40, y: 40, width: 120, height: 80, fill: '#3b82f6' },
 *     ],
 *   })
 *   readonly selection = signal<CanvasSelection>([])
 *   setDoc = (next: CanvasDocument): void => this.doc.set(next)
 *   setSelection = (next: CanvasSelection): void => this.selection.set(next)
 * }
 * ```
 *
 * @module
 */

export * from './alignment.js'
export * from './canvas-engine.component.js'
export * from './geometry.js'
export * from './history.js'
export * from './types.js'
export * from './vector-element-svg.component.js'
