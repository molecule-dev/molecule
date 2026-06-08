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

const { LeaderboardList } = await import('../LeaderboardList.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('LeaderboardList', () => {
  it('renders its children', () => {
    const markup = html(
      createElement(LeaderboardList, {
        children: [
          createElement('div', { key: 'a', 'data-row': 'a' }),
          createElement('div', { key: 'b', 'data-row': 'b' }),
        ],
      }),
    )
    expect(markup).toContain('data-row="a"')
    expect(markup).toContain('data-row="b"')
  })

  it('renders the title and actions when present and omits the header otherwise', () => {
    const withHeader = html(
      createElement(LeaderboardList, {
        children: createElement('div', { 'data-row': '' }),
        title: 'Top players',
        actions: createElement('button', { 'data-actions': '' }),
      }),
    )
    expect(withHeader).toContain('Top players')
    expect(withHeader).toContain('data-actions=""')
    const without = html(
      createElement(LeaderboardList, { children: createElement('div', { 'data-row': '' }) }),
    )
    expect(without).not.toContain('<header')
  })

  it('renders the emptyState when there are no children', () => {
    const markup = html(
      createElement(LeaderboardList, {
        children: null,
        emptyState: createElement('p', { 'data-empty': '' }, 'No entries'),
      }),
    )
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('No entries')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(LeaderboardList, {
        children: createElement('div', { 'data-row': '' }),
        className: 'll-cls',
      }),
    )
    expect(markup).toContain('ll-cls')
  })
})
