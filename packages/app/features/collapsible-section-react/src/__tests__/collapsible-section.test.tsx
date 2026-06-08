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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { CollapsibleSection, ShowMore } = await import('../CollapsibleSection.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('CollapsibleSection', () => {
  it('renders the title and starts collapsed', () => {
    const markup = html(
      createElement(CollapsibleSection, {
        title: 'Key concepts',
        children: createElement('p', { 'data-body': '' }, 'hidden body'),
      }),
    )
    expect(markup).toContain('Key concepts')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('data-body=""')
  })

  it('renders the body when defaultExpanded is true', () => {
    const markup = html(
      createElement(CollapsibleSection, {
        title: 'T',
        defaultExpanded: true,
        children: createElement('p', { 'data-body': '' }),
      }),
    )
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('data-body=""')
  })

  it('respects the controlled expanded prop', () => {
    const markup = html(
      createElement(CollapsibleSection, {
        title: 'T',
        expanded: true,
        children: createElement('p', { 'data-body': '' }),
      }),
    )
    expect(markup).toContain('data-body=""')
  })

  it('renders the badge and actions slots', () => {
    const markup = html(
      createElement(CollapsibleSection, {
        title: 'T',
        children: null,
        badge: createElement('span', { 'data-badge': '' }),
        actions: createElement('span', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the heading at the requested level', () => {
    const markup = html(createElement(CollapsibleSection, { title: 'T', children: null, level: 2 }))
    expect(markup).toContain('<h2')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(CollapsibleSection, { title: 'T', children: null, className: 'cs-cls' }),
    )
    expect(markup).toContain('cs-cls')
  })
})

describe('ShowMore', () => {
  const items = (n: number): ReturnType<typeof createElement>[] =>
    Array.from({ length: n }, (_, i) => createElement('div', { 'data-item': i }, `item-${i}`))

  it('renders only the initialCount items by default', () => {
    const markup = html(createElement(ShowMore, { children: items(5), initialCount: 3 }))
    expect(markup).toContain('item-0')
    expect(markup).toContain('item-2')
    expect(markup).not.toContain('item-3')
  })

  it('renders a "Show N more" toggle when there are extra items', () => {
    const markup = html(createElement(ShowMore, { children: items(5), initialCount: 3 }))
    expect(markup).toContain('Show 2 more')
  })

  it('renders no toggle when all items fit within initialCount', () => {
    const markup = html(createElement(ShowMore, { children: items(2), initialCount: 3 }))
    expect(markup).not.toContain('Show')
  })

  it('forwards className', () => {
    const markup = html(createElement(ShowMore, { children: items(1), className: 'sm-cls' }))
    expect(markup).toContain('sm-cls')
  })
})
