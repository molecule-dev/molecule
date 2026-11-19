// @vitest-environment jsdom

/**
 * `useWorkspace` — the Solid counterpart of React's
 * `__tests__/useWorkspace.test.tsx`: it shows the workspace state a component
 * finds when it mounts, not only what changes after it subscribed.
 *
 * Solid's `useSyncExternalStore` delivers a notification on a microtask (React
 * renders on its scheduler), so a change is observed after `settle()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import type { WorkspaceLayout, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'

import { WorkspaceContext } from '../context.js'
import { useWorkspace, type UseWorkspaceResult } from '../primitives/ide.js'

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container it rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * A workspace provider with immutable state, like the default bond.
 *
 * @param withGetState - Whether it implements the optional `getState`.
 * @returns The provider.
 */
function workspace(withGetState: boolean): WorkspaceProvider {
  const layout: WorkspaceLayout = {
    panels: [{ id: 'editor', position: 'center', defaultSize: 100, visible: true }],
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
 * Mounts `useWorkspace` under the given provider and captures its result.
 *
 * @param provider - The workspace provider to supply through context.
 * @returns The workspace primitive's result.
 */
function mountWorkspace(provider: WorkspaceProvider): UseWorkspaceResult {
  let captured: UseWorkspaceResult | undefined

  /**
   * Calls the primitive under the provider and captures it.
   *
   * @returns Nothing rendered.
   */
  function Probe(): null {
    captured = useWorkspace()
    return null
  }

  mount(() => (
    <WorkspaceContext.Provider value={provider}>
      <Probe />
    </WorkspaceContext.Provider>
  ))
  if (!captured) throw new Error('useWorkspace was not captured')
  return captured
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('useWorkspace', () => {
  it('reads panel changes made before the component mounted', async () => {
    const provider = workspace(true)
    provider.setActivePanel('editor')
    provider.togglePanel('chat')

    const result = mountWorkspace(provider)

    expect(result.activePanel()).toBe('editor')
    expect([...result.collapsedPanels()]).toEqual(['chat'])
    provider.setActivePanel('preview')
    await settle()
    expect(result.activePanel()).toBe('preview')
  })

  it('still follows a provider without getState once it emits', async () => {
    const provider = workspace(false)
    const result = mountWorkspace(provider)

    expect(result.activePanel()).toBeNull()
    provider.setActivePanel('editor')
    await settle()
    expect(result.activePanel()).toBe('editor')
  })
})
