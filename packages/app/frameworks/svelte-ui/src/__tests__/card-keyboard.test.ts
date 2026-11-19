// @vitest-environment jsdom
/**
 * An interactive Card is announced as a button and sits in the tab order, so Enter and Space
 * activate it the way they activate a native button. Keys pressed in a control inside the card,
 * and keys on a card that is not interactive, do nothing. A port of
 * `@molecule/app-ui-react/src/__tests__/card-keyboard.test.tsx` rendered with Svelte.
 *
 * @module
 */
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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

import { type Component, createRawSnippet, flushSync, mount, unmount } from 'svelte'

import type { CardProps } from '../types.js'

const { default: Card } = await import('../components/Card.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
})

/** Mounts the Card and returns the card element. */
function mountCard(interactive: boolean, onClick: () => void, children?: string): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const childSnippet = createRawSnippet(() => ({
    // createRawSnippet's render must return one element, so even the plain
    // text child is wrapped.
    render: () => children ?? '<span>Clickable card</span>',
  }))
  mounted.push(
    mount(Card as Component<{ interactive?: boolean; onClick: () => void; children?: object }>, {
      target: host,
      props: { interactive, onClick, children: childSnippet },
    }),
  )
  return (
    interactive ? host.querySelector('[role="button"]') : host.firstElementChild
  ) as HTMLElement
}

/** Mounts the Card with the given props around one child element; returns the card element. */
function mountCardWith(props: CardProps, childHtml: string): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const children = createRawSnippet(() => ({ render: () => childHtml }))
  mounted.push(mount(Card, { target: host, props: { ...props, children } }))
  // The event-forwarding action attaches in an effect; flush it as a render does.
  flushSync()
  const card = host.firstElementChild
  if (!(card instanceof HTMLElement)) throw new Error('the Card rendered no element')
  return card
}

/** Dispatches a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('Card keyboard activation', () => {
  it.each(['Enter', ' '])('an interactive card calls onClick on %j', (key) => {
    const onClick = vi.fn()
    const card = mountCard(true, onClick)
    pressKey(card, key)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('the synthetic click carries a real click event', () => {
    const onClick = vi.fn()
    const card = mountCard(true, onClick)
    pressKey(card, 'Enter')
    expect(onClick).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'click' }))
  })

  it('other keys on an interactive card do nothing', () => {
    const onClick = vi.fn()
    const card = mountCard(true, onClick)
    pressKey(card, 'a')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('Enter in a control inside an interactive card belongs to that control', () => {
    const onClick = vi.fn()
    mountCard(true, onClick, '<input aria-label="Note" />')
    pressKey(document.querySelector('input[aria-label="Note"]')!, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a card that is not interactive is not focusable and ignores Enter', () => {
    const onClick = vi.fn()
    const card = mountCard(false, onClick)
    expect(card.hasAttribute('tabindex')).toBe(false)
    expect(card.hasAttribute('role')).toBe(false)
    pressKey(card, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })

  it("the caller's onKeyDown runs before the activation", () => {
    const calls: string[] = []
    const card = mountCardWith(
      {
        interactive: true,
        onClick: () => calls.push('click'),
        onKeyDown: () => calls.push('keydown'),
      },
      '<span>Clickable card</span>',
    )
    pressKey(card, 'Enter')
    expect(calls).toEqual(['keydown', 'click'])
  })

  it("preventDefault in the caller's onKeyDown cancels the activation", () => {
    const onClick = vi.fn()
    const card = mountCardWith(
      { interactive: true, onClick, onKeyDown: (event) => event.preventDefault() },
      '<span>Clickable card</span>',
    )
    pressKey(card, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Card forwards its declared props', () => {
  it('id, title, onFocus, onBlur and onDoubleClick reach the card', () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    const onDoubleClick = vi.fn()
    const card = mountCardWith(
      { testId: 'billing', id: 'billing-card', title: 'Billing', onFocus, onBlur, onDoubleClick },
      '<button type="button">Edit</button>',
    )
    expect(card.id).toBe('billing-card')
    expect(card.title).toBe('Billing')
    // React's onFocus and onBlur hear focus moving onto and off a control inside the card.
    const edit = card.querySelector('button')!
    edit.focus()
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onFocus.mock.calls[0][0].target).toBe(edit)
    edit.blur()
    expect(onBlur).toHaveBeenCalledTimes(1)
    card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })
})
