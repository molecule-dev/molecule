// @vitest-environment jsdom
/**
 * An interactive Card is announced as a button and sits in the tab order, so Enter and Space
 * activate it the way they activate a native button. Keys pressed in a control inside the card,
 * and keys on a card that is not interactive, do nothing.
 *
 * Vue port of `@molecule/app-ui-react`'s `card-keyboard` test, rendered with real Vue.
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

import { createApp, h, type RenderFunction } from 'vue'

const { Card } = await import('../components/Card.js')

/**
 * Dispatches a bubbling, cancelable keydown on an element — the same user
 * input React's `fireEvent.keyDown` sends.
 * @param element - The element that receives the key press.
 * @param key - The `KeyboardEvent.key` value.
 */
function pressKey(element: Element, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * Mounts a render function into a fresh host, runs the assertions, unmounts.
 * @param render - The component render.
 * @param assert - The assertions.
 */
async function withMount(
  render: RenderFunction,
  assert: () => void | Promise<void>,
): Promise<void> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  app.mount(host)
  try {
    await assert()
  } finally {
    app.unmount()
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Card keyboard activation', () => {
  it.each(['Enter', ' '])('an interactive card calls onClick on %j', async (key) => {
    const onClick = vi.fn()
    await withMount(
      () => h(Card, { interactive: true, onClick }, () => 'Clickable card'),
      () => {
        pressKey(document.querySelector('[role="button"]')!, key)
        expect(onClick).toHaveBeenCalledTimes(1)
      },
    )
  })

  it('other keys on an interactive card do nothing', async () => {
    const onClick = vi.fn()
    await withMount(
      () => h(Card, { interactive: true, onClick }, () => 'Clickable card'),
      () => {
        pressKey(document.querySelector('[role="button"]')!, 'a')
        expect(onClick).not.toHaveBeenCalled()
      },
    )
  })

  it('Enter in a control inside an interactive card belongs to that control', async () => {
    const onClick = vi.fn()
    await withMount(
      () => h(Card, { interactive: true, onClick }, () => h('input', { 'aria-label': 'Note' })),
      () => {
        pressKey(document.querySelector('input')!, 'Enter')
        expect(onClick).not.toHaveBeenCalled()
      },
    )
  })

  it('a card that is not interactive is not focusable and ignores Enter', async () => {
    const onClick = vi.fn()
    await withMount(
      () => h(Card, { testId: 'plain', onClick }, () => 'Plain card'),
      () => {
        const card = document.querySelector<HTMLElement>('[data-testid="plain"]')!
        expect(card.hasAttribute('tabindex')).toBe(false)
        expect(card.hasAttribute('role')).toBe(false)
        pressKey(card, 'Enter')
        expect(onClick).not.toHaveBeenCalled()
      },
    )
  })

  it("the caller's onKeyDown runs before the activation", async () => {
    const calls: string[] = []
    await withMount(
      () =>
        h(
          Card,
          {
            interactive: true,
            onClick: () => calls.push('click'),
            onKeyDown: () => calls.push('keydown'),
          },
          () => 'Clickable card',
        ),
      () => {
        pressKey(document.querySelector('[role="button"]')!, 'Enter')
        expect(calls).toEqual(['keydown', 'click'])
      },
    )
  })

  it("preventDefault in the caller's onKeyDown cancels the activation", async () => {
    const onClick = vi.fn()
    await withMount(
      () =>
        h(
          Card,
          {
            interactive: true,
            onClick,
            onKeyDown: (event: KeyboardEvent) => event.preventDefault(),
          },
          () => 'Clickable card',
        ),
      () => {
        pressKey(document.querySelector('[role="button"]')!, 'Enter')
        expect(onClick).not.toHaveBeenCalled()
      },
    )
  })
})

describe('Card forwards its declared props', () => {
  it('id, title, onFocus, onBlur and onDoubleClick reach the card', async () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    const onDoubleClick = vi.fn()
    await withMount(
      () =>
        h(
          Card,
          {
            testId: 'billing',
            id: 'billing-card',
            title: 'Billing',
            onFocus,
            onBlur,
            onDoubleClick,
          },
          () => h('button', { type: 'button' }, 'Edit'),
        ),
      () => {
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
      },
    )
  })
})
