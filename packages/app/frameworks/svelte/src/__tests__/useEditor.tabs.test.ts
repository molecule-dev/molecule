// @vitest-environment jsdom

/**
 * `useEditor` reports the provider's own tab list: `activeFile` is the tab
 * marked active, read at mount and after every action that changes the tabs —
 * React's `useEditor.tabs.test.tsx` in Svelte's idiom.
 *
 * The binding runs a hook once per component and publishes the provider's tab
 * list as a store, so each case reads the store at the first synchronous read
 * after the action. `svelte`'s context and lifecycle functions are stubbed and
 * the hook runs the way a component's init does.
 *
 * @module
 */

import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DiffFile, EditorFile, EditorProvider, EditorTab } from '@molecule/app-code-editor'

import { setMoleculeContext } from '../context.js'
import { useEditor } from '../hooks/useEditor.js'

const svelteLifecycle = vi.hoisted(() => ({
  contextStore: new Map<symbol, unknown>(),
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  getContext: (key: symbol): unknown => svelteLifecycle.contextStore.get(key),
  setContext: (key: symbol, value: unknown): void => {
    svelteLifecycle.contextStore.set(key, value)
  },
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
}))

/**
 * An editor provider that keeps tabs in memory and marks one active.
 *
 * @param initial - The tabs the provider already holds.
 * @returns The provider and a function that notifies its change listeners.
 */
function memoryEditor(initial: EditorTab[] = []): {
  provider: EditorProvider
  emit: () => void
} {
  let tabs = initial.map((tab) => ({ ...tab }))
  const listeners = new Set<() => void>()
  const activate = (path: string): void => {
    tabs = tabs.map((tab) => ({ ...tab, isActive: tab.path === path }))
  }
  const provider: EditorProvider = {
    name: 'memory-editor',
    mount: vi.fn<EditorProvider['mount']>(),
    dispose: vi.fn<EditorProvider['dispose']>(),
    getTabs: vi.fn<EditorProvider['getTabs']>(() => tabs.map((tab) => ({ ...tab }))),
    onChange: vi.fn<EditorProvider['onChange']>((callback) => {
      const listener = (): void => callback({ path: '', content: '', version: 0 })
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }),
    openFile: vi.fn<EditorProvider['openFile']>((file: EditorFile) => {
      tabs = [
        ...tabs.filter((tab) => tab.path !== file.path),
        { path: file.path, label: file.path, isDirty: false, isActive: false },
      ]
      activate(file.path)
    }),
    closeFile: vi.fn<EditorProvider['closeFile']>((path: string) => {
      tabs = tabs.filter((tab) => tab.path !== path)
    }),
    setActiveTab: vi.fn<EditorProvider['setActiveTab']>(activate),
    openDiff: vi.fn<NonNullable<EditorProvider['openDiff']>>((file: DiffFile) => {
      tabs = [
        ...tabs.map((tab) => ({ ...tab, isActive: false })),
        { path: file.path, label: file.path, isDirty: false, isActive: true, isDiff: true },
      ]
    }),
    closeDiff: vi.fn<NonNullable<EditorProvider['closeDiff']>>(() => {
      tabs = tabs.filter((tab) => !tab.isDiff)
      if (tabs.length > 0) activate(tabs[tabs.length - 1].path)
    }),
    getContent: vi.fn<EditorProvider['getContent']>(() => null),
    setContent: vi.fn<EditorProvider['setContent']>(),
    getCursorPosition: vi.fn<EditorProvider['getCursorPosition']>(() => null),
    setCursorPosition: vi.fn<EditorProvider['setCursorPosition']>(),
    focus: vi.fn<EditorProvider['focus']>(),
    updateConfig: vi.fn<EditorProvider['updateConfig']>(),
  }
  return { provider, emit: () => listeners.forEach((listener) => listener()) }
}

/** The editor hooks this file mounted, torn down after each case. */
const stops: Array<() => void> = []

/**
 * Runs `useEditor` once, the way a component's init does, under `provider`'s
 * editor context.
 *
 * @param provider - The editor provider to set in context.
 * @returns The hook's result.
 */
function renderEditor(provider: EditorProvider): ReturnType<typeof useEditor> {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.destroyCallbacks.length = 0
  setMoleculeContext({ editor: provider })
  const editor = useEditor()
  stops.push(() => {
    for (const callback of svelteLifecycle.destroyCallbacks.splice(0)) callback()
  })
  return editor
}

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
})

describe('useEditor tabs and active file', () => {
  it('reports a tab that is already active at mount', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: false },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: true },
    ])
    const editor = renderEditor(provider)
    expect(get(editor.activeFile)).toBe('src/b.ts')
  })

  it('reports no active file after setActiveTab on a path with no tab', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
    ])
    const editor = renderEditor(provider)
    editor.setActiveTab('src/missing.ts')
    expect(get(editor.activeFile)).toBeNull()
  })

  it('shows the diff tab as soon as openDiff returns, and drops it on closeDiff', () => {
    const { provider } = memoryEditor()
    const editor = renderEditor(provider)
    editor.openFile({ path: 'src/a.ts', content: 'a' })
    editor.openDiff({ path: 'src/b.ts', originalContent: '1', modifiedContent: '2' })
    expect(get(editor.tabs).map((tab) => tab.path)).toEqual(['src/a.ts', 'src/b.ts'])
    expect(get(editor.activeFile)).toBe('src/b.ts')

    editor.closeDiff()
    expect(get(editor.tabs).map((tab) => tab.path)).toEqual(['src/a.ts'])
    expect(get(editor.activeFile)).toBe('src/a.ts')
  })

  it('follows change events from the provider', () => {
    const { provider, emit } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: false },
    ])
    const editor = renderEditor(provider)
    provider.setActiveTab('src/b.ts')
    emit()
    expect(get(editor.activeFile)).toBe('src/b.ts')
  })
})
