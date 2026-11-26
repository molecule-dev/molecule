// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Svelte `RelatedItemsCard` — a port of
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

vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Card } = await import('./stubs/CardStub.svelte')
  return { ...(await importOriginal<Record<string, unknown>>()), Card }
})

import { type Component, createRawSnippet, flushSync, mount, unmount } from 'svelte'

import RelatedItemsCard from '../RelatedItemsCard.svelte'
import type { RelatedItemsCardProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

interface Item {
  name: string
}

/** The component bound to this suite's concrete item type, so `mount` checks its props. */
const Subject: Component<RelatedItemsCardProps<Item>> = RelatedItemsCard

/** The React keyboard tests' item list and renderer. */
const items: Item[] = [{ name: 'Deal A' }, { name: 'Deal B' }]
const renderItem = createRawSnippet((item: () => Item) => ({
  render: () => `<span data-item="${item().name}">${item().name}</span>`,
}))

/**
 * Mounts a {@link RelatedItemsCard} and returns its host element plus cleanup.
 *
 * @param props - The card props.
 */
const render = (props: RelatedItemsCardProps<Item>): { host: HTMLElement; unmount: () => void } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const component = mount(Subject, { target: host, props })
  flushSync()
  return { host, unmount: () => unmount(component) }
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
