/**
 * Svelte hook for IDE workspace management, porting React's `useWorkspace`.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { PanelId, WorkspaceLayout, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'

import { useWorkspaceProvider } from '../context.js'
import { useSyncExternalStore } from './external-store.js'
import { fieldStore } from './live-store.js'

/**
 * Hook result for useWorkspace: the layout fields as readable stores and the
 * layout actions as plain functions.
 */
export interface UseWorkspaceResult {
  /** The panel layout. */
  layout: Readable<WorkspaceLayout>
  /** The panel showing the keyboard focus, if any. */
  activePanel: Readable<PanelId | null>
  /** The panels collapsed. */
  collapsedPanels: Readable<Set<PanelId>>
  /** Shows or hides a panel. */
  togglePanel: (panelId: PanelId) => void
  /** Resizes a panel. */
  resizePanel: (panelId: PanelId, size: number) => void
  /** Focuses a panel. */
  setActivePanel: (panelId: PanelId) => void
  /** Restores the provider's default layout. */
  resetLayout: () => void
}

/**
 * IDE workspace layout management, React's `useWorkspace` in Svelte's idiom:
 * call it during component init under `setMoleculeContext({ workspace })`.
 *
 * The state is a snapshot store over `provider.subscribe`, cached the way
 * React's `useSyncExternalStore` snapshot is (a provider without `getState`
 * fabricates the non-layout fields from `getLayout()` until its first
 * emission supplies the real ones).
 *
 * @returns The workspace state stores and management methods.
 * @example
 * ```svelte
 * <script>
 *   import { useWorkspace } from '@molecule/app-svelte'
 *   const { layout, togglePanel } = useWorkspace()
 * </script>
 * ```
 */
export function useWorkspace(): UseWorkspaceResult {
  const provider: WorkspaceProvider = useWorkspaceProvider()
  // Cached previous state (React's cachedRef): a snapshot equal to the
  // provider's keeps the previous object.
  let cached: WorkspaceState | null = null

  const getSnapshot = (): WorkspaceState => {
    // A bond with getState answers with the full state, the same object until it changes.
    const full = provider.getState?.()
    if (full) return full
    const layout = provider.getLayout()
    // Without getState, only the layout is readable before the first subscribe
    // callback; the rest starts at the core's initial values.
    const prev = cached
    if (prev && prev.layout === layout) {
      return prev
    }
    const next: WorkspaceState = {
      layout,
      activePanel: null,
      collapsedPanels: new Set(),
      isFullscreen: false,
    }
    cached = next
    return next
  }

  const state = useSyncExternalStore<WorkspaceState>((onStoreChange) => {
    return provider.subscribe((next) => {
      cached = next
      onStoreChange()
    })
  }, getSnapshot)

  return {
    layout: fieldStore(state, 'layout'),
    activePanel: fieldStore(state, 'activePanel'),
    collapsedPanels: fieldStore(state, 'collapsedPanels'),
    togglePanel: (panelId: PanelId) => provider.togglePanel(panelId),
    resizePanel: (panelId: PanelId, size: number) => provider.resizePanel(panelId, size),
    setActivePanel: (panelId: PanelId) => provider.setActivePanel(panelId),
    resetLayout: () => provider.resetLayout(),
  }
}
