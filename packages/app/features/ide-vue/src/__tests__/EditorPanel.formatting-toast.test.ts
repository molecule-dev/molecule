// @vitest-environment jsdom
/**
 * EditorPanel's formatting toast: when it appears and when it leaves — the Vue
 * port of `@molecule/app-ide-react/src/__tests__/EditorPanel.formatting-toast.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Vue's own `createApp`.
 *
 * The toast is driven by `formattingFile === activeFile`. The show edge is read
 * by the panel's own formatting watch, so the toast is in the DOM as soon as the
 * formatting state renders, and its 300ms exit animation still delays the
 * removal after formatting stops.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, shallowReactive, type VNodeChild } from 'vue'

import type {
  EditorChangeEvent,
  EditorPosition,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { moleculePlugin } from '@molecule/app-vue'

import { EditorPanel } from '../components/EditorPanel.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The one file the fake editor has open (and active). */
const APP = '/workspace/src/app.ts'

/** The text the toast shows (the untranslated default). */
const TOAST_TEXT = 'Formatting…'

/**
 * A minimal in-memory editor provider: one active tab, no Monaco.
 *
 * @returns The provider to hand to the plugin.
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

/** The live props the host passes down; reassigning them is the test's `rerender`. */
const live = shallowReactive<{ formattingFile?: string }>({ formattingFile: undefined })

/** The mount alive right now, if any. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  vi.useFakeTimers()
  // jsdom does not implement scrollIntoView; the tab bar scrolls the active
  // tab into view after every active-file change.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

/**
 * Mounts the panel with the given formatting file.
 *
 * @param formattingFile - The file being formatted, or `undefined`.
 * @returns The mount container and a `rerender`.
 */
function renderPanel(formattingFile?: string): {
  container: HTMLElement
  rerender: (next: string | undefined) => Promise<void>
} {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  live.formattingFile = formattingFile
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(EditorPanel, { formattingFile: live.formattingFile }),
    }),
  )
  app.use(moleculePlugin, {
    i18n: createSimpleI18nProvider('en'),
    theme: buildThemeProvider(),
    editor: createEditorProvider(),
  })
  mounted.app = app
  app.mount(container)
  return {
    container,
    rerender: async (next): Promise<void> => {
      live.formattingFile = next
      await nextTick()
      await nextTick()
    },
  }
}

describe('EditorPanel formatting toast', () => {
  it('shows the toast for the active file and keeps it through the exit animation', async () => {
    const { container, rerender } = renderPanel(APP)
    await nextTick()

    // Visible in the very first committed render of the formatting state.
    expect(container.textContent).toContain(TOAST_TEXT)

    // Formatting stopped: the toast stays in the DOM for its 300ms exit
    // animation, then leaves.
    await rerender(undefined)
    expect(container.textContent).toContain(TOAST_TEXT)
    vi.advanceTimersByTime(350)
    await nextTick()
    expect(container.textContent).not.toContain(TOAST_TEXT)
  })

  it('shows the toast in the commit that starts formatting', async () => {
    const { container, rerender } = renderPanel(undefined)
    await nextTick()
    expect(container.textContent).not.toContain(TOAST_TEXT)

    await rerender(APP)
    expect(container.textContent).toContain(TOAST_TEXT)
  })

  it('never shows the toast for a file that is not the active one', async () => {
    const { container } = renderPanel('/workspace/other.ts')
    await nextTick()
    expect(container.textContent).not.toContain(TOAST_TEXT)
  })
})
