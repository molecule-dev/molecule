// @vitest-environment jsdom

/**
 * `useWorkspace` shows the workspace state a component finds when it mounts,
 * not only what changes after it subscribed — Angular's idiom for React's hook
 * over the DI-provided workspace provider.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { PanelId, WorkspaceLayout, WorkspaceProvider, WorkspaceState } from '@molecule/app-ide'

import { useWorkspace } from '../hooks/use-ide.js'
import { provideMolecule } from '../providers.js'

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
 * Exposes the hook's signals so a test reads the current view directly.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-workspace-probe',
  template: '',
})
class WorkspaceProbeComponent {
  readonly workspace = useWorkspace()
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useWorkspace', () => {
  it('reads panel changes made before the component mounted', () => {
    const provider = workspace(true)
    provider.setActivePanel('editor' as PanelId)
    provider.togglePanel('chat' as PanelId)
    TestBed.configureTestingModule({
      imports: [WorkspaceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ workspace: provider })],
    })

    const fixture = TestBed.createComponent(WorkspaceProbeComponent)
    const state = fixture.componentInstance.workspace

    expect(state.activePanel()).toBe('editor')
    expect([...state.collapsedPanels()]).toEqual(['chat'])
    provider.setActivePanel('preview' as PanelId)
    fixture.detectChanges()
    expect(state.activePanel()).toBe('preview')
  })

  it('still follows a provider without getState once it emits', () => {
    const provider = workspace(false)
    TestBed.configureTestingModule({
      imports: [WorkspaceProbeComponent],
      providers: [provideZonelessChangeDetection(), provideMolecule({ workspace: provider })],
    })
    const fixture = TestBed.createComponent(WorkspaceProbeComponent)
    const state = fixture.componentInstance.workspace

    expect(state.activePanel()).toBeNull()
    provider.setActivePanel('editor' as PanelId)
    fixture.detectChanges()
    expect(state.activePanel()).toBe('editor')
  })
})
