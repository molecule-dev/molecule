/**
 * `@molecule/app-bonds-default` — the framework-neutral half of the default
 * app-side bond wirings, shared unchanged by the per-framework packages
 * (`@molecule/app-bonds-default-react`, `-vue`, `-solid`, `-svelte`,
 * `-angular`), which re-export everything here and add their routing setup,
 * `setupAllDefaultBonds()` and `bootstrapApp()`. Switching framework means
 * changing the package name in the imports — every export below keeps its name.
 *
 * - The eight universal neutral setups — `setupAppStateSimple` (the vanilla
 *   `simpleProvider`, so `createStore()` works from the first render — the
 *   documented `createStore()` + `useStore()` pattern needs a provider bonded
 *   and nothing else in a scaffold wires one), `setupAppFontsArimo`,
 *   `setupAppStorageLocalstorage`, `setupAppStylingTailwind` (registers the
 *   tailwind-merge class merger), `setupAppThemeCssVariables` (light + dark via
 *   `getDefaultThemeProvider()`), `setupAppUiTailwind` ClassMap,
 *   `setupAppIconsMolecule`, `setupAppClipboardWeb` (the browser Clipboard API
 *   with a selection-and-copy fallback, so `copyTextWithFallback()` and
 *   `writeText()` from `@molecule/app-clipboard` work wherever a copy can).
 *   Routing is framework-specific and lives in the
 *   per-framework packages.
 * - **Optional provider wirings live behind subpaths**, one module per pair:
 *   `@molecule/app-bonds-default/optional/<pair>.js` — `realtime-socketio`,
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
 * // bonds/index.ts — any framework
 * import { createDefaultAuthClientWithHttpSync } from '@molecule/app-bonds-default'
 * // Optional providers come from their own subpath — see @remarks.
 * import { setupAppCodeEditorMonaco } from '@molecule/app-bonds-default/optional/code-editor-monaco.js'
 * import { authConfig } from '../config.js'
 *
 * export const { authClient, setupAuthDefault } =
 *   createDefaultAuthClientWithHttpSync(authConfig)
 *
 * // Async so optional async bonds are AWAITED before the first render.
 * export const setupProviders = async () => {
 *   setupAllDefaultBonds() // from @molecule/app-bonds-default-<framework>
 *   setupAuthDefault()
 *   await setupAppCodeEditorMonaco() // only if the app uses the code editor
 * }
 * ```
 *
 * @example Adapt a nested token and `Token` header without another session store.
 * ```ts
 * import { createDefaultAuthClient } from '@molecule/app-bonds-default'
 *
 * const { authClient, setupAuthDefault } = createDefaultAuthClient({
 *   tokenKey: 'app.jwt',
 *   authScheme: 'Token',
 *   currentUserEndpoint: '/user',
 *   profileEndpoint: '/user',
 *   profileUpdateMethod: 'PUT',
 *   mapAuthResponse: (data) => {
 *     const { token, ...user } = (data as { user: { token: string; id: string } }).user
 *     return { accessToken: token, user }
 *   },
 * })
 * ```
 *
 * @remarks
 * - **Optional setups are NOT exported from the package root.** Import each from
 *   its own subpath — `@molecule/app-bonds-default/optional/maps-leaflet.js`,
 *   not `from '@molecule/app-bonds-default'`. A bundler must RESOLVE every
 *   `import()` in a module it pulls into the graph, before tree-shaking can drop
 *   anything, so while these lived in the barrel every app inherited all 18
 *   optional providers and any app that had not installed all of them failed to
 *   build with `Rolldown failed to resolve import "@molecule/app-maps"`. Only
 *   import a subpath whose provider pair the app actually installs.
 * - `setupAllDefaultBonds()` is per-framework (it also wires that framework's
 *   routing bond) and is exported by `@molecule/app-bonds-default-<framework>`,
 *   not here. The optional bonds are NOT part of it either way: they ship as
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
export * from './setup.js'
