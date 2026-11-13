/**
 * Svelte hook for live preview management, porting React's `usePreview`.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { usePreviewProvider } from '../context.js'
import { useSyncExternalStore } from './external-store.js'

/**
 * Hook result for usePreview: the preview state as a readable store and the
 * controls as plain functions.
 */
export interface UsePreviewResult {
  /** The preview's full state (url, currentUrl, isLoading, device, error, isConnected, canGoBack, canGoForward, loadNonce). */
  state: Readable<PreviewState>
  /** Loads a url. */
  setUrl: (url: string) => void
  /** Reloads the current document. */
  refresh: () => void
  /** Switches the device frame. */
  setDevice: (device: DeviceFrame) => void
  /** Opens the current url outside the app. */
  openExternal: () => void
  /**
   * Records a navigation the running preview reported via its `molecule:navigate`
   * message — updates the displayed current location without reloading the iframe.
   * Pass `isReplace` when the preview REPLACED its current history entry (a
   * `replaceState` redirect/canonicalization) so the forward stack is preserved
   * instead of truncated (a `pushState`, the default, truncates forward).
   */
  recordNavigation: (url: string, isReplace?: boolean) => void
  /** Navigates the preview to the previous navigation-history entry (Back). */
  back: () => void
  /** Navigates the preview to the next navigation-history entry (Forward). */
  forward: () => void
}

/**
 * Live preview management, React's `usePreview` in Svelte's idiom: call it
 * during component init under `setMoleculeContext({ preview })`.
 *
 * The state is a snapshot store over `provider.subscribe`, cached field-wise
 * the way React's `useSyncExternalStore` snapshot is, so a provider that
 * answers fresh objects does not publish a new snapshot per read.
 *
 * @returns Preview state store and controls.
 * @example
 * ```svelte
 * <script>
 *   import { usePreview } from '@molecule/app-svelte'
 *   const { state, setUrl, refresh } = usePreview()
 * </script>
 * ```
 */
export function usePreview(): UsePreviewResult {
  const provider: PreviewProvider = usePreviewProvider()
  // Cached previous state (React's cachedRef): a snapshot whose nine fields
  // all match the provider's keeps the previous object.
  let cached: PreviewState | null = null

  const getSnapshot = (): PreviewState => {
    const next = provider.getState()
    const prev = cached
    if (
      prev &&
      prev.url === next.url &&
      prev.currentUrl === next.currentUrl &&
      prev.isLoading === next.isLoading &&
      prev.device === next.device &&
      prev.error === next.error &&
      prev.isConnected === next.isConnected &&
      prev.canGoBack === next.canGoBack &&
      prev.canGoForward === next.canGoForward &&
      prev.loadNonce === next.loadNonce
    ) {
      return prev
    }
    cached = next
    return next
  }

  const state = useSyncExternalStore<PreviewState>((onStoreChange) => {
    return provider.subscribe(() => onStoreChange())
  }, getSnapshot)

  return {
    state,
    setUrl: (url: string) => provider.setUrl(url),
    refresh: () => provider.refresh(),
    setDevice: (device: DeviceFrame) => provider.setDevice(device),
    openExternal: () => provider.openExternal(),
    recordNavigation: (url: string, isReplace?: boolean) =>
      provider.recordNavigation(url, isReplace),
    back: () => provider.back(),
    forward: () => provider.forward(),
  }
}
