// @vitest-environment jsdom

/**
 * EditorPanel's formatting toast: when it appears and when it leaves — a port
 * of `@molecule/app-ide-react/src/__tests__/EditorPanel.formatting-toast.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Svelte 5's own `mount`/`flushSync`.
 *
 * The toast is driven by `formattingFile === activeFile`. Both edges are in the
 * DOM in the render that sees the new value, so the toast is there the moment
 * formatting starts, and its 300ms exit animation still delays the removal
 * after formatting stops.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  EditorChangeEvent,
  EditorPosition,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import EditorPanelHost from './EditorPanelHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** The one file the fake editor has open (and active). */
const APP = '/workspace/src/app.ts'

/** The text the toast shows (the untranslated default). */
const TOAST_TEXT = 'Formatting…'

/**
 * A minimal in-memory editor provider: one active tab, no Monaco.
 * @returns The provider to hand to the editor context.
 */
function createEditorProvider(): EditorProvider {
  const tabs: EditorTab[] = [{ path: APP, label: 'app.ts', isDirty: false, isActive: true }]
  const listeners = new Set<(event: EditorChangeEvent) => void>()
  return {
    name: 'test',
    mount: vi.fn(),
    dispose: vi.fn(),
    openFile: vi.fn(),
    closeFile: vi.fn(),
    getContent: () => null,
    setContent: vi.fn(),
    getCursorPosition: (): EditorPosition | null => null,
    setCursorPosition: vi.fn(),
    focus: vi.fn(),
    onChange: (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    getTabs: () => tabs,
    setActiveTab: vi.fn(),
    updateConfig: vi.fn(),
  }
}

/** The mount alive right now, torn down before the next test. */
let instance: Record<string, unknown> | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  vi.useFakeTimers()
  // jsdom does not implement scrollIntoView; the tab bar scrolls the active
  // tab into view after every active-file change.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(async () => {
  if (instance) await unmount(instance as never)
  instance = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the editor panel with this formatting state.
 *
 * @param formattingFile - The file the host says is being formatted.
 * @returns The mount instance and its container.
 */
function render(formattingFile: string | null): {
  instance: Record<string, unknown>
  container: HTMLElement
} {
  if (instance) void unmount(instance as never)
  document.body.innerHTML = ''
  const target = document.createElement('div')
  document.body.appendChild(target)
  const mounted = mount(EditorPanelHost, {
    target,
    props: { theme: buildThemeProvider(), editor: createEditorProvider(), formattingFile },
  }) as Record<string, unknown>
  flushSync()
  instance = mounted
  container = target
  return { instance: mounted, container: target }
}

describe('EditorPanel formatting toast', () => {
  it('shows the toast for the active file and keeps it through the exit animation', () => {
    const mounted = render(APP)

    // Visible in the very first committed render of the formatting state.
    expect(mounted.container.textContent).toContain(TOAST_TEXT)

    // Formatting stopped: the toast stays in the DOM for its 300ms exit
    // animation, then leaves.
    ;(mounted.instance.setFormattingFile as (next: string | null) => void)(null)
    flushSync()
    expect(mounted.container.textContent).toContain(TOAST_TEXT)
    vi.advanceTimersByTime(350)
    flushSync()
    expect(mounted.container.textContent).not.toContain(TOAST_TEXT)
  })

  it('shows the toast in the commit that starts formatting', () => {
    const mounted = render(null)
    expect(mounted.container.textContent).not.toContain(TOAST_TEXT)

    ;(mounted.instance.setFormattingFile as (next: string | null) => void)(APP)
    flushSync()
    expect(mounted.container.textContent).toContain(TOAST_TEXT)
  })

  it('never shows the toast for a file that is not the active one', () => {
    const mounted = render('/workspace/other.ts')
    expect(mounted.container.textContent).not.toContain(TOAST_TEXT)
  })
})
