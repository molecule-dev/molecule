// @vitest-environment jsdom
/**
 * An interactive Card is announced as a button and sits in the tab order, so Enter and Space
 * activate it the way they activate a native button. Keys pressed in a control inside the card,
 * and keys on a card that is not interactive, do nothing. A port of
 * `@molecule/app-ui-react/src/__tests__/card-keyboard.test.tsx` rendered with Solid.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const CALLABLE = new Set(['card', 'cardPadding'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return () => prop
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'

const { Card } = await import('../components/Card.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Mounts the Card with Solid's browser renderer and returns the container. */
function mount(interactive: boolean, onClick: () => void, children?: JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <Card interactive={interactive} onClick={onClick}>
          {children ?? 'Clickable card'}
        </Card>
      ),
      container,
    ),
  )
  return container
}

/** Dispatches a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('Card keyboard activation', () => {
  it.each(['Enter', ' '])('an interactive card calls onClick on %j', (key) => {
    const onClick = vi.fn()
    mount(true, onClick)
    pressKey(document.querySelector('[role="button"]')!, key)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('other keys on an interactive card do nothing', () => {
    const onClick = vi.fn()
    mount(true, onClick)
    pressKey(document.querySelector('[role="button"]')!, 'a')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('Enter in a control inside an interactive card belongs to that control', () => {
    const onClick = vi.fn()
    mount(true, onClick, <input aria-label="Note" />)
    pressKey(document.querySelector('input[aria-label="Note"]')!, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a card that is not interactive is not focusable and ignores Enter', () => {
    const onClick = vi.fn()
    const container = mount(false, onClick)
    const card = container.firstElementChild as HTMLElement
    expect(card.hasAttribute('tabindex')).toBe(false)
    expect(card.hasAttribute('role')).toBe(false)
    pressKey(card, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })
})
