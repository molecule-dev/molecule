// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for `<NotificationCenter>`'s item rows — a port
 * of
 * `@molecule/app-notification-center-react/src/__tests__/notification-center.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus a row and fire Enter / Space
 * and assert the item's click handler runs — proving the clickable row behaves
 * like a native button.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import NotificationCenter from '../NotificationCenter.svelte'
import type { NotificationItem } from '../types.js'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts a `NotificationCenter` with one item and returns its row wrapper.
 *
 * @param item - The single item to render.
 */
const render = (item: NotificationItem): HTMLElement | null => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(NotificationCenter, { target, props: { items: [item] } }))
  flushSync()
  return target.querySelector('ul > li:first-child > div')
}

/** Fires a keydown with the given key on the row. */
const keyDown = (row: HTMLElement, key: string): void => {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('NotificationCenter keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const row = render({ id: '1', title: 'Click me', onClick })
    expect(row?.getAttribute('role')).toBe('button')
    expect(row?.getAttribute('tabindex')).toBe('0')
    row?.focus()
    expect(document.activeElement).toBe(row)
    if (row) keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', () => {
    const onClick = vi.fn()
    const row = render({ id: '1', title: 'Click me', onClick })
    if (row) keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const row = render({ id: '1', title: 'Click me', onClick })
    if (row) {
      keyDown(row, 'a')
      keyDown(row, 'Tab')
    }
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const row = render({ id: '1', title: 'Not clickable', read: true })
    expect(row?.getAttribute('role')).toBeNull()
    expect(row?.getAttribute('tabindex')).toBeNull()
  })
})
