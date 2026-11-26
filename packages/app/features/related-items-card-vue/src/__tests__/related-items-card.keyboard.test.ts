// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Vue `RelatedItemsCard` — a port of
 * `@molecule/app-related-items-card-react/src/__tests__/related-items-card.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus a row's button-role control
 * and fire Enter/Space and assert the click handler runs — proving a clickable
 * row behaves like a native button.
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

vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Card: defineComponent({
      name: 'Card',
      props: { className: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', class: props.className }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { RelatedItemsCard } from '../RelatedItemsCard.js'

afterEach(() => {
  document.body.innerHTML = ''
})

interface Item {
  name: string
}

/** The React keyboard tests' item list and renderer. */
const items: Item[] = [{ name: 'Deal A' }, { name: 'Deal B' }]
const renderItem = (item: Item): VNodeChild => h('span', { 'data-item': item.name }, item.name)

/**
 * The props of {@link RelatedItemsCard}: the component declares its runtime
 * props inline (each node prop may also arrive as a same-named slot), so
 * derive them from its public instance rather than restating the contract.
 */
type CardProps = InstanceType<typeof RelatedItemsCard>['$props']

/**
 * Mounts a {@link RelatedItemsCard} and returns its host element plus cleanup.
 *
 * @param props - The card props.
 */
const render = (props: CardProps): { host: HTMLElement; unmount: () => void } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(RelatedItemsCard, props) }))
  app.mount(host)
  return { host, unmount: () => app.unmount() }
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
    const { host, unmount } = render({ title: 'T', items, renderItem, onItemClick: () => {} })
    const control = rowControl(host)
    expect(control.getAttribute('tabindex')).toBe('0')
    control.focus()
    expect(document.activeElement).toBe(control)
    unmount()
  })

  it('click on a row calls onItemClick', () => {
    const onItemClick = vi.fn()
    const { host, unmount } = render({ title: 'T', items, renderItem, onItemClick })
    rowControl(host).click()
    expect(onItemClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('enter key activates the row', () => {
    const onItemClick = vi.fn()
    const { host, unmount } = render({ title: 'T', items, renderItem, onItemClick })
    pressKey(rowControl(host), 'Enter')
    expect(onItemClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('space key activates the row', () => {
    const onItemClick = vi.fn()
    const { host, unmount } = render({ title: 'T', items, renderItem, onItemClick })
    pressKey(rowControl(host), ' ')
    expect(onItemClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('other keys are ignored', () => {
    const onItemClick = vi.fn()
    const { host, unmount } = render({ title: 'T', items, renderItem, onItemClick })
    const control = rowControl(host)
    pressKey(control, 'a')
    pressKey(control, 'Tab')
    expect(onItemClick).not.toHaveBeenCalled()
    unmount()
  })

  it('is not keyboard-interactive (no button role) when no onItemClick is given', () => {
    const { host, unmount } = render({ title: 'T', items, renderItem })
    expect(host.querySelector('li > [role="button"]')).toBeNull()
    unmount()
  })
})
