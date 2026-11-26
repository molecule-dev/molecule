// @vitest-environment jsdom

/**
 * Exercises keyboard navigation inside the kit dialog. A signal supplies later
 * shortcut lists, and the next key uses the new list and current selection.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { Accessor } from 'solid-js'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ShortcutEntry } from '@molecule/app-ide-panel-logic'
import { ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { KeyboardShortcutsPanel } from '../components/KeyboardShortcutsPanel.jsx'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)

/** The root this file last mounted, disposed before the next render. */
let dispose: (() => void) | null = null

/**
 * A shortcut row whose execution is observable.
 *
 * @param label - The row label.
 * @param execute - The action the row runs.
 * @returns The shortcut entry.
 */
function shortcut(label: string, execute: () => void): ShortcutEntry {
  return { label, keys: 'Cmd K', category: 'General', execute }
}

const onDismiss = vi.fn()

/** A panel mounted from a live shortcut list the test can replace. */
interface MountedPanel {
  /** Replace the rows the caller passes, as React's `rerender` would. */
  setShortcuts: (shortcuts: ShortcutEntry[]) => void
  /** The rows currently mounted, as accessor. */
  shortcuts: Accessor<ShortcutEntry[]>
}

/**
 * Renders the panel, wrapped in the theme provider it resolves its mode from,
 * from a signal the test drives.
 *
 * @param initial - The rows to show first.
 * @returns The setters that stand in for React's `rerender`.
 */
function renderPanel(initial: ShortcutEntry[]): MountedPanel {
  dispose?.()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const [shortcuts, setShortcuts] = createSignal(initial)
  dispose = render(
    () => (
      <ThemeContext.Provider value={themeProvider}>
        <KeyboardShortcutsPanel shortcuts={shortcuts()} onDismiss={onDismiss} />
      </ThemeContext.Provider>
    ),
    host,
  )
  return { setShortcuts, shortcuts }
}

/**
 * Dispatches one key press the way a keyboard user sends it.
 *
 * @param key - The key.
 */
function keyDown(key: string): void {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) throw new Error('Expected a shortcuts dialog')
  dialog.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; the panel scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onDismiss.mockClear()
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('KeyboardShortcutsPanel keyboard navigation', () => {
  it('runs the selected row on Enter and dismisses', () => {
    const first = vi.fn()
    const second = vi.fn()
    renderPanel([shortcut('First', first), shortcut('Second', second)])

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
    const panel = renderPanel([shortcut('First', first), shortcut('Second', second)])

    panel.setShortcuts([
      shortcut('First', first),
      shortcut('Second', second),
      shortcut('Third', third),
    ])

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
