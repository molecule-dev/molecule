/**
 * Vue map drawing — toolbar + interaction surface for authoring geofences
 * (polygons, circles, pins, lines) on top of any `@molecule/app-maps` backend.
 *
 * The Vue counterpart of `@molecule/app-map-drawing-react`: it exports the same
 * names, takes the same props (React names) and renders the same DOM for the
 * same input. Exports `<MapDrawing>`, `<MapDrawingToolbar>`, geometry helpers
 * (`haversineDistanceMeters`, `closeRing`, `identityBackend`, `pointInRect`,
 * `toRadians`), and the `MapShape` / `MapDrawingProps` / `MapDrawingBackend`
 * types.
 *
 * Composes with `@molecule/app-maps` via two props: `mapSlot` (render the map
 * element underneath the drawing overlay — as a prop or a same-named slot) and
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
 * import { createApp, defineComponent, h } from 'vue'
 * import { haversineDistanceMeters, MapDrawing } from '@molecule/app-map-drawing-vue'
 * import type { MapDrawingBackend } from '@molecule/app-map-drawing-vue'
 *
 * // Adapt any map instance into a drawing backend:
 * const backend: MapDrawingBackend = {
 *   project: ([lng, lat]) => ({ x: lng, y: lat }),
 *   unproject: (point) => [point.x, point.y],
 *   distanceMeters: haversineDistanceMeters,
 * }
 *
 * const Zones = defineComponent({
 *   setup() {
 *     return () =>
 *       h(MapDrawing, {
 *         tools: ['polygon', 'circle', 'pin'],
 *         height: 500,
 *         mapBackend: backend,
 *         onChange: (shapes) => console.log(shapes),
 *       })
 *   },
 * })
 *
 * createApp(Zones).mount('#app')
 * ```
 *
 * @module
 */

export * from './geometry.js'
export * from './MapDrawing.js'
export * from './MapDrawingToolbar.js'
export * from './types.js'
