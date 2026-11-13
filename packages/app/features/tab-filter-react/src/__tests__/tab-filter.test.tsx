import { createElement } from 'react'
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { TabFilter } = await import('../TabFilter.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const tabs = [
  { id: 'all', label: 'All', count: 42 },
  { id: 'open', label: 'Open', count: 8 },
  { id: 'closed', label: 'Closed', disabled: true },
]

describe('TabFilter', () => {
  it('renders a tablist with one tab per entry', () => {
    const markup = html(createElement(TabFilter, { tabs, activeId: 'all', onChange: () => {} }))
    expect(markup).toContain('role="tablist"')
    expect(markup.match(/role="tab"/g) ?? []).toHaveLength(3)
    expect(markup).toContain('All')
    expect(markup).toContain('Open')
    expect(markup).toContain('Closed')
  })

  it('marks the active tab with aria-selected="true"', () => {
    const markup = html(createElement(TabFilter, { tabs, activeId: 'open', onChange: () => {} }))
    expect(markup.match(/aria-selected="true"/g) ?? []).toHaveLength(1)
  })

  it('renders the count badge when a tab has a count', () => {
    const markup = html(createElement(TabFilter, { tabs, activeId: 'all', onChange: () => {} }))
    expect(markup).toContain('(42)')
    expect(markup).toContain('(8)')
  })

  it('disables a tab flagged disabled', () => {
    const markup = html(createElement(TabFilter, { tabs, activeId: 'all', onChange: () => {} }))
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the tab icon', () => {
    const markup = html(
      createElement(TabFilter, {
        tabs: [{ id: 'a', label: 'A', icon: createElement('i', { 'data-icon': '' }) }],
        activeId: 'a',
        onChange: () => {},
      }),
    )
    expect(markup).toContain('data-icon=""')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(TabFilter, { tabs, activeId: 'all', onChange: () => {}, className: 'tf-cls' }),
    )
    expect(markup).toContain('tf-cls')
  })
})

it.each(['notes', 'drafts'])(
  'keeps the collection default reachable from selected %s tabs',
  (activeId) => {
    const onChange = vi.fn()
    const props = {
      tabs: [{ id: activeId, label: activeId }],
      defaultTab: { id: 'all', label: 'All documents' },
      activeId,
      onChange,
    }
    const markup = html(createElement(TabFilter, props))
    expect(markup).toContain('All documents')
    expect(markup.match(/role="tab"/g)).toHaveLength(2)
    const tree = TabFilter(props)
    const children = (tree.props as { children: { props: { onClick: () => void } }[] }).children
    children[0]!.props.onClick()
    expect(onChange).toHaveBeenCalledWith('all')
  },
)

it('keeps one default tab when the supplied tabs already contain it', () => {
  const markup = html(
    createElement(TabFilter, {
      tabs,
      defaultTab: { id: 'all', label: 'All documents' },
      activeId: 'all',
      onChange: () => {},
    }),
  )
  expect(markup.match(/data-mol-id="tab-filter-all"/g)).toHaveLength(1)
  expect(markup).toContain('All documents')
})
