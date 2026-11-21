/**
 * Angular whiteboard canvas — pen / marker / eraser / sticky-note /
 * line / arrow / shape / text tools layered on top of
 * `@molecule/app-feature-canvas-angular`.
 *
 * Pan + zoom infrastructure is the same pan/zoom base the Vue, Solid and
 * Svelte counterparts use — this package contributes only the
 * whiteboard-specific tools, geometry helpers, and element types (free-form
 * strokes, vector shapes, sticky notes / text boxes).
 *
 * Exports:
 * - `<WhiteboardCanvas>` (`div[mol-whiteboard-canvas]`) — controlled canvas
 *   component. Accepts `strokes`, `shapes`, `stickyNotes`, `tool`, and an
 *   `onChange` callback fired at the end of every gesture.
 * - `WhiteboardSnapshot`, `WhiteboardStroke`, `WhiteboardShape`,
 *   `WhiteboardStickyNote`, `WhiteboardTool` types describing the
 *   board's element model.
 * - `buildStrokePath`, `buildShapePath`, `shapeBounds`,
 *   `applyEraserStrokes`, `strokeIntersectsPath`, `segmentsIntersect`,
 *   `defaultStrokeColor`, `defaultStrokeWidth`, `defaultShapeStyle`,
 *   `defaultStickyNoteStyle`, `generateWhiteboardId` — pure
 *   geometry / id helpers (no Angular, no DOM).
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import {
 *   WhiteboardCanvas,
 *   type WhiteboardChange,
 *   type WhiteboardShape,
 *   type WhiteboardStickyNote,
 *   type WhiteboardStroke,
 * } from '@molecule/app-whiteboard-canvas-angular'
 *
 * @Component({
 *   selector: 'app-board',
 *   standalone: true,
 *   imports: [WhiteboardCanvas],
 *   template: `
 *     <div
 *       mol-whiteboard-canvas
 *       tool="pen"
 *       [strokes]="strokes()"
 *       [shapes]="shapes()"
 *       [stickyNotes]="stickyNotes()"
 *       [onChange]="apply"
 *       [width]="800"
 *       [height]="600"
 *     ></div>
 *   `,
 * })
 * export class Board {
 *   readonly strokes = signal<WhiteboardStroke[]>([])
 *   readonly shapes = signal<WhiteboardShape[]>([])
 *   readonly stickyNotes = signal<WhiteboardStickyNote[]>([])
 *   apply = (change: WhiteboardChange): void => {
 *     this.strokes.set(change.strokes)
 *     this.shapes.set(change.shapes)
 *     this.stickyNotes.set(change.stickyNotes)
 *   }
 * }
 * ```
 *
 * @remarks
 * - `width` / `height` are REQUIRED CSS-pixel numbers — the surface does not
 *   auto-size to its container; measure the container (e.g. a ResizeObserver)
 *   for fill layouts.
 * - Eraser gestures round-trip through `onChange` as strokes; run
 *   `applyEraserStrokes` before persisting if you want erasures baked in.
 * - UI strings come from the companion `@molecule/app-locales-whiteboard-canvas`
 *   bond; `readOnly` disables all drawing tools but keeps background pan.
 *
 * @module
 */

export * from './strokes.js'
export * from './types.js'
export * from './whiteboard-canvas.component.js'
