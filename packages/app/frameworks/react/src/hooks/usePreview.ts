/**
 * React hook for live preview provider.
 *
 * @module
 */

import { useCallback, useContext, useRef, useSyncExternalStore } from 'react'

import { t } from '@molecule/app-i18n'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { PreviewContext } from '../contexts.js'
import type { UsePreviewResult } from '../types.js'

/**
 * Access the preview provider from context.
 * @returns The PreviewProvider instance from the nearest PreviewContext.
 * @throws {Error} If called outside a PreviewProvider.
 */
export function usePreviewProvider(): PreviewProvider {
  const provider = useContext(PreviewContext)
  if (!provider) {
    throw new Error(
      t('react.error.usePreviewOutsideProvider', undefined, {
        defaultValue: 'usePreviewProvider must be used within a PreviewProvider',
      }),
    )
  }
  return provider
}

/**
 * Hook for live preview management.
 *
 * @returns Preview state and controls: state (url, isLoading, device, error, isConnected), setUrl, refresh, setDevice, and openExternal.
 */
export function usePreview(): UsePreviewResult {
  const provider = usePreviewProvider()
  const cachedRef = useRef<PreviewState | null>(null)

  const getSnapshot = useCallback(() => {
    const next = provider.getState()
    const prev = cachedRef.current
    if (
      prev &&
      prev.url === next.url &&
      prev.isLoading === next.isLoading &&
      prev.device === next.device &&
      prev.error === next.error &&
      prev.isConnected === next.isConnected
    ) {
      return prev
    }
    cachedRef.current = next
    return next
  }, [provider])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return provider.subscribe(() => onStoreChange())
    },
    [provider],
  )

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const setUrl = useCallback((url: string) => provider.setUrl(url), [provider])
  const refresh = useCallback(() => provider.refresh(), [provider])
  const setDevice = useCallback((device: DeviceFrame) => provider.setDevice(device), [provider])
  const openExternal = useCallback(() => provider.openExternal(), [provider])

  return { state, setUrl, refresh, setDevice, openExternal }
}
