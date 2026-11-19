// @vitest-environment jsdom

/**
 * `useWorkspace` shows the workspace state a component finds when it mounts,
 * not only what changes after it subscribed — React's case in Svelte's idiom,
 * where the hook is called during init under `setMoleculeContext({ workspace })`
 * and its fields are readable stores.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import type {
  PanelId,
  WorkspaceLayout,
  WorkspaceProvider as WorkspaceProviderType,
  WorkspaceState,
} from '@molecule/app-ide'

import { setMoleculeContext } from '../context.js'
import { useWorkspace, type UseWorkspaceResult } from '../hooks/useWorkspace.js'

/**
 * A workspace provider with immutable state, like the default bond.
 *
 * @param withGetState - Whether it implements the optional `getState`.
 * @returns The provider.
 */
function workspace(withGetState: boolean): WorkspaceProviderType {
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

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

/**
 * Mounts a host that runs `useWorkspace` during a child's init under the given
 * workspace provider.
 *
 * @param provider - The workspace provider to register through the context.
 * @returns The hook's result.
 */
function mountWorkspace(provider: WorkspaceProviderType): UseWorkspaceResult {
  const captured: { result?: UseWorkspaceResult } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: { workspace: provider },
      setMoleculeContext,
      run: () => {
        captured.result = useWorkspace()
      },
    },
  })
  flushSync()
  hosts.push(async () => {
    await unmount(app)
    container.remove()
  })
  if (captured.result === undefined) throw new Error('the host never ran the hook')
  return captured.result
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
})

describe('useWorkspace', () => {
  it('reads panel changes made before the component mounted', async () => {
    const provider = workspace(true)
    provider.setActivePanel('editor' as PanelId)
    provider.togglePanel('chat' as PanelId)

    const result = mountWorkspace(provider)

    expect(get(result.activePanel)).toBe('editor')
    expect([...get(result.collapsedPanels)]).toEqual(['chat'])
    provider.setActivePanel('preview' as PanelId)
    await vi.waitFor(() => expect(get(result.activePanel)).toBe('preview'))
  })

  it('still follows a provider without getState once it emits', async () => {
    const provider = workspace(false)
    const result = mountWorkspace(provider)

    expect(get(result.activePanel)).toBeNull()
    provider.setActivePanel('editor' as PanelId)
    await vi.waitFor(() => expect(get(result.activePanel)).toBe('editor'))
  })
})
