/**
 * Live preview panel types.
 *
 * @module
 */

/**
 * Device Frame type.
 */
export type DeviceFrame = 'none' | 'mobile' | 'tablet' | 'desktop'

/**
 * Configuration for preview.
 */
export interface PreviewConfig {
  url: string
  defaultDevice?: DeviceFrame
  interactive?: boolean
  autoRefresh?: boolean
  refreshDelay?: number
}

/**
 * State for preview.
 */
export interface PreviewState {
  /**
   * The URL the preview is asked to LOAD (the iframe `src` target). Changing it
   * (via `setUrl`/`navigateTo`/`back`/`forward`) reloads the preview document.
   */
  url: string
  /**
   * The preview's ACTUAL current location, as reported by the running preview
   * through the {@link PreviewProvider.recordNavigation} channel (the
   * `molecule:navigate` iframe message — see {@link PreviewProvider}). This is
   * what a URL bar should display; it tracks in-app (client-side) route changes
   * that do NOT reload the document. Falls back to {@link PreviewState.url} when
   * the preview has not reported a location yet.
   */
  currentUrl: string
  isLoading: boolean
  device: DeviceFrame
  error: string | null
  isConnected: boolean
  /** Whether there is a previous entry in the navigation history (enables Back). */
  canGoBack: boolean
  /** Whether there is a forward entry in the navigation history (enables Forward). */
  canGoForward: boolean
  /**
   * Monotonically increasing counter bumped whenever the preview should
   * (re)load its current {@link PreviewState.url} — `navigateTo` and `refresh`
   * always bump it; `setUrl` bumps it ONLY when `url` differs from the current
   * load target (a repeated `setUrl` call with an UNCHANGED url is a no-op — see
   * {@link PreviewProvider.setUrl}). A renderer keys its iframe (re)load off
   * this. To force a reload of the SAME url, call `refresh()`, not `setUrl`.
   * {@link PreviewProvider.recordNavigation}, {@link PreviewProvider.back}, and
   * {@link PreviewProvider.forward} do NOT bump it: a reported in-app navigation
   * already happened, and Back/Forward are client-side history moves driven by a
   * `molecule:nav-command` to the iframe — none of the three is a cold reload.
   */
  loadNonce: number
}

/**
 * Provider interface for preview.
 *
 * @remarks
 * **Navigation message contract.** A preview cannot have its location read by
 * the host across origins, so the running preview reports its own location back
 * to the host. The sanctioned channel is a `window.parent.postMessage` of
 * `{ type: 'molecule:navigate', url }` emitted by the previewed app on first
 * load and on every client-side route change. The host forwards that `url` into
 * {@link PreviewProvider.recordNavigation}, which updates
 * {@link PreviewState.currentUrl} (the URL bar) without reloading the document.
 *
 * The SENDER is a tiny script injected into the scaffolded app at scaffold time
 * (owned by the scaffolder, NOT this package). If that sender is absent the
 * preview still works: {@link PreviewState.currentUrl} stays at the last loaded
 * {@link PreviewState.url}, the URL bar remains editable, and the navigation
 * history stays empty (so `canGoBack`/`canGoForward` are `false`).
 */
export interface PreviewProvider {
  readonly name: string
  /**
   * Sets the preview's load target and bumps {@link PreviewState.loadNonce} so
   * the renderer (re)loads it. No-ops when `url` repeats the previous `setUrl`
   * call — to force a reload of the SAME url, call {@link PreviewProvider.refresh}
   * instead.
   * @param url - The new URL to load in the preview.
   */
  setUrl(url: string): void
  getUrl(): string
  refresh(): void
  setDevice(device: DeviceFrame): void
  getState(): PreviewState
  navigateTo(path: string): void
  /**
   * Records a navigation the running preview reported (via the
   * `molecule:navigate` message — see the interface `@remarks`). Updates the
   * current location for the URL bar; invalid or non-`http(s)` URLs are ignored,
   * and the host's internal cache-buster ({@link PREVIEW_CACHE_BUSTER_PARAM}) is
   * stripped so it never leaks into the URL bar or the Back/Forward history.
   * @param url - The preview's new location (absolute `http`/`https` URL).
   * @param isReplace - Whether the preview REPLACED its current history entry (a
   * `replaceState` redirect/canonicalization) rather than ADDING one (a
   * `pushState`). A replace swaps the current entry in place and PRESERVES the
   * forward stack (so Forward stays enabled); a push (the default) opens a new
   * branch and truncates forward. Defaults to `false`.
   */
  recordNavigation(url: string, isReplace?: boolean): void
  /**
   * Navigates the preview to the previous entry in its navigation history (the
   * history is built from {@link PreviewProvider.recordNavigation} and
   * {@link PreviewProvider.setUrl} calls). This is a CLIENT-SIDE history move,
   * NOT a reload: it updates {@link PreviewState.currentUrl} + the nav flags and
   * leaves {@link PreviewState.url}/`loadNonce` untouched. The renderer posts a
   * `molecule:nav-command` so the preview runs its own `history.back()`,
   * preserving scroll position + SPA state. No-op when
   * {@link PreviewState.canGoBack} is `false`.
   */
  back(): void
  /**
   * Navigates the preview to the next entry in its navigation history — a
   * client-side history move (see {@link PreviewProvider.back}), not a reload.
   * No-op when {@link PreviewState.canGoForward} is `false`.
   */
  forward(): void
  /**
   * Reports whether the preview can navigate back in its history.
   * @returns Whether a Back navigation is currently possible.
   */
  canGoBack(): boolean
  /**
   * Reports whether the preview can navigate forward in its history.
   * @returns Whether a Forward navigation is currently possible.
   */
  canGoForward(): boolean
  subscribe(callback: (state: PreviewState) => void): () => void
  openExternal(): void
}
