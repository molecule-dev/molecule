// @vitest-environment jsdom
/**
 * Keyboard-access tests for the Vue tag chip — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-chip-keyboard.test.tsx`:
 * the same test names and the same assertions, rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { TagChip } from '../TagChip.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts one chip and returns its host element.
 *
 * @param tree - The chip to render.
 * @returns The mounted host.
 */
const mount = (tree: () => VNodeChild): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  createApp(defineComponent({ render: tree })).mount(host)
  return host
}

/**
 * Presses a key on an element.
 *
 * @param el - The element.
 * @param key - The key name.
 * @returns Whether the event's default was left unprevented.
 */
const press = (el: Element, key: string): boolean =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

/**
 * Clicks an element.
 *
 * @param el - The element.
 */
const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/** The chip body control in the mounted tree. */
const body = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('[role="button"]')
  if (!el) throw new Error('no chip body control')
  return el
}

describe('TagChip keyboard access', () => {
  it('exposes a clickable chip body as a tabbable role="button"', () => {
    const host = mount(() => h(TagChip, { onClick: () => {} }, { default: () => 'react' }))
    const chip = body(host)
    expect(chip.tagName).toBe('SPAN')
    expect(chip.getAttribute('tabindex')).toBe('0')
    expect(chip.getAttribute('role')).toBe('button')
  })

  it('fires onClick for Enter and Space on the focused chip body', () => {
    const onClick = vi.fn()
    const host = mount(() => h(TagChip, { onClick }, { default: () => 'react' }))
    const chip = body(host)
    press(chip, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
    press(chip, ' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('ignores keys other than Enter and Space on the chip body', () => {
    const onClick = vi.fn()
    const host = mount(() => h(TagChip, { onClick }, { default: () => 'react' }))
    press(body(host), 'Escape')
    press(body(host), 'a')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('still fires onClick when the chip body is clicked with the mouse', () => {
    const onClick = vi.fn()
    const host = mount(() => h(TagChip, { onClick }, { default: () => 'react' }))
    click(body(host))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('moves the body action onto a native label button when a remove button is present', () => {
    const onClick = vi.fn()
    const onRemove = vi.fn()
    const host = mount(() => h(TagChip, { onClick, onRemove }, { default: () => 'react' }))
    // The chip holds two controls, so the container stays non-interactive.
    const label = host.querySelector<HTMLElement>('button:not([aria-label])')
    if (!label) throw new Error('no label button')
    expect(label.tagName).toBe('BUTTON')
    expect(label.getAttribute('type')).toBe('button')
    const container = label.parentElement as HTMLElement
    expect(container.tagName).toBe('SPAN')
    expect(container.getAttribute('role')).toBeNull()
    expect(container.getAttribute('tabindex')).toBeNull()

    click(label)
    expect(onClick).toHaveBeenCalledTimes(1)

    const remove = host.querySelector<HTMLElement>('button[aria-label="Remove"]')
    if (!remove) throw new Error('no remove button')
    click(remove)
    expect(onRemove).toHaveBeenCalledTimes(1)
    // Activating remove must not fall through to the body action.
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('keeps a remove-only chip a static container whose remove button works', () => {
    const onRemove = vi.fn()
    const host = mount(() => h(TagChip, { onRemove }, { default: () => 'react' }))
    // Exactly one control: the remove button. The chip itself is not one.
    const buttons = host.querySelectorAll<HTMLElement>('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Remove')
    expect(
      Array.from(host.querySelectorAll('span'))
        .find((el) => el.textContent === 'react')
        ?.parentElement?.getAttribute('role'),
    ).toBeNull()
    click(buttons[0]!)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('renders a chip with no handlers as plain static markup', () => {
    const host = mount(() => h(TagChip, null, { default: () => 'react' }))
    expect(host.querySelector('[role="button"]')).toBeNull()
    expect(host.textContent).toContain('react')
  })
})
