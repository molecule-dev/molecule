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
 * - Auth/http factories — `createDefaultAuthClient(authConfig)` returns
 *   `{ authClient, setupAuthDefault }`; the `...WithHttpSync` /
 *   `...WithFetchClient` variants also keep the bonded http client's bearer
 *   token in sync with auth events.
 *
 * @example
 * ```tsx
 * // src/main.tsx
 * import {
 *   bootstrapApp,
 *   createDefaultAuthClientWithHttpSync,
 *   setupAllDefaultBonds,
 *   setupAppCodeEditorMonaco,
 * } from '@molecule/app-bonds-default-react'
 *
 * import { App } from './App.js'
 * import { authConfig } from './config.js'
 *
 * const { authClient, setupAuthDefault } =
 *   createDefaultAuthClientWithHttpSync(authConfig)
 *
 * bootstrapApp({
 *   App,
 *   authClient,
 *   // Async so optional async bonds are AWAITED before the first render.
 *   setupProviders: async () => {
 *     setupAllDefaultBonds()
 *     setupAuthDefault()
 *     await setupAppCodeEditorMonaco() // only if the app uses the code editor
 *   },
 * })
 * ```
 *
 * @remarks
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
