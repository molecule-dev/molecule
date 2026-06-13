/**
 * Iframe-based live preview provider implementation.
 *
 * Manages preview URL, device frame, loading state, and connection status.
 * The React component renders the actual iframe; this provider manages the state.
 *
 * @module
 */

import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import type { IframePreviewConfig } from './types.js'

/**
 * Validates a URL reported by the preview's `molecule:navigate` message. Only
 * absolute `http`/`https` URLs are accepted — this rejects `javascript:`,
 * `data:`, `blob:`, `about:` and any unparseable value so a hostile preview can
 * never inject a dangerous string into the host URL bar. The reported value is
 * returned unchanged when valid (the preview sends a canonical `location.href`),
 * so a dedupe against the displayed location stays exact.
 * @param url - The candidate URL from the navigation message.
 * @returns The original URL when it is a safe absolute `http(s)` URL, else `null`.
 */
function validateNavigationUrl(url: unknown): string | null {
  if (typeof url !== 'string' || url.length === 0) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return url
  } catch (_error) {
    // Unparseable URL (e.g. a relative path or garbage) — not a usable absolute
    // location for the URL bar; ignoring it is the correct, safe behavior.
    return null
  }
}

/**
 * Iframe-based implementation of `PreviewProvider`. Manages preview URL, device frame selection,
 * loading state, and connection status. The actual iframe rendering is handled by a companion React component.
 */
export class IframePreviewProvider implements PreviewProvider {
  readonly name = 'iframe'
  private state: PreviewState
  private refreshKey = 0
  private subscribers: Set<(state: PreviewState) => void> = new Set()
  /**
   * Navigation history (browser-style). Entries are pushed by `setUrl` and by
   * `recordNavigation` (the preview's reported locations); `back`/`forward` move
   * `historyIndex` within it. Empty until the first navigation is recorded.
   */
  private history: string[] = []
  private historyIndex = -1

  constructor(config: IframePreviewConfig = {}) {
    this.state = {
      url: config.defaultUrl ?? '',
      currentUrl: config.defaultUrl ?? '',
      isLoading: false,
      device: config.defaultDevice ?? 'none',
      error: null,
      isConnected: false,
      canGoBack: false,
      canGoForward: false,
      loadNonce: 0,
    }
  }

  /**
   * Pushes a URL onto the navigation history, truncating any forward entries
   * (a new navigation replaces the forward stack) and collapsing a consecutive
   * duplicate (a reload or a redirect to the same URL doesn't add an entry).
   * @param url - The URL that was navigated to.
   */
  private pushHistory(url: string): void {
    // Drop any forward history beyond the current position.
    this.history = this.history.slice(0, this.historyIndex + 1)
    if (this.history[this.historyIndex] === url) return
    this.history.push(url)
    this.historyIndex = this.history.length - 1
  }

  /**
   * Derives the navigation flags from the current history position.
   * @returns The current `canGoBack`/`canGoForward` flags derived from the history index.
   */
  private navFlags(): { canGoBack: boolean; canGoForward: boolean } {
    return {
      canGoBack: this.historyIndex > 0,
      canGoForward: this.historyIndex < this.history.length - 1,
    }
  }

  /** Loads the history entry at the current index (used by `back`/`forward`). */
  private loadHistoryEntry(): void {
    const url = this.history[this.historyIndex]
    this.state = {
      ...this.state,
      url,
      currentUrl: url,
      isLoading: true,
      error: null,
      loadNonce: this.state.loadNonce + 1,
      ...this.navFlags(),
    }
    this.notify()
  }

  /**
   * Sets the preview URL (load target) and marks the iframe as loading. Also
   * optimistically updates {@link PreviewState.currentUrl} to the new URL; the
   * preview will confirm (or correct, e.g. on a redirect) the actual location
   * via {@link IframePreviewProvider.recordNavigation}.
   * @param url - The new URL to load in the preview iframe.
   */
  setUrl(url: string): void {
    this.pushHistory(url)
    this.state = {
      ...this.state,
      url,
      currentUrl: url,
      isLoading: true,
      error: null,
      loadNonce: this.state.loadNonce + 1,
      ...this.navFlags(),
    }
    this.notify()
  }

  /**
   * Records a navigation reported by the running preview via the
   * `molecule:navigate` iframe message. Updates {@link PreviewState.currentUrl}
   * (the URL bar) WITHOUT reloading the document — the preview already navigated
   * client-side. Non-`http(s)` or unparseable URLs are ignored so a hostile
   * `javascript:`/`data:` URL can never reach the URL bar.
   * @param url - The preview's new location (absolute `http`/`https` URL).
   */
  recordNavigation(url: string): void {
    const validated = validateNavigationUrl(url)
    if (!validated || validated === this.state.currentUrl) return
    // Record the navigation in history (so Back/Forward work) but do NOT bump
    // loadNonce or change the load target — the preview already navigated.
    this.pushHistory(validated)
    this.state = { ...this.state, currentUrl: validated, ...this.navFlags() }
    this.notify()
  }

  /**
   * Returns the current preview URL.
   * @returns The current preview URL string.
   */
  getUrl(): string {
    return this.state.url
  }

  /** Forces a refresh — bumps `loadNonce` (so the renderer reloads even at the same URL) and the refresh key. */
  refresh(): void {
    this.refreshKey++
    this.state = {
      ...this.state,
      isLoading: true,
      error: null,
      loadNonce: this.state.loadNonce + 1,
    }
    this.notify()
  }

  /**
   * Navigates to the previous entry in the navigation history (browser Back).
   * No-op when there is no previous entry. Bumps `loadNonce` so the renderer
   * reloads the target even if it equals the current load URL.
   */
  back(): void {
    if (this.historyIndex <= 0) return
    this.historyIndex--
    this.loadHistoryEntry()
  }

  /**
   * Navigates to the next entry in the navigation history (browser Forward).
   * No-op when there is no forward entry.
   */
  forward(): void {
    if (this.historyIndex >= this.history.length - 1) return
    this.historyIndex++
    this.loadHistoryEntry()
  }

  /**
   * Reports whether the preview can navigate back in its history.
   * @returns Whether a Back navigation is currently possible.
   */
  canGoBack(): boolean {
    return this.historyIndex > 0
  }

  /**
   * Reports whether the preview can navigate forward in its history.
   * @returns Whether a Forward navigation is currently possible.
   */
  canGoForward(): boolean {
    return this.historyIndex < this.history.length - 1
  }

  /**
   * Sets the device frame for the preview (e.g. `'none'`, `'phone'`, `'tablet'`).
   * @param device - The device frame to display around the iframe.
   */
  setDevice(device: DeviceFrame): void {
    this.state = { ...this.state, device }
    this.notify()
  }

  /**
   * Returns the current preview state (URL, loading, device, error, connection).
   * @returns The current preview state object.
   */
  getState(): PreviewState {
    return this.state
  }

  /**
   * Navigates the preview iframe to a path relative to the current base URL.
   * @param path - The path to navigate to (e.g. `'/settings'`).
   */
  navigateTo(path: string): void {
    const base = this.state.url.replace(/\/+$/, '')
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    this.setUrl(`${base}${cleanPath}`)
  }

  /**
   * Subscribes to preview state changes.
   * @param callback - Called whenever the preview state changes (URL, loading, error, etc.).
   * @returns An unsubscribe function.
   */
  subscribe(callback: (state: PreviewState) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /** Opens the preview's current location in a new browser tab. */
  openExternal(): void {
    // Prefer the actual current location (in-app navigations) over the load target.
    const target = this.state.currentUrl || this.state.url
    if (target) {
      try {
        const parsed = new URL(target)
        // Only allow http/https — block javascript:, data:, and other dangerous schemes
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          window.open(target, '_blank', 'noopener,noreferrer')
        }
      } catch (_error) {
        // Invalid URL — silently ignore; nothing to open, no state is broken
      }
    }
  }

  /** Called by the iframe component when the iframe loads. */
  notifyLoaded(): void {
    this.state = { ...this.state, isLoading: false, isConnected: true, error: null }
    this.notify()
  }

  /**
   * Called by the iframe component when the iframe errors.
   * @param error - The error.
   */
  notifyError(error: string): void {
    this.state = { ...this.state, isLoading: false, error }
    this.notify()
  }

  /**
   * Returns the current refresh key. Used by components to detect when to force-reload the iframe.
   * @returns A monotonically increasing number that changes on each `refresh()` call.
   */
  getRefreshKey(): number {
    return this.refreshKey
  }

  /** Notifies all subscribers of the current preview state. */
  private notify(): void {
    for (const cb of this.subscribers) {
      cb(this.state)
    }
  }
}

/**
 * Creates an `IframePreviewProvider` with optional default URL and device frame.
 * @param config - Iframe preview configuration (default URL, default device frame).
 * @returns An `IframePreviewProvider` that manages live preview state.
 */
export function createProvider(config?: IframePreviewConfig): IframePreviewProvider {
  return new IframePreviewProvider(config)
}
