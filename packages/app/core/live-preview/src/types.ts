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
  setUrl(url: string): void
  getUrl(): string
  refresh(): void
  setDevice(device: DeviceFrame): void
  getState(): PreviewState
  navigateTo(path: string): void
  /**
   * Records a navigation the running preview reported (via the
   * `molecule:navigate` message — see the interface `@remarks`). Updates the
   * current location for the URL bar; invalid or non-`http(s)` URLs are ignored.
   * @param url - The preview's new location (absolute `http`/`https` URL).
   */
  recordNavigation(url: string): void
  subscribe(callback: (state: PreviewState) => void): () => void
  openExternal(): void
}
