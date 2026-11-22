/**
 * Angular 3D model viewer wrapping three.js.
 *
 * Exports `<div mol-three-viewer>` — an Angular component that renders
 * GLTF/GLB, OBJ, or STL models with orbit controls, lighting presets
 * (`studio`/`sunset`/`flat`), auto-fit camera, and full GPU resource cleanup
 * on destroy — plus the `resolveFormat()` and `disposeObject3D()` helpers and
 * the prop types. It is the Angular counterpart of
 * `@molecule/app-three-viewer-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ThreeViewer } from '@molecule/app-three-viewer-angular'
 *
 * @Component({
 *   selector: 'app-model-page',
 *   standalone: true,
 *   imports: [ThreeViewer],
 *   template: `
 *     <div style="height: 480px">
 *       <!-- Inline callbacks/arrays are safe — they do not tear down WebGL. -->
 *       <div
 *         mol-three-viewer
 *         src="/models/duck.glb"
 *         lighting="studio"
 *         [autoRotate]="true"
 *         (onLoad)="loaded()"
 *       ></div>
 *     </div>
 *   `,
 * })
 * export class ModelPage {
 *   readonly loaded = (): void => {
 *     console.log('model loaded')
 *   }
 * }
 * ```
 *
 * @remarks
 * - Ships a REAL pinned `three` dependency — a substantial bundle-size add.
 *   Lazy-load the importing route/component so non-3D pages do not pay for it.
 * - Only `src`/`format` (and `lighting`/`background`, which restructure the
 *   scene) rebuild the scene; `onLoad`, `onError`, `cameraTarget` and
 *   `autoRotate` update the running scene in place, so passing them inline
 *   (fresh arrows / `[x,y,z]` literals) does NOT tear down the WebGL context
 *   or re-download the model.
 * - The wrapper is `width/height: 100%` with `min-height: 240px` — give the
 *   PARENT an explicit height or the canvas collapses to 240px.
 * - Requires WebGL in a real browser: do not render during SSR and do not
 *   expect it to work under jsdom tests. Model URLs must be same-origin or
 *   CORS-enabled.
 * - `format` is inferred from the `src` extension (unknown extensions fall
 *   back to `gltf`); pass it explicitly for extension-less URLs.
 * - Must render inside the app's i18n provider and with a ClassMap bond wired
 *   (loading/error overlays use `useTranslation()`); translations ship in
 *   `@molecule/app-locales-feature-three-viewer`.
 *
 * @module
 */

export * from './three-viewer.component.js'
export * from './types.js'
