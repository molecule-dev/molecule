// @vitest-environment jsdom
/**
 * Unit tests for the Vue `RelatedItemsCard` — a port of
 * `@molecule/app-related-items-card-react/src/__tests__/related-items-card.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The Card marker the React tests mock `@molecule/app-ui-react` with: a
// `data-card` element carrying the className it received. `data-mol-id`
// arrives as a fallthrough attribute on the root element.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
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

/** Renders a {@link RelatedItemsCard} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(RelatedItemsCard, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

interface Item {
  name: string
}

/** The React tests' item list and renderer. */
const items: Item[] = [{ name: 'Deal A' }, { name: 'Deal B' }]
const renderItem = (item: Item): VNodeChild => h('span', { 'data-item': item.name }, item.name)

describe('RelatedItemsCard', () => {
  it('renders the title in an <h3> and each item', () => {
    const markup = render({ title: 'Deals', items, renderItem })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Deals')
    expect(markup).toContain('data-item="Deal A"')
    expect(markup).toContain('data-item="Deal B"')
  })

  it('renders the icon and headerActions slots', () => {
    const markup = render(
      { title: 'T', items, renderItem },
      {
        icon: () => [h('span', { 'data-icon': '' })],
        headerActions: () => [h('button', { 'data-actions': '' })],
      },
    )
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the emptyState when items is empty', () => {
    const markup = render(
      { title: 'T', items: [], renderItem },
      { emptyState: () => [h('p', { 'data-empty': '' }, 'No related items')] },
    )
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

  it('renders the title and icon when passed as same-named slots', () => {
    const markup = render(
      { items, renderItem },
      {
        title: () => [h('strong', 'Deals')],
        icon: () => [h('span', { 'data-icon': '' })],
      },
    )
    expect(markup).toContain('<strong>Deals</strong>')
    expect(markup).toContain('data-icon=""')
  })
})
