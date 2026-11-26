// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Vue `<NotificationCenter>`'s item rows
 * — a port of
 * `@molecule/app-notification-center-react/src/__tests__/notification-center.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus a row and fire Enter / Space
 * and assert the item's click handler runs — proving the clickable row behaves
 * like a native button.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h } from 'vue'

import { NotificationCenter } from '../NotificationCenter.js'
import type { NotificationItem } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** The clickable row's wrapper (the `<li>`'s button surface). */
const row = (host: HTMLElement): HTMLElement | null =>
  host.querySelector('ul > li:first-child > div')

/**
 * Mounts an {@link NotificationCenter} with one item and returns its row.
 *
 * @param item - The single item to render.
 */
const render = (item: NotificationItem): { row: HTMLElement | null; unmount: () => void } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(NotificationCenter, { items: [item] }) }))
  app.mount(host)
  return { row: row(host), unmount: () => app.unmount() }
}

/** Fires a keydown with the given key on the row. */
const keyDown = (row: HTMLElement, key: string): void => {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('NotificationCenter keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const { row, unmount } = render({ id: '1', title: 'Click me', onClick })
    expect(row?.getAttribute('role')).toBe('button')
    expect(row?.getAttribute('tabindex')).toBe('0')
    row?.focus()
    expect(document.activeElement).toBe(row)
    if (row) keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('fires onClick on Space', () => {
    const onClick = vi.fn()
    const { row, unmount } = render({ id: '1', title: 'Click me', onClick })
    if (row) keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const { row, unmount } = render({ id: '1', title: 'Click me', onClick })
    if (row) {
      keyDown(row, 'a')
      keyDown(row, 'Tab')
    }
    expect(onClick).not.toHaveBeenCalled()
    unmount()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const { row, unmount } = render({ id: '1', title: 'Not clickable', read: true })
    expect(row?.getAttribute('role')).toBeNull()
    expect(row?.getAttribute('tabindex')).toBeNull()
    unmount()
  })
})
