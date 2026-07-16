/**
 * Live preview core interface for molecule.dev.
 *
 * Framework-agnostic contract for embedding a running app preview (an IDE-style
 * panel) with URL-bar state, device frames, Back/Forward history, and forced
 * reloads. Bond a provider (e.g. `@molecule/app-live-preview-iframe`) at
 * startup; a renderer subscribes to {@link PreviewState} and keys its (re)loads
 * off `url` + `loadNonce`.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-live-preview'
 * import { provider } from '@molecule/app-live-preview-iframe'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const preview = requireProvider()
 * const unsubscribe = preview.subscribe((state) => {
 *   // (re)load the frame from state.url, keyed on state.loadNonce;
 *   // show state.currentUrl in the URL bar (NOT state.url)
 * })
 * preview.setUrl('http://localhost:5173')
 * preview.refresh() // force-reload the SAME url — repeated setUrl is a no-op
 * ```
 *
 * @remarks
 * - **`setUrl` with an unchanged url is a NO-OP** — call `refresh()` to force a
 *   reload of the same url. Renderers reload off {@link PreviewState.loadNonce},
 *   never off the raw url string; `back()`/`forward()`/`recordNavigation()` do
 *   NOT bump it (client-side history moves, not reloads).
 * - **The URL bar shows {@link PreviewState.currentUrl}, not `url`.** `url` is
 *   the load TARGET; `currentUrl` is where the preview actually is, reported by
 *   the running app via `window.parent.postMessage({ type: 'molecule:navigate', url })`
 *   on load and on every client-side route change, which the host forwards into
 *   {@link PreviewProvider.recordNavigation}. The sender script is injected into
 *   the previewed app at scaffold time (owned by the scaffolder, not this
 *   package); without it the preview still works, but `currentUrl` stays at the
 *   last load target and Back/Forward remain disabled.
 * - Back/Forward post a `molecule:nav-command` into the frame so the preview
 *   runs its own `history.back()`/`forward()` — SPA state and scroll survive.
 *   Guard the buttons with `canGoBack`/`canGoForward`.
 * - Renderers append an internal `?_r=<timestamp>` cache-buster
 *   ({@link PREVIEW_CACHE_BUSTER_PARAM}) on recovery reloads; the provider
 *   strips it ({@link stripCacheBuster}) so it never reaches the URL bar or the
 *   navigation history.
 *
 * @module
 */

export * from './navigation.js'
export * from './provider.js'
export * from './types.js'
