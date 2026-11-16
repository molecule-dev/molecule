// @vitest-environment jsdom
/**
 * Unit tests for the Vue `EmptyState`'s selected-view mode — a port of
 * `@molecule/app-empty-state-react/src/__tests__/view-empty-state.test.tsx`,
 * rendered with Vue in jsdom.
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { type Component, createApp, defineComponent, h } from 'vue'

import { EmptyState } from '../EmptyState.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a component in jsdom and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - The props to pass.
 * @returns The rendered markup.
 */
const render = (component: Component, props: Record<string, unknown> = {}): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('view-owned empty states', () => {
  it('keeps a selected list message and its recovery action together', () => {
    const emptyByView = {
      all: {
        title: 'No orders yet',
        action: h('a', { href: '/orders/new' }, 'Create an order'),
      },
      assigned: {
        title: 'Your assigned orders are empty',
        description: 'Choose an order from the full list to assign it.',
        action: h('a', { href: '/orders' }, 'Browse all orders'),
      },
    }
    const markup = render(EmptyState, { view: emptyByView.assigned })
    expect(markup).toContain('Your assigned orders are empty')
    expect(markup).toContain('Choose an order from the full list to assign it.')
    expect(markup).toContain('<a href="/orders">Browse all orders</a>')
    expect(markup).not.toContain('No orders yet')
  })

  it('keeps the existing generic empty state valid without a recovery action', () => {
    const markup = render(EmptyState, { title: 'No records yet' })
    expect(markup).toContain('No records yet')
    expect(markup).not.toContain('<a')
  })

  it('renders an app-owned button action without assuming a router or a URL', () => {
    const markup = render(EmptyState, {
      view: {
        title: 'No matching documents',
        action: h('button', { type: 'button' }, 'Clear filters'),
      },
    })
    expect(markup).toContain('No matching documents')
    expect(markup).toContain('<button type="button">Clear filters</button>')
  })

  it('renders only the selected view when a generic title is passed too', () => {
    // Vue's flat props object cannot express React's union, so the generic
    // title beside a view is type-valid; the component must still ignore it,
    // as React's `view ?? { … }` does.
    const markup = render(EmptyState, {
      title: 'Nothing here',
      view: {
        title: 'No assigned work',
        action: h('button', { type: 'button' }, 'Clear filters'),
      },
    })
    expect(markup).toContain('No assigned work')
    expect(markup).not.toContain('Nothing here')
  })
})
