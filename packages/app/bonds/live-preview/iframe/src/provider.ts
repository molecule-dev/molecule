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
      isLoading: false,
      device: config.defaultDevice ?? 'none',
      error: null,
      isConnected: false,
    }
  }

  /**
   * Sets the preview URL and marks the iframe as loading.
   * @param url - The new URL to display in the preview iframe.
   */
  setUrl(url: string): void {
    this.state = { ...this.state, url, isLoading: true, error: null }
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

  /** Opens the current preview URL in a new browser tab. */
  openExternal(): void {
    if (this.state.url) {
      window.open(this.state.url, '_blank')
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
