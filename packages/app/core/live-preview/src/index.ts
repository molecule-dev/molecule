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
 * const frame = document.createElement('iframe')
 * document.body.append(frame)
 *
 * let loadedNonce = -1
 * const unsubscribe = preview.subscribe((state) => {
 *   if (state.loadNonce !== loadedNonce) {
 *     loadedNonce = state.loadNonce // (re)load ONLY when the nonce changes
 *     frame.src = state.url
 *   }
 *   console.log(state.currentUrl, state.canGoBack) // URL bar text + Back button state
 * })
 *
 * // The previewed app reports its route changes with postMessage({ type: 'molecule:navigate', url }).
 * window.addEventListener('message', (event: MessageEvent<{ type?: string; url?: string }>) => {
 *   if (event.source !== frame.contentWindow || event.data?.type !== 'molecule:navigate') return
 *   if (event.data.url) preview.recordNavigation(event.data.url)
 * })
 *
 * preview.setUrl('http://localhost:5173/') // loads → 'http://localhost:5173/' false
 * // …the user clicks to /settings inside the app → 'http://localhost:5173/settings' true
 * preview.setUrl('http://localhost:5173/') // NO-OP — same url as the last setUrl
 * preview.refresh() // force-reloads where the preview IS: frame.src = '…/settings'
 * unsubscribe() // when the panel unmounts
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
 * - Check `event.source === frame.contentWindow` before forwarding a
 *   `molecule:navigate` message — any window can `postMessage` to yours.
 * - `refresh()` reloads `currentUrl` (where the preview IS), not the last `setUrl()` target.
 * - Back/Forward post a `molecule:nav-command` into the frame so the preview
 *   runs its own `history.back()`/`forward()` — SPA state and scroll survive.
 *   Guard the buttons with `canGoBack`/`canGoForward`.
 * - Renderers append an internal `?_r=<timestamp>` cache-buster
 *   ({@link PREVIEW_CACHE_BUSTER_PARAM}) on recovery reloads; the provider
 *   strips it ({@link stripCacheBuster}) so it never reaches the URL bar or the
 *   navigation history.
 *
 * @e2e
 * Integration checklist — drive the real preview panel this app renders (use
 * navigate_preview, read_preview_ui, and interact_preview; no mocks), adapt each
 * item to this app's actual preview UI + routes, and check every box off one by
 * one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The preview panel renders the target app at its current location: the URL
 *   bar shows the app's route (`currentUrl`, not the raw load target) and
 *   read_preview_ui returns the previewed screen's visible elements + pageText, not
 *   a blank frame.
 * - [ ] Selecting a device frame/preset resizes the preview to that device: a
 *   `mobile` frame narrows the viewport, `tablet` is mid-width, `desktop` is wide,
 *   and `none` shows it unframed/full-width. Switch between two presets and confirm
 *   the framed width ACTUALLY changes — not merely that a button looks selected.
 * - [ ] Auto-refresh works: change a source file and the preview reloads on its own
 *   to show the latest, with no manual reload — read_preview_ui reflects the new
 *   content. The reload is a `loadNonce` bump (a repeated `setUrl` with the same url
 *   is a no-op), so verify the CONTENT updated, not just that a reload fired.
 * - [ ] Navigating inside the preview updates the shown route: click an in-app link
 *   (or navigate_preview to a new path) and the URL bar's `currentUrl` follows the
 *   client-side route change the app reports via the `molecule:navigate` message —
 *   the frame does not stay stuck on the old route.
 * - [ ] Back/Forward move through the preview's own history: after two in-app
 *   navigations, Back returns to the previous route and Forward re-advances, and
 *   each button is disabled exactly when `canGoBack`/`canGoForward` say there is
 *   nowhere to go (Back disabled at the first entry).
 * - [ ] A failed or blank load surfaces state, never a silently dead frame: point
 *   the preview at an unreachable/erroring route and the panel shows a visible
 *   error or empty state (`error` set; an alert/status message in read_preview_ui),
 *   not a frozen blank iframe.
 *
 * @module
 */

export * from './navigation.js'
export * from './provider.js'
export * from './types.js'
