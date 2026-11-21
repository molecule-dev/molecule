// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Solid `RelatedItemsCard` — a port of
 * `@molecule/app-related-items-card-react/src/__tests__/related-items-card.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus a row's button-role control
 * and fire Enter/Space and assert the click handler runs — proving a clickable
 * row behaves like a native button.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RelatedItemsCardProps } from '../types.js'

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

vi.mock('@molecule/app-ui-solid', () => ({
  Card: (props: { children?: JSX.Element; className?: string; 'data-mol-id'?: string }) => (
    <div data-card="" data-mol-id={props['data-mol-id']} class={props.className}>
      {props.children}
    </div>
  ),
}))

const { RelatedItemsCard } = await import('../RelatedItemsCard.jsx')

interface Item {
  name: string
}

/** The React keyboard tests' item list and renderer. */
const items: Item[] = [{ name: 'Deal A' }, { name: 'Deal B' }]
const renderItem = (item: Item): JSX.Element => <span data-item={item.name}>{item.name}</span>

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Render with Solid's browser renderer and return the host element.
 *
 * @param props - The card props.
 */
function mountCard(props: RelatedItemsCardProps<Item>): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <RelatedItemsCard {...props} />, container))
  return container
}

/** A row's button-role control (the first row's). */
const rowControl = (host: HTMLElement): HTMLElement => {
  const control = host.querySelector<HTMLElement>('li > [role="button"]')
  if (!control) throw new Error('the row control did not render')
  return control
}

/** Fires a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('RelatedItemsCard keyboard accessibility', () => {
  it('renders a focusable button-role element when onItemClick is given', () => {
    const host = mountCard({ title: 'T', items, renderItem, onItemClick: () => {} })
    const control = rowControl(host)
    expect(control.getAttribute('tabindex')).toBe('0')
    control.focus()
    expect(document.activeElement).toBe(control)
  })

  it('click on a row calls onItemClick', () => {
    const onItemClick = vi.fn()
    const host = mountCard({ title: 'T', items, renderItem, onItemClick })
    rowControl(host).click()
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('enter key activates the row', () => {
    const onItemClick = vi.fn()
    const host = mountCard({ title: 'T', items, renderItem, onItemClick })
    pressKey(rowControl(host), 'Enter')
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('space key activates the row', () => {
    const onItemClick = vi.fn()
    const host = mountCard({ title: 'T', items, renderItem, onItemClick })
    pressKey(rowControl(host), ' ')
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('other keys are ignored', () => {
    const onItemClick = vi.fn()
    const host = mountCard({ title: 'T', items, renderItem, onItemClick })
    const control = rowControl(host)
    pressKey(control, 'a')
    pressKey(control, 'Tab')
    expect(onItemClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onItemClick is given', () => {
    const host = mountCard({ title: 'T', items, renderItem })
    expect(host.querySelector('li > [role="button"]')).toBeNull()
  })
})
