/**
 * React hook for IDE workspace provider.
 *
 * @module
 */

import { useCallback, useContext, useRef, useSyncExternalStore } from 'react'

import { t } from '@molecule/app-i18n'
import type { PanelId, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'

import { WorkspaceContext } from '../contexts.js'
import type { UseWorkspaceResult } from '../types.js'

/**
 * Access the workspace provider from context.
 * @returns The result.
 */
export function useWorkspaceProvider(): WorkspaceProvider {
  const provider = useContext(WorkspaceContext)
  if (!provider) {
    throw new Error(
      t('react.error.useWorkspaceOutsideProvider', undefined, {
        defaultValue: 'useWorkspaceProvider must be used within a WorkspaceProvider',
      }),
    )
  }
  return provider
}

/**
 * Hook for IDE workspace layout management.
 * @returns The workspace state and management methods.
 */
export function useWorkspace(): UseWorkspaceResult {
  const provider = useWorkspaceProvider()
  const cachedRef = useRef<WorkspaceState | null>(null)

  const getSnapshot = useCallback(() => {
    const layout = provider.getLayout()
    // Create a state object — provider.subscribe gives us the full WorkspaceState
    // but getLayout only gives us the layout. Use a lightweight cache comparison.
    const prev = cachedRef.current
    if (prev && prev.layout === layout) {
      return prev
    }
    const next: WorkspaceState = {
      layout,
      activePanel: null,
      collapsedPanels: new Set(),
      isFullscreen: false,
    }
    cachedRef.current = next
    return next
  }, [provider])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return provider.subscribe((state) => {
        cachedRef.current = state
        onStoreChange()
      })
    },
    [provider],
  )

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const togglePanel = useCallback((panelId: PanelId) => provider.togglePanel(panelId), [provider])

  const resizePanel = useCallback(
    (panelId: PanelId, size: number) => provider.resizePanel(panelId, size),
    [provider],
  )

  const setActivePanel = useCallback(
    (panelId: PanelId) => provider.setActivePanel(panelId),
    [provider],
  )

  const resetLayout = useCallback(() => provider.resetLayout(), [provider])

  return {
    layout: state.layout,
    activePanel: state.activePanel,
    collapsedPanels: state.collapsedPanels,
    togglePanel,
    resizePanel,
    setActivePanel,
    resetLayout,
  }
}
