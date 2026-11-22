// @vitest-environment jsdom

/**
 * EditorPanel's formatting toast: when it appears and when it leaves.
 *
 * The toast is driven by `formattingFile === activeFile`. Both edges are
 * committed in the render that sees the new value (React's "adjust state when
 * a prop changes" pattern), not from an effect on a later render — so the toast
 * is in the DOM the moment formatting starts, and its 300ms exit animation
 * still delays the removal after formatting stops.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  EditorChangeEvent,
  EditorPosition,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { EditorProvider as EditorProviderContext, ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { EditorPanel } from '../components/EditorPanel.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The one file the fake editor has open (and active). */
const APP = '/workspace/src/app.ts'

/** The text the toast shows (the untranslated default). */
const TOAST_TEXT = 'Formatting…'

/**
 * A minimal in-memory editor provider: one active tab, no Monaco.
 * @returns The provider to hand to {@link EditorProviderContext}.
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

/** Wrap children in the editor + theme contexts (i18n rides the bonded provider). */
function wrap(children: ReactNode, provider: EditorProvider): JSX.Element {
  return (
    <ThemeProvider provider={buildThemeProvider()}>
      <EditorProviderContext provider={provider}>{children}</EditorProviderContext>
    </ThemeProvider>
  )
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
  vi.useRealTimers()
  cleanup()
})

describe('EditorPanel formatting toast', () => {
  it('shows the toast for the active file and keeps it through the exit animation', () => {
    const provider = createEditorProvider()
    const { container, rerender } = render(wrap(<EditorPanel formattingFile={APP} />, provider))

    // Visible in the very first committed render of the formatting state.
    expect(container.textContent).toContain(TOAST_TEXT)

    // Formatting stopped: the toast stays in the DOM for its 300ms exit
    // animation, then leaves.
    rerender(wrap(<EditorPanel formattingFile={null} />, provider))
    expect(container.textContent).toContain(TOAST_TEXT)
    act(() => {
      vi.advanceTimersByTime(350)
    })
    expect(container.textContent).not.toContain(TOAST_TEXT)
  })

  it('shows the toast in the commit that starts formatting', () => {
    const provider = createEditorProvider()
    const { container, rerender } = render(wrap(<EditorPanel formattingFile={null} />, provider))
    expect(container.textContent).not.toContain(TOAST_TEXT)

    rerender(wrap(<EditorPanel formattingFile={APP} />, provider))
    expect(container.textContent).toContain(TOAST_TEXT)
  })

  it('never shows the toast for a file that is not the active one', () => {
    const provider = createEditorProvider()
    const { container } = render(
      wrap(<EditorPanel formattingFile="/workspace/other.ts" />, provider),
    )
    expect(container.textContent).not.toContain(TOAST_TEXT)
  })
})
