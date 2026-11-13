/**
 * `useWorkspace` shows the workspace state a component finds when it mounts,
 * not only what changes after it subscribed.
 *
 * @module
 */

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import type {
  PanelId,
  WorkspaceLayout,
  WorkspaceProvider as WorkspaceProviderType,
  WorkspaceState,
} from '@molecule/app-ide'

import { useWorkspace } from '../hooks/index.js'
import { WorkspaceProvider } from '../providers.js'

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

const mount = (provider: WorkspaceProviderType) =>
  renderHook(() => useWorkspace(), {
    wrapper: ({ children }: { children: ReactNode }): React.JSX.Element => (
      <WorkspaceProvider provider={provider}>{children}</WorkspaceProvider>
    ),
  })

describe('useWorkspace', () => {
  it('reads panel changes made before the component mounted', () => {
    const provider = workspace(true)
    provider.setActivePanel('editor' as PanelId)
    provider.togglePanel('chat' as PanelId)

    const { result } = mount(provider)

    expect(result.current.activePanel).toBe('editor')
    expect([...result.current.collapsedPanels]).toEqual(['chat'])
    act(() => provider.setActivePanel('preview' as PanelId))
    expect(result.current.activePanel).toBe('preview')
  })

  it('still follows a provider without getState once it emits', () => {
    const provider = workspace(false)
    const { result } = mount(provider)

    expect(result.current.activePanel).toBeNull()
    act(() => provider.setActivePanel('editor' as PanelId))
    expect(result.current.activePanel).toBe('editor')
  })
})
