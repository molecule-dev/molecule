// @vitest-environment jsdom

/**
 * Exercises keyboard navigation inside the kit dialog. The next key uses
 * the latest shortcuts and selection.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { KeyboardShortcutsPanelProps, ShortcutEntry } from '@molecule/app-ide-panel-logic'
import { ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { KeyboardShortcutsPanel } from '../components/KeyboardShortcutsPanel.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * A shortcut row whose execution is observable.
 * @param label - The row label.
 * @param execute - The action the row runs.
 * @returns The shortcut entry.
 */
function shortcut(label: string, execute: () => void): ShortcutEntry {
  return { label, keys: 'Cmd K', category: 'General', execute }
}

const onDismiss = vi.fn()

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; the panel scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onDismiss.mockClear()
})

afterEach(cleanup)

/**
 * The panel, wrapped in the theme provider it resolves its mode from.
 * @param shortcuts - The rows to show.
 * @returns The wrapped panel element.
 */
function panel(shortcuts: ShortcutEntry[]): ReactElement {
  const props: KeyboardShortcutsPanelProps = { shortcuts, onDismiss }
  return (
    <ThemeProvider provider={buildThemeProvider()}>
      <KeyboardShortcutsPanel {...props} />
    </ThemeProvider>
  )
}

/**
 * Render the panel with the given shortcuts.
 * @param shortcuts - The rows to show.
 * @returns The render result.
 */
function renderPanel(shortcuts: ShortcutEntry[]): ReturnType<typeof render> {
  return render(panel(shortcuts))
}

/**
 * Dispatches a key from the portaled shortcuts dialog.
 * @param key - The pressed key.
 */
function keyDown(key: string): void {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) throw new Error('Expected a shortcuts dialog')
  fireEvent.keyDown(dialog, { key })
}

describe('KeyboardShortcutsPanel keyboard navigation', () => {
  it('runs the selected row on Enter and dismisses', () => {
    const first = vi.fn()
    const second = vi.fn()
    renderPanel([shortcut('First', first), shortcut('Second', second)])

    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(first).not.toHaveBeenCalled()
    expect(onDismiss).not.toHaveBeenCalled()

    keyDown('ArrowDown')
    keyDown('Enter')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('acts on the shortcuts the caller just replaced, without re-registering', () => {
    const first = vi.fn()
    const second = vi.fn()
    const third = vi.fn()
    const { rerender } = renderPanel([shortcut('First', first), shortcut('Second', second)])

    rerender(
      panel([shortcut('First', first), shortcut('Second', second), shortcut('Third', third)]),
    )

    // Two downs reach the row the NEW list has at index 2 — a listener holding
    // the old two-entry list would stop at index 1.
    keyDown('ArrowDown')
    keyDown('ArrowDown')
    keyDown('Enter')

    expect(third).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  it('dismisses on Escape', () => {
    renderPanel([shortcut('First', vi.fn())])
    keyDown('Escape')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
