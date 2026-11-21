/**
 * Vue whiteboard canvas — pen / marker / eraser / sticky-note /
 * line / arrow / shape / text tools layered on top of
 * `@molecule/app-feature-canvas-vue`.
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
 *   geometry / id helpers (no Vue, no DOM).
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import {
 *   WhiteboardCanvas,
 *   type WhiteboardChange,
 *   type WhiteboardShape,
 *   type WhiteboardStickyNote,
 *   type WhiteboardStroke,
 *   type WhiteboardTool,
 * } from '@molecule/app-whiteboard-canvas-vue'
 *
 * const Demo = defineComponent({
 *   setup() {
 *     const tool = ref<WhiteboardTool>('pen')
 *     const strokes = ref<WhiteboardStroke[]>([])
 *     const shapes = ref<WhiteboardShape[]>([])
 *     const stickyNotes = ref<WhiteboardStickyNote[]>([])
 *     const onChange = (change: WhiteboardChange): void => {
 *       strokes.value = change.strokes
 *       shapes.value = change.shapes
 *       stickyNotes.value = change.stickyNotes
 *     }
 *     return () =>
 *       h(WhiteboardCanvas, {
 *         tool: tool.value,
 *         strokes: strokes.value,
 *         shapes: shapes.value,
 *         stickyNotes: stickyNotes.value,
 *         onChange,
 *         width: 800,
 *         height: 600,
 *       })
 *   },
 * })
 *
 * createApp(Demo).mount('#app')
 * ```
 *
 * @remarks
 * `width` / `height` are REQUIRED CSS-pixel numbers — the surface does not
 * auto-size to its container; measure the container (e.g. a ResizeObserver)
 * for fill layouts. Requires the `@molecule/app-feature-canvas-vue` peer
 * (pan/zoom base). Eraser gestures round-trip through `onChange` as
 * strokes; run `applyEraserStrokes` before persisting if you want erasures
 * baked in. UI strings come from the companion
 * `@molecule/app-locales-whiteboard-canvas` bond. `readOnly` disables all
 * drawing tools but keeps background pan.
 *
 * @module
 */

export * from './strokes.js'
export * from './types.js'
export * from './WhiteboardCanvas.js'
