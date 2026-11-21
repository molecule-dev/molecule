// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for `<RelatedItemsCard>` — the clickable rows.
 * Renders into a real DOM (jsdom) so we can focus a row's button-role control
 * and fire Enter/Space and assert the click handler runs — proving a clickable
 * row behaves like a native button.
 *
 * @module
 */

import { act, createElement, type ReactElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop): (...args: unknown[]) => string {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        // Callable for method-style props, and stringifies to the token so
        // bare `className={cm.cursorPointer}` usage stays inspectable.
        const fn = (..._args: unknown[]): string => token
        fn.toString = (): string => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-react', () => ({
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

import type { RelatedItemsCardProps } from '../RelatedItemsCard.js'

const { RelatedItemsCard } = await import('../RelatedItemsCard.js')

interface Item {
  name: string
}

const items: Item[] = [{ name: 'Deal A' }, { name: 'Deal B' }]
const renderItem = (it: Item): ReactElement =>
  createElement('span', { 'data-item': it.name }, it.name)

/** A row's button-role control (the first row's). */
const rowControl = (host: HTMLElement): HTMLElement => {
  const control = host.querySelector<HTMLElement>('li > [role="button"]')
  if (!control) throw new Error('the row control did not render')
  return control
}

/** Mounted roots, unmounted after each test. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
})

/**
 * Mounts the component into the document (the string renderer cannot fire
 * events) and returns its host element.
 */
const mount = (props: RelatedItemsCardProps<Item>): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(createElement<RelatedItemsCardProps<Item>>(RelatedItemsCard, props))
  })
  mounted.push(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
  })
  return host
}

/** Dispatches a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('RelatedItemsCard keyboard accessibility', () => {
  it('renders a focusable button-role element when onItemClick is given', () => {
    const host = mount({ title: 'T', items, renderItem, onItemClick: () => {} })
    const control = rowControl(host)
    expect(control.getAttribute('tabindex')).toBe('0')
    control.focus()
    expect(document.activeElement).toBe(control)
  })

  it('click on a row calls onItemClick', () => {
    const onItemClick = vi.fn()
    const host = mount({ title: 'T', items, renderItem, onItemClick })
    rowControl(host).click()
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('enter key activates the row', () => {
    const onItemClick = vi.fn()
    const host = mount({ title: 'T', items, renderItem, onItemClick })
    pressKey(rowControl(host), 'Enter')
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('space key activates the row', () => {
    const onItemClick = vi.fn()
    const host = mount({ title: 'T', items, renderItem, onItemClick })
    pressKey(rowControl(host), ' ')
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('other keys are ignored', () => {
    const onItemClick = vi.fn()
    const host = mount({ title: 'T', items, renderItem, onItemClick })
    const control = rowControl(host)
    pressKey(control, 'a')
    pressKey(control, 'Tab')
    expect(onItemClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onItemClick is given', () => {
    const host = mount({ title: 'T', items, renderItem })
    expect(host.querySelector('li > [role="button"]')).toBeNull()
  })
})
