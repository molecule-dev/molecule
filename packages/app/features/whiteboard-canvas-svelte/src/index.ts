/**
 * Svelte whiteboard canvas — pen / marker / eraser / sticky-note /
 * line / arrow / shape / text tools layered on top of
 * `@molecule/app-feature-canvas-svelte`.
 *
 * Pan + zoom infrastructure is delegated to `<CanvasSurface>` from
 * the base — this package contributes only the whiteboard-specific
 * tools, geometry helpers, and element types (free-form strokes,
 * vector shapes, sticky notes / text boxes).
 *
 * Exports:
 * - `<WhiteboardCanvas>` — controlled canvas component. Accepts
 *   `strokes`, `shapes`, `stickyNotes`, `tool`, and an `onChange`
 *   callback fired at the end of every gesture.
 * - `WhiteboardSnapshot`, `WhiteboardStroke`, `WhiteboardShape`,
 *   `WhiteboardStickyNote`, `WhiteboardTool` types describing the
 *   board's element model.
 * - `buildStrokePath`, `buildShapePath`, `shapeBounds`,
 *   `applyEraserStrokes`, `strokeIntersectsPath`, `segmentsIntersect`,
 *   `defaultStrokeColor`, `defaultStrokeWidth`, `defaultShapeStyle`,
 *   `defaultStickyNoteStyle`, `generateWhiteboardId` — pure
 *   geometry / id helpers (no Svelte, no DOM).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import {
 *     WhiteboardCanvas,
 *     type WhiteboardChange,
 *     type WhiteboardShape,
 *     type WhiteboardStickyNote,
 *     type WhiteboardStroke,
 *   } from '@molecule/app-whiteboard-canvas-svelte'
 *
 *   let tool = $state<'pen' | 'marker' | 'eraser'>('pen')
 *   let strokes = $state<WhiteboardStroke[]>([])
 *   let shapes = $state<WhiteboardShape[]>([])
 *   let stickyNotes = $state<WhiteboardStickyNote[]>([])
 *   function onChange(change: WhiteboardChange): void {
 *     strokes = change.strokes
 *     shapes = change.shapes
 *     stickyNotes = change.stickyNotes
 *   }
 * </script>
 *
 * <WhiteboardCanvas
 *   {tool}
 *   {strokes}
 *   {shapes}
 *   {stickyNotes}
 *   {onChange}
 *   width={800}
 *   height={600}
 * />
 * ```
 *
 * @remarks
 * `width` / `height` are REQUIRED CSS-pixel numbers — the surface does not
 * auto-size to its container; measure the container (e.g. a ResizeObserver)
 * for fill layouts. Requires the `@molecule/app-feature-canvas-svelte` peer
 * (pan/zoom base). Eraser gestures round-trip through `onChange` as
 * strokes; run `applyEraserStrokes` before persisting if you want erasures
 * baked in. UI strings come from the companion
 * `@molecule/app-locales-whiteboard-canvas` bond. `readOnly` disables all
 * drawing tools but keeps background pan.
 *
 * @module
 */

export * from './components.js'
export * from './strokes.js'
export * from './types.js'
