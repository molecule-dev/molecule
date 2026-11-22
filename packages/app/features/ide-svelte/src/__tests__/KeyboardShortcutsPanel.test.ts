// @vitest-environment jsdom

/**
 * `KeyboardShortcutsPanel`'s document key listener — a port of
 * `@molecule/app-ide-react/src/__tests__/KeyboardShortcutsPanel.test.tsx` with
 * the same test names and the same behavioral assertions, mounted through
 * Svelte 5's own `mount`/`flushSync`. The listener is registered once and reads
 * the component's CURRENT shortcuts and selection, so after the caller changes
 * `shortcuts` the very next key acts on the new list (a stale listener would
 * clamp to the old length and run the old entry).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ShortcutEntry } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import KeyboardShortcutsPanelHost from './KeyboardShortcutsPanelHost.svelte'
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

/** The mount alive right now, torn down before the next test. */
let instance: Record<string, unknown> | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; the panel scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onDismiss.mockClear()
})

afterEach(async () => {
  if (instance) await unmount(instance as never)
  instance = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel with the given shortcuts.
 *
 * @param shortcuts - The rows to show.
 * @returns The mount instance and its container.
 */
function renderPanel(shortcuts: ShortcutEntry[]): {
  instance: Record<string, unknown>
  container: HTMLElement
} {
  if (instance) void unmount(instance as never)
  document.body.innerHTML = ''
  const target = document.createElement('div')
  document.body.appendChild(target)
  const mounted = mount(KeyboardShortcutsPanelHost, {
    target,
    props: { theme: buildThemeProvider(), shortcuts, onDismiss },
  }) as Record<string, unknown>
  flushSync()
  instance = mounted
  container = target
  return { instance: mounted, container: target }
}

describe('KeyboardShortcutsPanel keyboard navigation', () => {
  it('runs the selected row on Enter and dismisses', () => {
    const first = vi.fn()
    const second = vi.fn()
    renderPanel([shortcut('First', first), shortcut('Second', second)])

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('acts on the shortcuts the caller just replaced, without re-registering', () => {
    const first = vi.fn()
    const second = vi.fn()
    const third = vi.fn()
    const mounted = renderPanel([shortcut('First', first), shortcut('Second', second)])

    ;(mounted.instance.setShortcuts as (next: ShortcutEntry[]) => void)([
      shortcut('First', first),
      shortcut('Second', second),
      shortcut('Third', third),
    ])
    flushSync()

    // Two downs reach the row the NEW list has at index 2 — a listener holding
    // the old two-entry list would stop at index 1.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(third).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  it('dismisses on Escape', () => {
    renderPanel([shortcut('First', vi.fn())])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
