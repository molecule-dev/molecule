/**
 * `@molecule/app-bonds-default-angular` — default app-side bond wirings for
 * the Angular fleet stack: the framework-neutral defaults re-exported from
 * `@molecule/app-bonds-default` (auth/http factories, state, fonts, storage,
 * styling, theme, ClassMap, icons, the optional provider subpaths) plus the
 * Angular Router routing setup and `bootstrapApp()`. Switching framework
 * means changing the package name in the imports — every export keeps its
 * name.
 *
 * - `bootstrapApp({ App, authClient, setupProviders, providers?, registerPWA? })`
 *   — the whole scaffolded `src/main.ts`: awaits `setupProviders()` BEFORE the
 *   first render, kicks off `authClient.initialize()` (best-effort), mounts
 *   the root component on `#root`, then registers the PWA. `providers` are
 *   Angular root-injector providers (`provideRouter(routes)` with
 *   `provideMoleculeRouter()` from `@molecule/app-routing-angular-router`,
 *   `provideMolecule({ ... })`, …).
 * - `setupAllDefaultBonds()` — wires the NINE universal bonds in one call:
 *   state (the vanilla `simpleProvider`, so `createStore()` works from the
 *   first render), fonts-arimo, routing-angular-router, storage-localstorage,
 *   styling-tailwind (registers the tailwind-merge class merger),
 *   theme-css-variables (light + dark via `getDefaultThemeProvider()`),
 *   ui-tailwind ClassMap, icons-molecule, clipboard-web (the browser Clipboard API with a
 *   selection-and-copy fallback). Each also exists as an individual
 *   `setupApp*()` for apps that wire a la carte.
 * - **Optional provider wirings live behind subpaths**, one module per pair:
 *   `@molecule/app-bonds-default-angular/optional/<pair>.js` — `realtime-socketio`,
 *   `keyboard-shortcuts-hotkeys`, `command-palette-cmdk`, `client-search-minisearch`, `code-editor-monaco`,
 *   `virtual-scroll-tanstack`, `drag-drop-dndkit`, `charts-chartjs`,
 *   `maps-leaflet`, `video-hls`. Import ONLY the ones the app installs.
 * - Auth/http factories — `createDefaultAuthClient(authConfig)` returns
 *   `{ authClient, setupAuthDefault }`; the `...WithHttpSync` /
 *   `...WithFetchClient` variants also keep the bonded http client's bearer
 *   token in sync with auth events. All three accept any JSON object profile
 *   (`createDefaultAuthClient<SessionUser>(config)` for an API whose user has no
 *   `id`) and fall back to `UserProfile` — with its `id: string` — when no type
 *   argument is given. The profile is never inferred from `authConfig`, so an
 *   untyped call keeps the default contract.
 *
 * **What this client already handles**
 * - `getAccessToken()` returns a stored token during restore; only 401/403 ends
 *   the session, while network/5xx failures retain it.
 * - `tokenKey`/`storagePrefix`, `authScheme`, `mapAuthResponse`,
 *   `currentUserEndpoint`, and `profileEndpoint`/`profileUpdateMethod` adapt the API.
 * - `logout()` settles local sign-out; `refresh()` uses a stored refresh token.
 *
 * This factory adds no render gate: `AuthProvider` renders children immediately.
 * The HTTP-sync variants gate requests during restore, not rendering.
 *
 * @example
 * ```ts
 * // src/main.ts
 * import { provideRouter } from '@angular/router'
 * import {
 *   bootstrapApp,
 *   createDefaultAuthClientWithHttpSync,
 *   setupAllDefaultBonds,
 * } from '@molecule/app-bonds-default-angular'
 * import { provideMoleculeRouter } from '@molecule/app-routing-angular-router'
 * // Optional providers come from their own subpath — see @remarks.
 * import { setupAppCodeEditorMonaco } from '@molecule/app-bonds-default-angular/optional/code-editor-monaco.js'
 *
 * import { App } from './app/app.js'
 * import { authConfig } from './config.js'
 * import { routes } from './app/routes.js'
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
 *   providers: [provideRouter(routes), provideMoleculeRouter()],
 * })
 * ```
 *
 * @remarks
 * - **Optional setups are NOT exported from the package root.** Import each
 *   from its own subpath —
 *   `@molecule/app-bonds-default-angular/optional/maps-leaflet.js`, not
 *   `from '@molecule/app-bonds-default-angular'`. A bundler must RESOLVE every
 *   `import()` in a module it pulls into the graph, before tree-shaking can
 *   drop anything, so importing a subpath whose provider pair the app has not
 *   installed fails its build. Only import a subpath the app actually installs.
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

export * from './bootstrap.js'
export * from './setup.js'
export * from '@molecule/app-bonds-default'
