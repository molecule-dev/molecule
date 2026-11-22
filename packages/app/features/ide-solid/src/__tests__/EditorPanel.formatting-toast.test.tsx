// @vitest-environment jsdom

/**
 * EditorPanel's formatting toast: when it appears and when it leaves.
 *
 * The toast is driven by `formattingFile === activeFile`. Both edges are
 * committed in the frame that sees the new value, not from a later effect — so
 * the toast is in the DOM the moment formatting starts, and its 300ms exit
 * animation still delays the removal after formatting stops.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/EditorPanel.formatting-toast.test.tsx`
 * with the same test names and the same behavioral assertions. Solid has no
 * `rerender`: `formattingFile` is read through a signal, so changing it is a
 * signal write the mounted panel sees, as React's re-render does.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  EditorChangeEvent,
  EditorPosition,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'
import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { EditorContext, ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { EditorPanel } from '../components/EditorPanel.jsx'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)

/** The one file the fake editor has open (and active). */
const APP = '/workspace/src/app.ts'

/** The text the toast shows (the untranslated default). */
const TOAST_TEXT = 'Formatting…'

/**
 * A minimal in-memory editor provider: one active tab, no Monaco.
 *
 * @returns The provider to hand to {@link EditorContext}.
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

/** The root this file last mounted, disposed before the next render. */
let dispose: (() => void) | null = null

/** A live panel whose formatting input the test drives. */
interface MountedPanel {
  /** The element the panel mounted into. */
  host: HTMLElement
  /** Sets the file currently being formatted (null when formatting stopped). */
  setFormattingFile: (path: string | null) => void
}

/**
 * Mounts the panel over the editor + theme contexts it needs.
 *
 * @param initialFormattingFile - The file formatting starts on (null for none).
 * @param provider - The fake editor provider.
 * @returns The host and the setter that stands in for React's `rerender`.
 */
function renderPanel(initialFormattingFile: string | null, provider: EditorProvider): MountedPanel {
  dispose?.()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const [formattingFile, setFormattingFile] = createSignal<string | null>(initialFormattingFile)
  dispose = render(
    () => (
      <ThemeContext.Provider value={themeProvider}>
        <EditorContext.Provider value={provider}>
          <EditorPanel formattingFile={formattingFile()} />
        </EditorContext.Provider>
      </ThemeContext.Provider>
    ),
    host,
  )
  return { host, setFormattingFile }
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  vi.useFakeTimers()
  // jsdom does not implement scrollIntoView; the tab bar scrolls the active
  // tab into view after every active-file change.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  dispose?.()
  dispose = null
  vi.useRealTimers()
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('EditorPanel formatting toast', () => {
  it('shows the toast for the active file and keeps it through the exit animation', () => {
    const provider = createEditorProvider()
    const panel = renderPanel(APP, provider)

    // Visible in the very first committed render of the formatting state.
    expect(panel.host.textContent).toContain(TOAST_TEXT)

    // Formatting stopped: the toast stays in the DOM for its 300ms exit
    // animation, then leaves.
    panel.setFormattingFile(null)
    expect(panel.host.textContent).toContain(TOAST_TEXT)
    vi.advanceTimersByTime(350)
    expect(panel.host.textContent).not.toContain(TOAST_TEXT)
  })

  it('shows the toast in the commit that starts formatting', () => {
    const provider = createEditorProvider()
    const panel = renderPanel(null, provider)
    expect(panel.host.textContent).not.toContain(TOAST_TEXT)

    panel.setFormattingFile(APP)
    expect(panel.host.textContent).toContain(TOAST_TEXT)
  })

  it('never shows the toast for a file that is not the active one', () => {
    const provider = createEditorProvider()
    const panel = renderPanel('/workspace/other.ts', provider)
    expect(panel.host.textContent).not.toContain(TOAST_TEXT)
  })
})
