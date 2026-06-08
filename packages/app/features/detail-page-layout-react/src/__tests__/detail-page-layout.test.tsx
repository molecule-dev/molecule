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

const { DetailPageLayout } = await import('../DetailPageLayout.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('DetailPageLayout', () => {
  it('renders the main content', () => {
    const markup = html(
      createElement(DetailPageLayout, { main: createElement('div', { 'data-main': '' }) }),
    )
    expect(markup).toContain('data-main=""')
  })

  it('renders the breadcrumb and topBar slots when present', () => {
    const markup = html(
      createElement(DetailPageLayout, {
        main: 'x',
        breadcrumb: createElement('nav', { 'data-crumb': '' }),
        topBar: createElement('div', { 'data-topbar': '' }),
      }),
    )
    expect(markup).toContain('data-crumb=""')
    expect(markup).toContain('data-topbar=""')
  })

  it('renders the sidebar after the main column by default (right)', () => {
    const markup = html(
      createElement(DetailPageLayout, {
        main: createElement('div', { 'data-main': '' }),
        sidebar: createElement('div', { 'data-sidebar': '' }),
      }),
    )
    expect(markup).toContain('<aside')
    expect(markup.indexOf('data-main')).toBeLessThan(markup.indexOf('data-sidebar'))
  })

  it('renders the sidebar before the main column when sidebarPosition is left', () => {
    const markup = html(
      createElement(DetailPageLayout, {
        main: createElement('div', { 'data-main': '' }),
        sidebar: createElement('div', { 'data-sidebar': '' }),
        sidebarPosition: 'left',
      }),
    )
    expect(markup.indexOf('data-sidebar')).toBeLessThan(markup.indexOf('data-main'))
  })

  it('renders no <aside> when no sidebar is supplied', () => {
    const markup = html(createElement(DetailPageLayout, { main: 'x' }))
    expect(markup).not.toContain('<aside')
  })

  it('applies the sidebarWidth as a flex-basis on the aside', () => {
    const markup = html(
      createElement(DetailPageLayout, { main: 'x', sidebar: 'y', sidebarWidth: 'lg' }),
    )
    // lg → 96 * 4 = 384px
    expect(markup).toContain('flex-basis:384px')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(DetailPageLayout, { main: 'x', dataMolId: 'dpl-x', className: 'dpl-cls' }),
    )
    expect(markup).toContain('data-mol-id="dpl-x"')
    expect(markup).toContain('dpl-cls')
  })
})
