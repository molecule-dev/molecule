import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => '' }),
}))

import { EmptyState } from '../EmptyState.js'

describe('view-owned empty states', () => {
  it('keeps a selected list message and its recovery action together', () => {
    const emptyByView = {
      all: {
        title: 'No orders yet',
        action: createElement('a', { href: '/orders/new' }, 'Create an order'),
      },
      assigned: {
        title: 'Your assigned orders are empty',
        description: 'Choose an order from the full list to assign it.',
        action: createElement('a', { href: '/orders' }, 'Browse all orders'),
      },
    }
    const markup = renderToStaticMarkup(createElement(EmptyState, { view: emptyByView.assigned }))
    expect(markup).toContain('Your assigned orders are empty')
    expect(markup).toContain('Choose an order from the full list to assign it.')
    expect(markup).toContain('<a href="/orders">Browse all orders</a>')
    expect(markup).not.toContain('No orders yet')
  })

  it('keeps the existing generic empty state valid without a recovery action', () => {
    const markup = renderToStaticMarkup(createElement(EmptyState, { title: 'No records yet' }))
    expect(markup).toContain('No records yet')
    expect(markup).not.toContain('<a')
  })

  it('renders an app-owned button action without assuming a router or a URL', () => {
    const markup = renderToStaticMarkup(
      createElement(EmptyState, {
        view: {
          title: 'No matching documents',
          action: createElement('button', { type: 'button' }, 'Clear filters'),
        },
      }),
    )
    expect(markup).toContain('No matching documents')
    expect(markup).toContain('<button type="button">Clear filters</button>')
  })
})
