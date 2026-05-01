/**
 * `@molecule/app-canvas-engine-react` — vector design-tool canvas
 * engine. Thin domain wrapper on top of
 * `@molecule/app-feature-canvas-react` (peer dep) that adds:
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
 * - `CanvasEngineHandle` — imperative ref API (undo/redo/align/group).
 * - `CanvasDocument`, `VectorElement` (rect/ellipse/line/path/text/group)
 *   and supporting types.
 * - `alignLayers`, `distributeLayers` — pure layer-list transforms.
 * - `combinedBounds`, `elementBounds`, `rectsIntersect`, `snapToGrid`,
 *   `translateElement`, `findElement`, `unionBounds` — geometry helpers.
 * - `HistoryStack`, `DEFAULT_HISTORY_LIMIT` — bounded undo/redo stack.
 *
 * @example
 * ```tsx
 * import { useRef, useState } from 'react'
 * import {
 *   CanvasEngine,
 *   type CanvasDocument,
 *   type CanvasEngineHandle,
 *   type CanvasSelection,
 * } from '@molecule/app-canvas-engine-react'
 *
 * function Editor() {
 *   const ref = useRef<CanvasEngineHandle>(null)
 *   const [doc, setDoc] = useState<CanvasDocument>({
 *     width: 800,
 *     height: 600,
 *     layers: [
 *       { id: 'a', kind: 'rect', x: 40, y: 40, width: 120, height: 80, fill: '#3b82f6' },
 *     ],
 *   })
 *   const [sel, setSel] = useState<CanvasSelection>([])
 *   return (
 *     <CanvasEngine
 *       ref={ref}
 *       document={doc}
 *       onChange={setDoc}
 *       selection={sel}
 *       onSelectionChange={setSel}
 *       snapToGrid
 *       gridSize={8}
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './alignment.js'
export * from './CanvasEngine.js'
export * from './geometry.js'
export * from './history.js'
export * from './types.js'
export * from './VectorElementSvg.js'
