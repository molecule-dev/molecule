// @vitest-environment jsdom
/**
 * `useWorkspace` shows the workspace state a component finds when it mounts,
 * not only what changes after it subscribed.
 *
 * The React hook renders under a `WorkspaceProvider` component; a Vue
 * composable is injected through `moleculePlugin`, so a `Probe` component does
 * the same job.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

import type { PanelId, WorkspaceLayout, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'

import { useWorkspace } from '../composables/useWorkspace.js'
import { moleculePlugin } from '../plugin.js'
import type { UseWorkspaceResult } from '../types.js'

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * A workspace provider with immutable state, like the default bond.
 *
 * @param withGetState - Whether it implements the optional `getState`.
 * @returns The provider.
 */
function workspace(withGetState: boolean): WorkspaceProvider {
  const layout: WorkspaceLayout = {
    panels: [{ id: 'editor' as PanelId, position: 'center', defaultSize: 100, visible: true }],
    sizes: { left: [], center: [100], right: [], bottom: [] },
  }
  let state: WorkspaceState = {
    layout,
    activePanel: null,
    collapsedPanels: new Set(),
    isFullscreen: false,
  }
  const listeners = new Set<(next: WorkspaceState) => void>()
  const change = (next: Partial<WorkspaceState>): void => {
    state = { ...state, ...next }
    for (const listener of listeners) listener(state)
  }
  return {
    name: 'test',
    getLayout: () => state.layout,
    ...(withGetState ? { getState: () => state } : {}),
    setLayout: (next) => change({ layout: next }),
    togglePanel: (id) => {
      const collapsed = new Set(state.collapsedPanels)
      if (collapsed.has(id)) collapsed.delete(id)
      else collapsed.add(id)
      change({ collapsedPanels: collapsed })
    },
    resizePanel: () => undefined,
    setActivePanel: (id) => change({ activePanel: id }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    resetLayout: () => change({ activePanel: null, collapsedPanels: new Set() }),
  }
}

/**
 * Runs `useWorkspace` inside a mounted component under the provider plugin.
 *
 * @param provider - The workspace provider the plugin injects.
 * @returns The composable result.
 */
function mountWorkspace(provider: WorkspaceProvider): UseWorkspaceResult {
  let captured: UseWorkspaceResult | null = null
  const Probe = defineComponent({
    setup() {
      captured = useWorkspace()
      return () => h('div')
    },
  })
  const wrapper = mount(Probe, {
    global: { plugins: [[moleculePlugin, { workspace: provider }]] },
  })
  wrappers.push(wrapper)
  if (!captured) throw new Error('useWorkspace setup did not run')
  return captured
}

describe('useWorkspace', () => {
  it('reads panel changes made before the component mounted', async () => {
    const provider = workspace(true)
    provider.setActivePanel('editor' as PanelId)
    provider.togglePanel('chat' as PanelId)

    const result = mountWorkspace(provider)

    expect(result.activePanel.value).toBe('editor')
    expect([...result.collapsedPanels.value]).toEqual(['chat'])
    provider.setActivePanel('preview' as PanelId)
    await nextTick()
    expect(result.activePanel.value).toBe('preview')
  })

  it('still follows a provider without getState once it emits', async () => {
    const provider = workspace(false)
    const result = mountWorkspace(provider)

    expect(result.activePanel.value).toBeNull()
    provider.setActivePanel('editor' as PanelId)
    await nextTick()
    expect(result.activePanel.value).toBe('editor')
  })
})
