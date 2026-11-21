/**
 * `@molecule/app-canvas-engine-svelte` — vector design-tool canvas
 * engine. Thin domain wrapper on top of
 * `@molecule/app-feature-canvas-svelte` (peer dep) that adds:
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
 * - `<CanvasEngine>` — main component + `CanvasEngineProps`.
 * - `<VectorElementSvg>` — pure-presentational SVG renderer.
 * - `CanvasEngineHandle` — imperative API (undo/redo/align/group); it is the
 *   component instance `bind:this` binds, whose exported functions are `undo`,
 *   `redo`, `canUndo`, `canRedo`, `align`, `distribute`, `group`, `ungroup`.
 * - `CanvasDocument`, `VectorElement` (rect/ellipse/line/path/text/group)
 *   and supporting types.
 * - `alignLayers`, `distributeLayers` — pure layer-list transforms.
 * - `combinedBounds`, `elementBounds`, `rectsIntersect`, `snapToGrid`,
 *   `translateElement`, `findElement`, `unionBounds` — geometry helpers.
 * - `HistoryStack`, `DEFAULT_HISTORY_LIMIT` — bounded undo/redo stack.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import {
 *     CanvasEngine,
 *     type CanvasDocument,
 *     type CanvasEngineHandle,
 *     type CanvasSelection,
 *   } from '@molecule/app-canvas-engine-svelte'
 *
 *   let engine: CanvasEngineHandle
 *   let doc = $state<CanvasDocument>({
 *     width: 800,
 *     height: 600,
 *     layers: [
 *       { id: 'a', kind: 'rect', x: 40, y: 40, width: 120, height: 80, fill: '#3b82f6' },
 *     ],
 *   })
 *   let selection = $state<CanvasSelection>([])
 * </script>
 *
 * <CanvasEngine
 *   bind:this={engine}
 *   document={doc}
 *   onChange={(next) => (doc = next)}
 *   selection={selection}
 *   onSelectionChange={(next) => (selection = next)}
 *   snapToGrid
 *   gridSize={8}
 * />
 * ```
 *
 * @module
 */

export * from './alignment.js'
export * from './components.js'
export * from './geometry.js'
export * from './history.js'
export * from './types.js'
