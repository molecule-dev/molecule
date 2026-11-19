// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useEditor.tabs.test.tsx`: `useEditor`
 * reports the provider's own tab list — `activeFile` is the tab marked active,
 * read at mount and after every action that changes the tabs, under the same
 * titles.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'

import type {
  DiffFile,
  EditorChangeEvent,
  EditorFile,
  EditorPosition,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'

import { EditorContext } from '../context.js'
import { useEditor, type UseEditorResult } from '../primitives/ide.js'

/** An in-memory editor provider whose tab methods the test can inspect. */
interface MemoryEditor extends EditorProvider {
  getTabs: Mock<EditorProvider['getTabs']>
  onChange: Mock<EditorProvider['onChange']>
  openFile: Mock<EditorProvider['openFile']>
  closeFile: Mock<EditorProvider['closeFile']>
  setActiveTab: Mock<EditorProvider['setActiveTab']>
  openDiff: Mock<NonNullable<EditorProvider['openDiff']>>
  closeDiff: Mock<NonNullable<EditorProvider['closeDiff']>>
  getContent: Mock<EditorProvider['getContent']>
}

/**
 * An editor provider that keeps tabs in memory and marks one active.
 *
 * @param initial - The tabs the provider already holds.
 * @returns The provider and a function that notifies its change listeners.
 */
function memoryEditor(initial: EditorTab[] = []): {
  provider: MemoryEditor
  emit: () => void
} {
  let tabs = initial.map((tab) => ({ ...tab }))
  const listeners = new Set<(event: EditorChangeEvent) => void>()
  const activate = (path: string): void => {
    tabs = tabs.map((tab) => ({ ...tab, isActive: tab.path === path }))
  }
  const provider: MemoryEditor = {
    name: 'memory-editor',
    getTabs: vi.fn<EditorProvider['getTabs']>(() => tabs.map((tab) => ({ ...tab }))),
    onChange: vi.fn<EditorProvider['onChange']>((callback: (event: EditorChangeEvent) => void) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
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
    mount: () => {},
    dispose: () => {},
    setContent: () => {},
    getCursorPosition: (): EditorPosition | null => null,
    setCursorPosition: () => {},
    focus: () => {},
    updateConfig: () => {},
  }
  /** Notifies the provider's listeners of a change in the active tab. */
  const emit = (): void => {
    const active = tabs.find((tab) => tab.isActive)
    const event: EditorChangeEvent = { path: active?.path ?? '', content: '', version: 1 }
    listeners.forEach((listener) => listener(event))
  }
  return { provider, emit }
}

const disposers: Array<() => void> = []

/**
 * Mounts `useEditor` under the given provider.
 *
 * @param provider - The editor provider to supply through context.
 * @returns The editor primitive.
 */
function renderEditor(provider: EditorProvider): UseEditorResult {
  let captured: UseEditorResult | undefined
  function Probe(): JSX.Element {
    captured = useEditor()
    return <></>
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <EditorContext.Provider value={provider}>
        <Probe />
      </EditorContext.Provider>
    ),
    container,
  )
  disposers.push(() => {
    dispose()
    container.remove()
  })
  if (captured === undefined) throw new Error('the probe did not create useEditor')
  return captured
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('useEditor tabs and active file', () => {
  it('reports a tab that is already active at mount', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: false },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: true },
    ])
    const editor = renderEditor(provider)
    expect(editor.activeFile()).toBe('src/b.ts')
  })

  it('reports no active file after setActiveTab on a path with no tab', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
    ])
    const editor = renderEditor(provider)
    editor.setActiveTab('src/missing.ts')
    expect(editor.activeFile()).toBeNull()
  })

  it('shows the diff tab as soon as openDiff returns, and drops it on closeDiff', () => {
    const { provider } = memoryEditor()
    const editor = renderEditor(provider)
    editor.openFile({ path: 'src/a.ts', content: 'a' })
    editor.openDiff({ path: 'src/b.ts', originalContent: '1', modifiedContent: '2' })
    expect(editor.tabs().map((tab) => tab.path)).toEqual(['src/a.ts', 'src/b.ts'])
    expect(editor.activeFile()).toBe('src/b.ts')

    editor.closeDiff()
    expect(editor.tabs().map((tab) => tab.path)).toEqual(['src/a.ts'])
    expect(editor.activeFile()).toBe('src/a.ts')
  })

  it('follows change events from the provider', () => {
    const { provider, emit } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: false },
    ])
    const editor = renderEditor(provider)
    provider.setActiveTab('src/b.ts')
    emit()
    expect(editor.activeFile()).toBe('src/b.ts')
  })
})
