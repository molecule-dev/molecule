/**
 * Vue composable for the IDE workspace provider.
 *
 * @module
 */

import { computed, getCurrentScope, inject, onScopeDispose } from 'vue'

import { t } from '@molecule/app-i18n'
import type { PanelId, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'

import { WorkspaceKey } from '../injection-keys.js'
import type { UseWorkspaceReturn } from '../types.js'
import { subscribeExternalSnapshot } from './external-snapshot.js'

/**
 * Access the workspace provider from injection.
 *
 * @returns The workspace provider
 * @throws {Error} Error if used without providing workspace
 */
export function useWorkspaceProvider(): WorkspaceProvider {
  const provider = inject(WorkspaceKey)
  if (!provider) {
    throw new Error(
      t('vue.error.useWorkspaceOutsideProvider', undefined, {
        defaultValue: 'useWorkspaceProvider must be used within a WorkspaceProvider',
      }),
    )
  }
  return provider
}

/**
 * Composable for IDE workspace layout management.
 *
 * A provider with `getState` answers the full state; without it, only the
 * layout is readable before the first change callback delivers the rest, which
 * then starts at the core's initial values — the same contract React's
 * `useWorkspace` implements over `useSyncExternalStore`.
 *
 * @returns The workspace state and management methods.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useWorkspace } from '@molecule/app-vue'
 *
 * const { layout, activePanel, togglePanel } = useWorkspace()
 * </script>
 *
 * <template>
 *   <aside v-if="layout.panels.find((p) => p.id === 'chat')?.visible">Chat</aside>
 *   <main>{{ activePanel }}</main>
 * </template>
 * ```
 */
export function useWorkspace(): UseWorkspaceReturn {
  const provider = useWorkspaceProvider()
  // The lightweight cache React keeps: with getState the provider answers the
  // same object until it changes; without it the synthesized state is reused
  // while the layout object is the same.
  let cached: WorkspaceState | null = null

  const read = (): WorkspaceState => {
    // A bond with getState answers with the full state, the same object until it changes.
    const full = provider.getState?.()
    if (full) return full
    const layout = provider.getLayout()
    const previous = cached
    if (previous && previous.layout === layout) {
      return previous
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

  const { state, unsubscribe } = subscribeExternalSnapshot(read, (onNotify) =>
    // The delivered state feeds the cache before the snapshot is re-read, so a
    // provider without getState adopts the emitted full state here.
    provider.subscribe((delivered) => {
      cached = delivered
      onNotify()
    }),
  )

  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  const togglePanel = (panelId: PanelId): void => provider.togglePanel(panelId)
  const resizePanel = (panelId: PanelId, size: number): void => provider.resizePanel(panelId, size)
  const setActivePanel = (panelId: PanelId): void => provider.setActivePanel(panelId)
  const resetLayout = (): void => provider.resetLayout()

  return {
    layout: computed(() => state.value.layout),
    activePanel: computed(() => state.value.activePanel),
    collapsedPanels: computed(() => state.value.collapsedPanels),
    togglePanel,
    resizePanel,
    setActivePanel,
    resetLayout,
  }
}
