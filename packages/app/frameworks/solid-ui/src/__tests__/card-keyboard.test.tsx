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
  return mountView(() => (
    <Card interactive={interactive} onClick={onClick}>
      {children ?? 'Clickable card'}
    </Card>
  ))
}

/** Mounts a view with Solid's browser renderer and returns the container. */
function mountView(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
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

  it("the caller's onKeyDown runs before the activation", () => {
    const calls: string[] = []
    mountView(() => (
      <Card interactive onClick={() => calls.push('click')} onKeyDown={() => calls.push('keydown')}>
        Clickable card
      </Card>
    ))
    pressKey(document.querySelector('[role="button"]')!, 'Enter')
    expect(calls).toEqual(['keydown', 'click'])
  })

  it("preventDefault in the caller's onKeyDown cancels the activation", () => {
    const onClick = vi.fn()
    mountView(() => (
      <Card interactive onClick={onClick} onKeyDown={(event) => event.preventDefault()}>
        Clickable card
      </Card>
    ))
    pressKey(document.querySelector('[role="button"]')!, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Card forwards its declared props', () => {
  it('id, title, onFocus, onBlur and onDoubleClick reach the card', () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    const onDoubleClick = vi.fn()
    mountView(() => (
      <Card
        testId="billing"
        id="billing-card"
        title="Billing"
        onFocus={onFocus}
        onBlur={onBlur}
        onDoubleClick={onDoubleClick}
      >
        <button type="button">Edit</button>
      </Card>
    ))
    const card = document.querySelector<HTMLElement>('[data-testid="billing"]')!
    expect(card.id).toBe('billing-card')
    expect(card.title).toBe('Billing')
    // React's onFocus and onBlur hear focus moving onto and off a control inside the card.
    const edit = document.querySelector('button')!
    edit.focus()
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onFocus.mock.calls[0][0].target).toBe(edit)
    edit.blur()
    expect(onBlur).toHaveBeenCalledTimes(1)
    card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })
})
