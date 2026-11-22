// @vitest-environment jsdom
/**
 * `KeyboardShortcutsPanel`'s document key listener — the Vue port of
 * `@molecule/app-ide-react/src/__tests__/KeyboardShortcutsPanel.test.tsx` with
 * the same test names and the same behavioral assertions, mounted through Vue's
 * own `createApp`. The listener reads the LATEST shortcuts and selection
 * reactively, so after the caller changes `shortcuts` the very next key acts on
 * the new list (a stale listener would clamp to the old length and run the old
 * entry).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ShortcutEntry } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { KeyboardShortcutsPanel } from '../components/KeyboardShortcutsPanel.js'
import { buildThemeProvider } from './theme-test-provider.js'

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
const mounted: { app?: ReturnType<typeof createApp> } = {}
/** The rows the host passes down; reassigning it is the test's `rerender`. */
const shortcuts = ref<ShortcutEntry[]>([])

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; the panel scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onDismiss.mockClear()
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

/**
 * Mounts the panel with the given shortcuts.
 *
 * @param initial - The rows to show.
 */
function renderPanel(initial: ShortcutEntry[]): void {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  shortcuts.value = initial
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(KeyboardShortcutsPanel, { shortcuts: shortcuts.value, onDismiss }),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
}

/**
 * Re-renders the panel with a new shortcut list.
 *
 * @param next - The next rows to show.
 */
async function rerender(next: ShortcutEntry[]): Promise<void> {
  shortcuts.value = next
  await nextTick()
}

/**
 * Fires a key press at `document` the way the user would.
 *
 * @param key - The key value.
 */
function keyDown(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

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

  it('acts on the shortcuts the caller just replaced, without re-registering', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const third = vi.fn()
    renderPanel([shortcut('First', first), shortcut('Second', second)])

    await rerender([shortcut('First', first), shortcut('Second', second), shortcut('Third', third)])

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
