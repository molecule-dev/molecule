// @vitest-environment jsdom

/**
 * `useEditor` reports the provider's own tab list: `activeFile` is the tab
 * marked active, read at mount and after every action that changes the tabs.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import type {
  DiffFile,
  EditorChangeEvent,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'

import { useEditor } from '../composables/useEditor.js'
import { createEditorPlugin } from '../plugin.js'

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
  const listeners = new Set<(event: EditorChangeEvent) => void>()
  const activate = (path: string): void => {
    tabs = tabs.map((tab) => ({ ...tab, isActive: tab.path === path }))
  }
  const provider: EditorProvider = {
    name: 'memory-editor',
    mount: vi.fn<EditorProvider['mount']>(),
    dispose: vi.fn<EditorProvider['dispose']>(),
    focus: vi.fn<EditorProvider['focus']>(),
    updateConfig: vi.fn<EditorProvider['updateConfig']>(),
    getCursorPosition: vi.fn<EditorProvider['getCursorPosition']>(() => null),
    setCursorPosition: vi.fn<EditorProvider['setCursorPosition']>(),
    setContent: vi.fn<EditorProvider['setContent']>(),
    getContent: vi.fn<EditorProvider['getContent']>(() => null),
    getTabs: vi.fn<EditorProvider['getTabs']>(() => tabs.map((tab) => ({ ...tab }))),
    onChange: vi.fn<EditorProvider['onChange']>((callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    }),
    openFile: vi.fn<EditorProvider['openFile']>((file) => {
      tabs = [
        ...tabs.filter((tab) => tab.path !== file.path),
        { path: file.path, label: file.path, isDirty: false, isActive: false },
      ]
      activate(file.path)
    }),
    closeFile: vi.fn<EditorProvider['closeFile']>((path) => {
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
  }
  return {
    provider,
    emit: () =>
      listeners.forEach((listener) => listener({ path: 'src/b.ts', content: '', version: 1 })),
  }
}

const wrappers: VueWrapper[] = []

/**
 * Mounts `useEditor` under the given provider.
 *
 * @param provider - The editor provider to supply through injection.
 * @returns The composable result.
 */
function renderEditor(provider: EditorProvider): ReturnType<typeof useEditor> {
  let result!: ReturnType<typeof useEditor>
  const Harness = defineComponent({
    setup() {
      result = useEditor()
      return () => h('div')
    },
  })
  wrappers.push(mount(Harness, { global: { plugins: [createEditorPlugin(provider)] } }))
  return result
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('useEditor tabs and active file', () => {
  it('reports a tab that is already active at mount', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: false },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: true },
    ])
    const editor = renderEditor(provider)
    expect(editor.activeFile.value).toBe('src/b.ts')
  })

  it('reports no active file after setActiveTab on a path with no tab', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
    ])
    const editor = renderEditor(provider)
    editor.setActiveTab('src/missing.ts')
    expect(editor.activeFile.value).toBeNull()
  })

  it('shows the diff tab as soon as openDiff returns, and drops it on closeDiff', () => {
    const { provider } = memoryEditor()
    const editor = renderEditor(provider)
    editor.openFile({ path: 'src/a.ts', content: 'a' })
    editor.openDiff({ path: 'src/b.ts', originalContent: '1', modifiedContent: '2' })
    expect(editor.tabs.value.map((tab) => tab.path)).toEqual(['src/a.ts', 'src/b.ts'])
    expect(editor.activeFile.value).toBe('src/b.ts')

    editor.closeDiff()
    expect(editor.tabs.value.map((tab) => tab.path)).toEqual(['src/a.ts'])
    expect(editor.activeFile.value).toBe('src/a.ts')
  })

  it('follows change events from the provider', () => {
    const { provider, emit } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: false },
    ])
    const editor = renderEditor(provider)
    provider.setActiveTab('src/b.ts')
    emit()
    expect(editor.activeFile.value).toBe('src/b.ts')
  })
})
