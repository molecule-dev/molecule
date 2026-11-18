/**
 * Angular map drawing — toolbar + interaction surface for authoring geofences
 * (polygons, circles, pins, lines) on top of any `@molecule/app-maps` backend.
 *
 * The Angular counterpart of `@molecule/app-map-drawing-react`: it exports the
 * same names, takes the same props (React names) and renders the same DOM for
 * the same input. Exports `<MapDrawing>` (host `div[mol-map-drawing]`),
 * `<MapDrawingToolbar>` (host `div[mol-map-drawing-toolbar]`), geometry helpers
 * (`haversineDistanceMeters`, `closeRing`, `identityBackend`, `pointInRect`,
 * `toRadians`), and the `MapShape` / `MapDrawingProps` / `MapDrawingBackend`
 * types.
 *
 * Composes with `@molecule/app-maps` via two props: `mapSlot` (the map element
 * underneath the drawing overlay, projected as `[slot=mapSlot]` content) and
 * `mapBackend` (a 3-function projection adapter: `project`, `unproject`,
 * `distanceMeters`). There is no prebuilt adapter — build one from your map
 * instance as in the example.
 *
 * @remarks
 * - When `mapBackend` is omitted, the IDENTITY backend is used: lng maps to x
 *   pixels and lat to y pixels, and "radiusMeters" is Euclidean pixels. That is
 *   intended for tests/storyboards only — always pass a real backend when shapes
 *   must be geographic.
 * - polygon/line: click adds vertices, double-click finalises (polygons need 3+
 *   vertices); circle: drag from center, release commits; pin: one per click;
 *   select: marquee-drag, then the toolbar's delete button removes the
 *   selection; the cancel-draft button discards an in-progress draft.
 * - Toolbar and surface labels route through `t()` under `mapDrawing.` — the
 *   registered companion bond is `@molecule/app-locales-feature-map-drawing`.
 * - Note `@molecule/app-maps` currently ships only a placeholder provider (no
 *   real tiles); the drawing overlay works regardless, but the `mapSlot`
 *   background will be a placeholder until a real map provider is wired.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { haversineDistanceMeters, MapDrawing } from '@molecule/app-map-drawing-angular'
 * import type { DrawingTool, MapDrawingBackend, MapShape } from '@molecule/app-map-drawing-angular'
 *
 * @Component({
 *   selector: 'app-zones',
 *   standalone: true,
 *   imports: [MapDrawing],
 *   template: `<div
 *     mol-map-drawing
 *     [tools]="tools"
 *     [height]="500"
 *     [mapBackend]="backend"
 *     [onChange]="save"
 *   ></div>`,
 * })
 * export class Zones {
 *   readonly tools: DrawingTool[] = ['polygon', 'circle', 'pin']
 *   readonly backend: MapDrawingBackend = {
 *     project: ([lng, lat]) => ({ x: lng, y: lat }),
 *     unproject: (point) => [point.x, point.y],
 *     distanceMeters: haversineDistanceMeters,
 *   }
 *   readonly save = (shapes: MapShape[]): void => console.log(shapes)
 * }
 * ```
 *
 * @module
 */

export * from './geometry.js'
export * from './map-drawing.component.js'
export * from './map-drawing-toolbar.component.js'
export * from './types.js'
