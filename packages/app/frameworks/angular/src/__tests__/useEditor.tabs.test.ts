// @vitest-environment jsdom

/**
 * `useEditor` reports the provider's own tab list: `activeFile` is the tab
 * marked active, read at mount and after every action that changes the tabs.
 *
 * This is React's `useEditor.tabs.test.tsx` against the Angular function; each
 * title is React's. Only the framework-forced mechanics change: a mounted probe
 * component replaces a render, and the editor state is read through signals.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type {
  DiffFile,
  EditorChangeEvent,
  EditorFile,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'

import { useEditor } from '../hooks/use-ide.js'
import { provideMolecule } from '../providers.js'

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
    getTabs: vi.fn<EditorProvider['getTabs']>(() => tabs.map((tab) => ({ ...tab }))),
    onChange: vi.fn<EditorProvider['onChange']>((callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
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
    mount: vi.fn<EditorProvider['mount']>(),
    dispose: vi.fn<EditorProvider['dispose']>(),
    getCursorPosition: vi.fn<EditorProvider['getCursorPosition']>(() => null),
    setCursorPosition: vi.fn<EditorProvider['setCursorPosition']>(),
    focus: vi.fn<EditorProvider['focus']>(),
    updateConfig: vi.fn<EditorProvider['updateConfig']>(),
  }
  // The hook only needs the notification; the event payload is unused here.
  return {
    provider,
    emit: () => listeners.forEach((listener) => listener({ path: '', content: '', version: 0 })),
  }
}

/**
 * Mounts one probe component under the given providers and renders it once.
 *
 * @param component - The probe component class.
 * @param providers - The providers the probe injects (usually `provideMolecule`).
 * @returns The mounted fixture.
 */
function mount<P>(
  component: Type<P>,
  ...providers: (Provider | EnvironmentProviders)[]
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Mounts `useEditor` against the given provider.
 *
 * @param provider - The editor provider to inject.
 * @returns The mounted fixture, whose component holds the editor result.
 */
function renderEditor(provider: EditorProvider): ComponentFixture<EditorProbeComponent> {
  return mount(EditorProbeComponent, provideMolecule({ editor: provider }))
}

/** Reads the editor the probe mounted. */
@Component({ selector: 'app-test-editor-tabs-probe', template: '' })
class EditorProbeComponent {
  readonly editor = useEditor()
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

describe('useEditor tabs and active file', () => {
  it('reports a tab that is already active at mount', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: false },
      { path: 'src/b.ts', label: 'b.ts', isDirty: false, isActive: true },
    ])
    const fixture = renderEditor(provider)
    expect(fixture.componentInstance.editor.activeFile()).toBe('src/b.ts')
  })

  it('reports no active file after setActiveTab on a path with no tab', () => {
    const { provider } = memoryEditor([
      { path: 'src/a.ts', label: 'a.ts', isDirty: false, isActive: true },
    ])
    const fixture = renderEditor(provider)
    fixture.componentInstance.editor.setActiveTab('src/missing.ts')
    expect(fixture.componentInstance.editor.activeFile()).toBeNull()
  })

  it('shows the diff tab as soon as openDiff returns, and drops it on closeDiff', () => {
    const { provider } = memoryEditor()
    const fixture = renderEditor(provider)
    const editor = fixture.componentInstance.editor
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
    const fixture = renderEditor(provider)
    provider.setActiveTab('src/b.ts')
    emit()
    expect(fixture.componentInstance.editor.activeFile()).toBe('src/b.ts')
  })
})
