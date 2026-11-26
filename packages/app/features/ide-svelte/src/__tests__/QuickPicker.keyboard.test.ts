// @vitest-environment jsdom

/**
 * `QuickPicker`'s keyboard driving.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/QuickPicker.test.tsx` with
 * the same test names and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`.
 *
 * These tests pin that the handlers read the CURRENT items/selection (the
 * picker is used with a fresh `items` array on every keystroke-driven filter)
 * and that changing the list resets the selection in the same render, so Enter
 * always acts on the row the user sees highlighted.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import QuickPickerPropsHost from './QuickPickerPropsHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** A label-only row (the structural subset of the picker's item type). */
interface PickerItem {
  id: string
  label: string
}

/**
 * Rows, identified by id.
 *
 * @param ids - The row ids, in list order.
 * @returns The rows.
 */
function itemsOf(...ids: string[]): PickerItem[] {
  return ids.map((id) => ({ id, label: id.toUpperCase() }))
}

/** Tears down the mount alive right now, if any. */
let teardown: (() => Promise<void>) | null = null
let container: HTMLElement | null = null

const onSelect = vi.fn()
const onDismiss = vi.fn()

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; QuickPicker scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onSelect.mockClear()
  onDismiss.mockClear()
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the picker with the given items.
 *
 * @param items - The picker's rows.
 * @returns The container and a row-list replacer.
 */
function render(items: PickerItem[]): {
  container: HTMLElement
  setItems: (next: PickerItem[]) => void
} {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  const mounted = mount(QuickPickerPropsHost, {
    target: container,
    props: {
      theme: buildThemeProvider(),
      initial: { items, onSelect, onDismiss },
    },
  })
  teardown = () => unmount(mounted)
  flushSync()
  const host = container
  return {
    container: host.ownerDocument.body,
    setItems: (next: PickerItem[]): void => {
      mounted.setProps({ items: next, onSelect, onDismiss })
      flushSync()
    },
  }
}

/**
 * Presses a key on an element like a user does (bubbling, cancelable).
 *
 * @param el - The element the key lands on.
 * @param key - The key value.
 */
function keyDown(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  flushSync()
}

describe('QuickPicker keyboard', () => {
  it('selects the highlighted row with Enter and moves with the arrows', () => {
    const { container: host } = render(itemsOf('a', 'b'))
    const input = host.ownerDocument.querySelector('input') as HTMLInputElement

    keyDown(input, 'ArrowDown')
    keyDown(input, 'Enter')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'b' })
  })

  it('reads the latest items after the caller replaces the list', () => {
    const { container: host, setItems } = render(itemsOf('a', 'b'))
    const input = host.ownerDocument.querySelector('input') as HTMLInputElement
    keyDown(input, 'ArrowDown')
    keyDown(input, 'Enter')
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'b' })

    // A new list resets the selection to its first row in the same render.
    setItems(itemsOf('c', 'd'))
    keyDown(input, 'Enter')
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect.mock.calls[1][0]).toMatchObject({ id: 'c' })
  })
})
