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

const { Breadcrumb } = await import('../Breadcrumb.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

describe('Breadcrumb', () => {
  it('renders every crumb label', () => {
    const markup = html(createElement(Breadcrumb, { items }))
    expect(markup).toContain('Home')
    expect(markup).toContain('Projects')
    expect(markup).toContain('Alpha')
  })

  it('marks the last crumb as the current page', () => {
    const markup = html(createElement(Breadcrumb, { items }))
    expect(markup).toContain('aria-current="page"')
  })

  it('renders linked crumbs as anchors when no onNavigate is supplied', () => {
    const markup = html(createElement(Breadcrumb, { items }))
    expect(markup).toContain('href="/"')
    expect(markup).toContain('href="/projects"')
  })

  it('renders linked crumbs as buttons when onNavigate is supplied', () => {
    const markup = html(createElement(Breadcrumb, { items, onNavigate: () => {} }))
    expect(markup).toContain('<button')
    expect(markup).not.toContain('href="/projects"')
  })

  it('renders a crumb without `to` as plain text', () => {
    const markup = html(createElement(Breadcrumb, { items: [{ label: 'Just text' }] }))
    expect(markup).toContain('Just text')
    expect(markup).not.toContain('href')
    expect(markup).not.toContain('<button')
  })

  it('renders the default "/" separator between crumbs', () => {
    const markup = html(createElement(Breadcrumb, { items }))
    // two separators for three items
    expect(markup.split('aria-hidden="true">/').length - 1).toBe(2)
  })

  it('renders a custom separator node', () => {
    const markup = html(
      createElement(Breadcrumb, {
        items,
        separator: createElement('span', { 'data-sep': '' }, '>'),
      }),
    )
    expect(markup).toContain('data-sep=""')
  })

  it('renders crumb icons', () => {
    const markup = html(
      createElement(Breadcrumb, {
        items: [{ label: 'Home', to: '/', icon: createElement('i', { 'data-icon': '' }) }],
      }),
    )
    expect(markup).toContain('data-icon=""')
  })

  it('labels the nav region "Breadcrumb", sets data-mol-id, and forwards className', () => {
    const markup = html(
      createElement(Breadcrumb, { items, dataMolId: 'bc-x', className: 'bc-cls' }),
    )
    expect(markup).toContain('aria-label="Breadcrumb"')
    expect(markup).toContain('data-mol-id="bc-x"')
    expect(markup).toContain('bc-cls')
  })
})
