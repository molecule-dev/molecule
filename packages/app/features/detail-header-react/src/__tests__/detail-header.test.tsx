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

const { DetailHeader } = await import('../DetailHeader.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('DetailHeader', () => {
  it('renders the title inside an <h1>', () => {
    const markup = html(createElement(DetailHeader, { title: 'Invoice #42' }))
    expect(markup).toContain('<h1')
    expect(markup).toContain('Invoice #42')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(html(createElement(DetailHeader, { title: 'T', subtitle: 'due soon' }))).toContain(
      'due soon',
    )
    expect(html(createElement(DetailHeader, { title: 'T' }))).not.toContain('<p')
  })

  it('renders the leading, status, search, and actions slots', () => {
    const markup = html(
      createElement(DetailHeader, {
        title: 'T',
        leading: createElement('span', { 'data-leading': '' }),
        status: createElement('span', { 'data-status': '' }),
        search: createElement('span', { 'data-search': '' }),
        actions: createElement('span', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-status=""')
    expect(markup).toContain('data-search=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the meta row when present and omits it otherwise', () => {
    const withMeta = html(
      createElement(DetailHeader, { title: 'T', meta: createElement('span', { 'data-meta': '' }) }),
    )
    expect(withMeta).toContain('data-meta=""')
    expect(html(createElement(DetailHeader, { title: 'T' }))).not.toContain('data-meta')
  })

  it('applies the sticky inline style only when sticky is set', () => {
    const sticky = html(createElement(DetailHeader, { title: 'T', sticky: true }))
    expect(sticky).toContain('position:sticky')
    const plain = html(createElement(DetailHeader, { title: 'T' }))
    expect(plain).not.toContain('position:sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(DetailHeader, { title: 'T', dataMolId: 'dh-x', className: 'dh-cls' }),
    )
    expect(markup).toContain('data-mol-id="dh-x"')
    expect(markup).toContain('dh-cls')
  })
})
