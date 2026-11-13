/**
 * Vue composable for the live preview provider.
 *
 * @module
 */

import { computed, getCurrentScope, inject, onScopeDispose } from 'vue'

import { t } from '@molecule/app-i18n'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { PreviewKey } from '../injection-keys.js'
import type { UsePreviewReturn } from '../types.js'
import { subscribeExternalSnapshot } from './external-snapshot.js'

/**
 * Access the preview provider from injection.
 *
 * @returns The preview provider
 * @throws {Error} Error if used without providing preview
 */
export function usePreviewProvider(): PreviewProvider {
  const provider = inject(PreviewKey)
  if (!provider) {
    throw new Error(
      t('vue.error.usePreviewOutsideProvider', undefined, {
        defaultValue: 'usePreviewProvider must be used within a PreviewProvider',
      }),
    )
  }
  return provider
}

/**
 * Composable for live preview management.
 *
 * The provider's state answers through a snapshot cache compared field by
 * field (the provider hands out a new object per read), so a notification that
 * changed nothing keeps the previous snapshot — the same identity contract
 * React's `useSyncExternalStore` needs.
 *
 * @returns Preview state and controls.
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePreview } from '@molecule/app-vue'
 *
 * const { state, setUrl, refresh } = usePreview()
 * </script>
 *
 * <template>
 *   <iframe :src="state.currentUrl" />
 * </template>
 * ```
 */
export function usePreview(): UsePreviewReturn {
  const provider = usePreviewProvider()
  // The snapshot cache React keeps: the provider returns a new object per
  // read, so equality is decided field by field.
  let cached: PreviewState | null = null

  const read = (): PreviewState => {
    const next = provider.getState()
    const previous = cached
    if (
      previous &&
      previous.url === next.url &&
      previous.currentUrl === next.currentUrl &&
      previous.isLoading === next.isLoading &&
      previous.device === next.device &&
      previous.error === next.error &&
      previous.isConnected === next.isConnected &&
      previous.canGoBack === next.canGoBack &&
      previous.canGoForward === next.canGoForward &&
      previous.loadNonce === next.loadNonce
    ) {
      return previous
    }
    cached = next
    return next
  }

  const { state, unsubscribe } = subscribeExternalSnapshot(read, (onNotify) =>
    provider.subscribe(() => onNotify()),
  )

  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  const setUrl = (url: string): void => provider.setUrl(url)
  const refresh = (): void => provider.refresh()
  const setDevice = (device: DeviceFrame): void => provider.setDevice(device)
  const openExternal = (): void => provider.openExternal()
  const recordNavigation = (url: string, isReplace?: boolean): void =>
    provider.recordNavigation(url, isReplace)
  const back = (): void => provider.back()
  const forward = (): void => provider.forward()

  return {
    state: computed(() => state.value),
    setUrl,
    refresh,
    setDevice,
    openExternal,
    recordNavigation,
    back,
    forward,
  }
}
