// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `RelatedItemsCard` — a port of
 * `@molecule/app-related-items-card-react/src/__tests__/related-items-card.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first — the same mock the React tests use.
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

// app-ui-svelte's Card, stubbed with the `data-card` marker the React suite's
// `@molecule/app-ui-react` stub renders.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Card } = await import('./stubs/CardStub.svelte')
  return { Card }
})

import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

import RelatedItemsCard from '../RelatedItemsCard.svelte'
import type { RelatedItemsCardProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Renders a {@link RelatedItemsCard} and returns the markup it produced. */
const render = (props: RelatedItemsCardProps<Item>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(Subject, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(component)
  target.remove()
  return markup
}

interface Item {
  name: string
}

/** The component bound to this suite's concrete item type, so `mount` checks its props. */
const Subject: Component<RelatedItemsCardProps<Item>> = RelatedItemsCard

/** The React tests' item list and renderer (a snippet taking the item and its index). */
const items: Item[] = [{ name: 'Deal A' }, { name: 'Deal B' }]
const renderItem = createRawSnippet((item: () => Item) => ({
  render: () => `<span data-item="${item().name}">${item().name}</span>`,
}))

describe('RelatedItemsCard', () => {
  it('renders the title in an <h3> and each item', () => {
    const markup = render({ title: 'Deals', items, renderItem })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Deals')
    expect(markup).toContain('data-item="Deal A"')
    expect(markup).toContain('data-item="Deal B"')
  })

  it('renders the icon and headerActions slots', () => {
    const markup = render({
      title: 'T',
      items,
      renderItem,
      icon: raw('<span data-icon></span>'),
      headerActions: raw('<button data-actions></button>'),
    })
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the emptyState when items is empty', () => {
    const markup = render({
      title: 'T',
      items: [],
      renderItem,
      emptyState: raw('<p data-empty>No related items</p>'),
    })
    expect(markup).toContain('data-empty=""')
  })

  it('renders a "View all" link when viewAllHref is supplied', () => {
    const markup = render({ title: 'T', items, renderItem, viewAllHref: '/deals' })
    expect(markup).toContain('href="/deals"')
    expect(markup).toContain('View all')
  })

  it('still renders every item row when onItemClick is supplied', () => {
    const markup = render({ title: 'T', items, renderItem, onItemClick: () => {} })
    expect(markup.match(/<li/g) ?? []).toHaveLength(2)
    expect(markup).toContain('data-item="Deal A"')
    expect(markup).toContain('data-item="Deal B"')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = render({
      title: 'T',
      items,
      renderItem,
      dataMolId: 'ric-x',
      className: 'ric-cls',
    })
    expect(markup).toContain('data-mol-id="ric-x"')
    expect(markup).toContain('ric-cls')
  })
})
