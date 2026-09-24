/**
 * `@molecule/app-bonds-default-react` — default app-side bond wirings for the
 * React fleet stack, replacing the byte-identical per-app files:
 *
 * - `bootstrapApp({ App, authClient, setupProviders, registerPWA? })` — the
 *   whole scaffolded `src/main.tsx`: awaits `setupProviders()` BEFORE the
 *   first render, kicks off `authClient.initialize()` (best-effort), mounts
 *   `<App />` in StrictMode on `#root`, then registers the PWA.
 * - `setupAllDefaultBonds()` — wires the SEVEN universal bonds in one call:
 *   fonts-arimo, routing-react-router, storage-localstorage, styling-tailwind
 *   (registers the tailwind-merge class merger), theme-css-variables
 *   (light + dark via `getDefaultThemeProvider()`), ui-tailwind ClassMap,
 *   icons-molecule. Each also exists as an individual `setupApp*()` for apps
 *   that wire a la carte (per-app `app/src/bonds/<name>.ts` files stay 1-line
 *   re-exports of these).
 * - **Optional provider wirings live behind subpaths**, one module per pair:
 *   `@molecule/app-bonds-default-react/optional/<pair>.js` — `realtime-socketio`,
 *   `keyboard-shortcuts-hotkeys`, `command-palette-cmdk`, `code-editor-monaco`,
 *   `virtual-scroll-tanstack`, `drag-drop-dndkit`, `charts-chartjs`,
 *   `maps-leaflet`, `video-hls`. Import ONLY the ones the app installs.
 * - Auth/http factories — `createDefaultAuthClient(authConfig)` returns
 *   `{ authClient, setupAuthDefault }`; the `...WithHttpSync` /
 *   `...WithFetchClient` variants also keep the bonded http client's bearer
 *   token in sync with auth events.
 *
 * @example
 * ```tsx
 * // src/main.tsx — the whole entry point of a scaffolded React app.
 * import {
 *   bootstrapApp,
 *   createDefaultAuthClientWithHttpSync,
 *   setupAllDefaultBonds,
 * } from '@molecule/app-bonds-default-react'
 * // Optional providers come from their own subpath — only for pairs the app installs.
 * import { setupAppKeyboardShortcutsHotkeys } from '@molecule/app-bonds-default-react/optional/keyboard-shortcuts-hotkeys.js'
 * import { registerLocaleModule, t } from '@molecule/app-i18n'
 * import * as commonLocales from '@molecule/app-locales-common'
 *
 * function App() {
 *   return <h1>{t('auth.login.signInTitle', undefined, { defaultValue: 'Welcome back' })}</h1>
 * }
 *
 * const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync({ baseURL: '/api' })
 *
 * // Mounts <App /> on the existing `<div id="root">` in index.html.
 * bootstrapApp({
 *   App,
 *   authClient,
 *   // Async so optional async bonds are AWAITED before the first render.
 *   setupProviders: async () => {
 *     setupAllDefaultBonds()
 *     registerLocaleModule(commonLocales) // translations for the `common.*` / `auth.*` keys
 *     setupAuthDefault()
 *     await setupAppKeyboardShortcutsHotkeys()
 *   },
 * })
 * ```
 *
 * @remarks
 * - **Optional setups are NOT exported from the package root.** Import each from
 *   its own subpath — `@molecule/app-bonds-default-react/optional/maps-leaflet.js`,
 *   not `from '@molecule/app-bonds-default-react'`. A bundler must RESOLVE every
 *   `import()` in a module it pulls into the graph, before tree-shaking can drop
 *   anything, so while these lived in the barrel every app inherited all 18
 *   optional providers and any app that had not installed all of them failed to
 *   build with `Rolldown failed to resolve import "@molecule/app-maps"`. Only
 *   import a subpath whose provider pair the app actually installs.
 * - `setupAllDefaultBonds()` does NOT wire the optional bonds. Those ship as
 *   separate ASYNC setups — `setupAppRealtimeSocketio`,
 *   `setupAppKeyboardShortcutsHotkeys`, `setupAppCommandPaletteCmdk`,
 *   `setupAppCodeEditorMonaco`, `setupAppVirtualScrollTanstack`,
 *   `setupAppDragDropDndkit`, `setupAppChartsChartjs`, `setupAppMapsLeaflet`,
 *   `setupAppVideoHls` — and MUST be awaited inside `setupProviders`
 *   (make it async). `bootstrapApp` awaits `setupProviders()` before mounting
 *   so bonded providers exist by a component's first effect; a fire-and-forget
 *   async setup races the mount and intermittently loses.
 * - Plain `createDefaultAuthClient` does NOT attach the JWT to the bonded
 *   http client. If molecule packages call authed `/api` endpoints, use
 *   `createDefaultAuthClientWithHttpSync` (or `...WithFetchClient` to also
 *   bond a fetch client with a `baseURL`) — otherwise those endpoints return
 *   401 after a page reload or token refresh.
 * - `bootstrapApp()` returns `void`, not a promise, and needs a `<div id="root">` already in
 *   the DOM (`index.html`). Do NOT call `createRoot(...).render()` yourself as well — that
 *   mounts the app twice.
 * - `getDefaultThemeProvider()` constructs lazily because the CSS-variables
 *   theme provider touches `localStorage` at construction — importing this
 *   package is SSR/test-safe, but only CALL it in a DOM environment. Apps
 *   with custom themes build their own provider and skip
 *   `setupAppThemeCssVariables()`.
 *
 * @module
 */

export * from './auth.js'
export * from './bootstrap.js'
export * from './setup.js'
