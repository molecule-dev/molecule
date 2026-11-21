// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Solid `<NotificationCenter>`'s item
 * rows — a port of
 * `@molecule/app-notification-center-react/src/__tests__/notification-center.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus a row and fire Enter / Space
 * and assert the item's click handler runs — proving the clickable row behaves
 * like a native button.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
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

import { NotificationCenter } from '../NotificationCenter.jsx'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** The clickable row's wrapper (the `<li>`'s button surface). */
const rowOf = (container: HTMLElement): HTMLElement | null =>
  container.querySelector('ul > li:first-child > div')

/** Fires a keydown with the given key on the row. */
const keyDown = (row: HTMLElement, key: string): void => {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('NotificationCenter keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const container = mount(() => (
      <NotificationCenter items={[{ id: '1', title: 'Click me', onClick }]} />
    ))
    const row = rowOf(container)
    expect(row?.getAttribute('role')).toBe('button')
    expect(row?.getAttribute('tabindex')).toBe('0')
    row?.focus()
    expect(document.activeElement).toBe(row)
    if (row) keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', () => {
    const onClick = vi.fn()
    const container = mount(() => (
      <NotificationCenter items={[{ id: '1', title: 'Click me', onClick }]} />
    ))
    const row = rowOf(container)
    if (row) keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const container = mount(() => (
      <NotificationCenter items={[{ id: '1', title: 'Click me', onClick }]} />
    ))
    const row = rowOf(container)
    if (row) {
      keyDown(row, 'a')
      keyDown(row, 'Tab')
    }
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const container = mount(() => (
      <NotificationCenter items={[{ id: '1', title: 'Not clickable', read: true }]} />
    ))
    const row = rowOf(container)
    expect(row?.getAttribute('role')).toBeNull()
    expect(row?.getAttribute('tabindex')).toBeNull()
  })
})
