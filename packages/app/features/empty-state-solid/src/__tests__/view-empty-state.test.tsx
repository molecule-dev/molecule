// @vitest-environment jsdom
/**
 * Unit tests for the Solid `EmptyState`'s selected-view mode — a port of
 * `@molecule/app-empty-state-react/src/__tests__/view-empty-state.test.tsx`,
 * rendered with Solid in jsdom.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

const { EmptyState } = await import('../EmptyState.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Render with Solid's browser renderer and dispose after the test.
 *
 * @param view - The view to mount.
 * @returns The container element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('view-owned empty states', () => {
  it('keeps a selected list message and its recovery action together', () => {
    const emptyByView = {
      all: {
        title: 'No orders yet',
        action: <a href="/orders/new">Create an order</a>,
      },
      assigned: {
        title: 'Your assigned orders are empty',
        description: 'Choose an order from the full list to assign it.',
        action: <a href="/orders">Browse all orders</a>,
      },
    }
    const markup = mount(() => <EmptyState view={emptyByView.assigned} />).innerHTML
    expect(markup).toContain('Your assigned orders are empty')
    expect(markup).toContain('Choose an order from the full list to assign it.')
    expect(markup).toContain('<a href="/orders">Browse all orders</a>')
    expect(markup).not.toContain('No orders yet')
  })

  it('keeps the existing generic empty state valid without a recovery action', () => {
    const markup = mount(() => <EmptyState title="No records yet" />).innerHTML
    expect(markup).toContain('No records yet')
    expect(markup).not.toContain('<a')
  })

  it('renders an app-owned button action without assuming a router or a URL', () => {
    const markup = mount(() => (
      <EmptyState
        view={{
          title: 'No matching documents',
          action: <button type="button">Clear filters</button>,
        }}
      />
    )).innerHTML
    expect(markup).toContain('No matching documents')
    expect(markup).toContain('<button type="button">Clear filters</button>')
  })
})
