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

  constructor(config: IframePreviewConfig = {}) {
    this.state = {
      url: config.defaultUrl ?? '',
      currentUrl: config.defaultUrl ?? '',
      isLoading: false,
      device: config.defaultDevice ?? 'none',
      error: null,
      isConnected: false,
    }
  }

  /**
   * Sets the preview URL (load target) and marks the iframe as loading. Also
   * optimistically updates {@link PreviewState.currentUrl} to the new URL; the
   * preview will confirm (or correct, e.g. on a redirect) the actual location
   * via {@link IframePreviewProvider.recordNavigation}.
   * @param url - The new URL to load in the preview iframe.
   */
  setUrl(url: string): void {
    this.state = { ...this.state, url, currentUrl: url, isLoading: true, error: null }
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
    this.state = { ...this.state, currentUrl: validated }
    this.notify()
  }

  /**
   * Returns the current preview URL.
   * @returns The current preview URL string.
   */
  getUrl(): string {
    return this.state.url
  }

  /** Forces a refresh by incrementing the refresh key, which triggers an iframe reload. */
  refresh(): void {
    this.refreshKey++
    this.state = { ...this.state, isLoading: true, error: null }
    this.notify()
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
