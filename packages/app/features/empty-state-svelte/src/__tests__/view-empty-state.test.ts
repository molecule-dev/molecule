// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `EmptyState`'s selected-view mode — a port of
 * `@molecule/app-empty-state-react/src/__tests__/view-empty-state.test.tsx`,
 * rendered with a real Svelte mount (jsdom).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import EmptyState from '../EmptyState.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts the empty state through the kit's binding host.
 *
 * @param props - The props to pass.
 * @returns The markup the component produced.
 */
const render = (props: Record<string, unknown>): string => {
  const instance = mount(Host, {
    target: document.body,
    props: { config: {}, setMoleculeContext, component: EmptyState, props },
  })
  flushSync()
  const markup = document.body.innerHTML
  unmount(instance)
  document.body.innerHTML = ''
  return markup
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('view-owned empty states', () => {
  it('keeps a selected list message and its recovery action together', () => {
    const emptyByView = {
      all: {
        title: 'No orders yet',
        action: raw('<a href="/orders/new">Create an order</a>'),
      },
      assigned: {
        title: 'Your assigned orders are empty',
        description: 'Choose an order from the full list to assign it.',
        action: raw('<a href="/orders">Browse all orders</a>'),
      },
    }
    const markup = render({ view: emptyByView.assigned })
    expect(markup).toContain('Your assigned orders are empty')
    expect(markup).toContain('Choose an order from the full list to assign it.')
    expect(markup).toContain('<a href="/orders">Browse all orders</a>')
    expect(markup).not.toContain('No orders yet')
  })

  it('keeps the existing generic empty state valid without a recovery action', () => {
    const markup = render({ title: 'No records yet' })
    expect(markup).toContain('No records yet')
    expect(markup).not.toContain('<a')
  })

  it('renders an app-owned button action without assuming a router or a URL', () => {
    const markup = render({
      view: {
        title: 'No matching documents',
        action: raw('<button type="button">Clear filters</button>'),
      },
    })
    expect(markup).toContain('No matching documents')
    expect(markup).toContain('<button type="button">Clear filters</button>')
  })
})
