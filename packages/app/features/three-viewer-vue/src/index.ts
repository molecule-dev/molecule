/**
 * Vue 3D model viewer wrapping three.js.
 *
 * Exports `<ThreeViewer>` — a Vue component that renders GLTF/GLB, OBJ, or STL
 * models with orbit controls, lighting presets (`studio`/`sunset`/`flat`),
 * auto-fit camera, and full GPU resource cleanup on unmount — plus the
 * `resolveFormat()` and `disposeObject3D()` helpers and the prop types. It is
 * the Vue counterpart of `@molecule/app-three-viewer-react`: the same props
 * (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { ThreeViewer } from '@molecule/app-three-viewer-vue'
 *
 * const ModelPage = defineComponent({
 *   setup() {
 *     const loaded = ref(false)
 *     // Inline callbacks/arrays are safe — they do not tear down WebGL.
 *     return () =>
 *       h('div', { style: { height: '480px' } }, [
 *         h(ThreeViewer, {
 *           src: '/models/duck.glb',
 *           lighting: 'studio',
 *           autoRotate: true,
 *           onLoad: () => (loaded.value = true),
 *         }),
 *       ])
 *   },
 * })
 *
 * createApp(ModelPage).mount('#app')
 * ```
 *
 * @remarks
 * - Ships a REAL pinned `three` dependency — a substantial bundle-size add.
 *   Lazy-load the importing route/component (`defineAsyncComponent` / dynamic
 *   `import()`) so non-3D pages do not pay for it.
 * - The heavy setup effect (renderer creation + model download) depends ONLY
 *   on `src`/`format` (and `lighting`/`background`, which restructure the
 *   scene). `onLoad`, `onError`, `cameraTarget`, and `autoRotate` are read
 *   live, so passing them inline (fresh arrows / `[x,y,z]` literals) does NOT
 *   tear down the WebGL context or re-download the model on a parent
 *   re-render. Changing `src`/`format` reloads the model; changing
 *   `cameraTarget`'s value re-aims the camera in place.
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

export * from './ThreeViewer.js'
export * from './types.js'
