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
 *
 * import {
 *   CanvasEngine,
 *   type CanvasDocument,
 *   type CanvasEngineHandle,
 *   type CanvasSelection,
 * } from '@molecule/app-canvas-engine-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as canvasEngineLocales from '@molecule/app-locales-canvas-engine'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(canvasEngineLocales)
 *
 * export function Editor() {
 *   const engine = useRef<CanvasEngineHandle>(null)
 *   const [doc, setDoc] = useState<CanvasDocument>({
 *     width: 800,
 *     height: 600,
 *     layers: [
 *       { id: 'card', kind: 'rect', x: 40, y: 40, width: 120, height: 80, fill: '#3b82f6' },
 *       { id: 'dot', kind: 'ellipse', x: 240, y: 200, width: 60, height: 60, fill: '#f97316' },
 *     ],
 *   })
 *   const [selection, setSelection] = useState<CanvasSelection>(['card', 'dot'])
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       <button onClick={() => engine.current?.align('left')}>Align left</button>
 *       <button onClick={() => engine.current?.group()}>Group</button>
 *       <button onClick={() => engine.current?.undo()}>Undo</button>
 *       <CanvasEngine
 *         ref={engine}
 *         document={doc}
 *         onChange={setDoc}
 *         selection={selection}
 *         onSelectionChange={setSelection}
 *         snapToGrid
 *         gridSize={8}
 *       />
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Controlled vs uncontrolled:** passing `onChange` makes `document`
 *   controlled — you MUST store the value it gives you (as above) or every
 *   drag / align / undo is discarded. Same for `selection` +
 *   `onSelectionChange`. Without `onChange` the engine keeps its own copy.
 * - Align / distribute / group act on the CURRENT selection; with nothing
 *   selected they are no-ops (`group` needs 2+, `distribute` 3+). Rect-like
 *   elements (`rect`, `ellipse`, `text`, `group`) use `x`/`y`/`width`/
 *   `height`; `line` uses `x1`/`y1`/`x2`/`y2`; `path` uses `d` plus bounds.
 * - Undo history lives inside the component (default 100 entries): it is
 *   lost on unmount and is not part of `document`. There is no built-in
 *   toolbar, keyboard shortcuts, element creation tool or persistence — the
 *   host renders its own buttons and calls the `ref` handle.
 * - It calls `useTranslation()` from `@molecule/app-react` (throws without an
 *   `I18nProvider` / `MoleculeProvider i18n` above it) and `getClassMap()`
 *   (throws until `setClassMap(...)` ran); `@molecule/app-feature-canvas-react`
 *   is a required peer dependency (pan/zoom surface).
 *
 * @module
 */

export * from './alignment.js'
export * from './CanvasEngine.js'
export * from './geometry.js'
export * from './history.js'
export * from './types.js'
export * from './VectorElementSvg.js'
