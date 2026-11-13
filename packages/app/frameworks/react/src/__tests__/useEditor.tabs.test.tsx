// @vitest-environment jsdom

/**
 * `useEditor` reports the provider's own tab list: `activeFile` is the tab
 * marked active, read at mount and after every action that changes the tabs.
 *
 * @module
 */

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { DiffFile, EditorFile, EditorProvider, EditorTab } from '@molecule/app-code-editor'

import { EditorContext } from '../contexts.js'
import { useEditor } from '../hooks/useEditor.js'

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
  const provider = {
    name: 'memory-editor',
    getTabs: vi.fn(() => tabs.map((tab) => ({ ...tab }))),
    onChange: vi.fn((callback: () => void) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    }),
    openFile: vi.fn((file: EditorFile) => {
      tabs = [
        ...tabs.filter((tab) => tab.path !== file.path),
        { path: file.path, label: file.path, isDirty: false, isActive: false },
      ]
      activate(file.path)
    }),
    closeFile: vi.fn((path: string) => {
      tabs = tabs.filter((tab) => tab.path !== path)
    }),
    setActiveTab: vi.fn(activate),
    openDiff: vi.fn((file: DiffFile) => {
      tabs = [
        ...tabs.map((tab) => ({ ...tab, isActive: false })),
        { path: file.path, label: file.path, isDirty: false, isActive: true, isDiff: true },
      ]
    }),
    closeDiff: vi.fn(() => {
      tabs = tabs.filter((tab) => !tab.isDiff)
      if (tabs.length > 0) activate(tabs[tabs.length - 1].path)
    }),
    getContent: vi.fn(() => null),
  } as unknown as EditorProvider
  return { provider, emit: () => listeners.forEach((listener) => listener()) }
}

/**
 * Renders `useEditor` under the given provider.
 *
 * @param provider - The editor provider to supply through context.
 * @returns The `renderHook` result.
 */
function renderEditor(
  provider: EditorProvider,
): ReturnType<typeof renderHook<ReturnType<typeof useEditor>, unknown>> {
  return renderHook(() => useEditor(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <EditorContext.Provider value={provider}>{children}</EditorContext.Provider>
    ),
  })
}

describe('useEditor tabs and active file', () => {
  it('reports a tab that is already active at mount', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: false },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: true },
    ])
    const { result } = renderEditor(provider)
    expect(result.current.activeFile).toBe('src/b.ts')
  })

  it('reports no active file after setActiveTab on a path with no tab', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
    ])
    const { result } = renderEditor(provider)
    act(() => result.current.setActiveTab('src/missing.ts'))
    expect(result.current.activeFile).toBeNull()
  })

  it('shows the diff tab as soon as openDiff returns, and drops it on closeDiff', () => {
    const { provider } = memoryEditor()
    const { result } = renderEditor(provider)
    act(() => result.current.openFile({ path: 'src/a.ts', content: 'a' }))
    act(() =>
      result.current.openDiff({ path: 'src/b.ts', originalContent: '1', modifiedContent: '2' }),
    )
    expect(result.current.tabs.map((tab) => tab.path)).toEqual(['src/a.ts', 'src/b.ts'])
    expect(result.current.activeFile).toBe('src/b.ts')

    act(() => result.current.closeDiff())
    expect(result.current.tabs.map((tab) => tab.path)).toEqual(['src/a.ts'])
    expect(result.current.activeFile).toBe('src/a.ts')
  })

  it('follows change events from the provider', () => {
    const { provider, emit } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: false },
    ])
    const { result } = renderEditor(provider)
    provider.setActiveTab('src/b.ts')
    act(() => emit())
    expect(result.current.activeFile).toBe('src/b.ts')
  })
})
