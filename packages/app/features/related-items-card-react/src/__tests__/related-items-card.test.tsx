import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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
        // Callable for method-style props, and stringifies to the token so
        // bare `className={cm.cursorPointer}` usage stays inspectable.
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-react', () => ({
  Card: ({
    children,
    className,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className }, children),
}))

const { RelatedItemsCard } = await import('../RelatedItemsCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const items = [{ name: 'Deal A' }, { name: 'Deal B' }]
const renderItem = (it: { name: string }) =>
  createElement('span', { 'data-item': it.name }, it.name)

describe('RelatedItemsCard', () => {
  it('renders the title in an <h3> and each item', () => {
    const markup = html(
      createElement(RelatedItemsCard<{ name: string }>, { title: 'Deals', items, renderItem }),
    )
    expect(markup).toContain('<h3')
    expect(markup).toContain('Deals')
    expect(markup).toContain('data-item="Deal A"')
    expect(markup).toContain('data-item="Deal B"')
  })

  it('renders the icon and headerActions slots', () => {
    const markup = html(
      createElement(RelatedItemsCard<{ name: string }>, {
        title: 'T',
        items,
        renderItem,
        icon: createElement('span', { 'data-icon': '' }),
        headerActions: createElement('button', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the emptyState when items is empty', () => {
    const markup = html(
      createElement(RelatedItemsCard<{ name: string }>, {
        title: 'T',
        items: [],
        renderItem,
        emptyState: createElement('p', { 'data-empty': '' }, 'No related items'),
      }),
    )
    expect(markup).toContain('data-empty=""')
  })

  it('renders a "View all" link when viewAllHref is supplied', () => {
    const markup = html(
      createElement(RelatedItemsCard<{ name: string }>, {
        title: 'T',
        items,
        renderItem,
        viewAllHref: '/deals',
      }),
    )
    expect(markup).toContain('href="/deals"')
    expect(markup).toContain('View all')
  })

  it('still renders every item row when onItemClick is supplied', () => {
    // onItemClick attaches an onclick handler (and a cursor-pointer class) to
    // each <li> — both are non-SSR-observable, so this asserts the list still
    // renders intact rather than the handler itself.
    const markup = html(
      createElement(RelatedItemsCard<{ name: string }>, {
        title: 'T',
        items,
        renderItem,
        onItemClick: () => {},
      }),
    )
    expect(markup.match(/<li/g) ?? []).toHaveLength(2)
    expect(markup).toContain('data-item="Deal A"')
    expect(markup).toContain('data-item="Deal B"')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html(
      createElement(RelatedItemsCard<{ name: string }>, {
        title: 'T',
        items,
        renderItem,
        dataMolId: 'ric-x',
        className: 'ric-cls',
      }),
    )
    expect(markup).toContain('data-mol-id="ric-x"')
    expect(markup).toContain('ric-cls')
  })
})
