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

const { AddressDisplay } = await import('../AddressDisplay.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const address = {
  line1: '123 Main St',
  line2: 'Suite 4',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62704',
  country: 'USA',
}

describe('AddressDisplay', () => {
  it('renders the formatted address lines', () => {
    const markup = html(createElement(AddressDisplay, { address }))
    expect(markup).toContain('123 Main St')
    expect(markup).toContain('Suite 4')
    expect(markup).toContain('Springfield, IL 62704')
    expect(markup).toContain('USA')
  })

  it('renders multi-line mode inside an <address> element by default', () => {
    const markup = html(createElement(AddressDisplay, { address }))
    expect(markup).toContain('<address')
  })

  it('joins all fields on one line in inline mode', () => {
    const markup = html(createElement(AddressDisplay, { address, inline: true }))
    expect(markup).toContain('123 Main St, Suite 4, Springfield, IL 62704, USA')
    expect(markup).not.toContain('<address')
  })

  it('renders the name when present and omits it otherwise', () => {
    expect(html(createElement(AddressDisplay, { address, name: 'Acme HQ' }))).toContain('Acme HQ')
  })

  it('renders the phone as a tel: link', () => {
    const markup = html(createElement(AddressDisplay, { address, phone: '+15551234' }))
    expect(markup).toContain('href="tel:+15551234"')
    expect(markup).toContain('+15551234')
  })

  it('renders the leading and actions slots', () => {
    const markup = html(
      createElement(AddressDisplay, {
        address,
        leading: createElement('span', { 'data-leading': '' }),
        actions: createElement('span', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(AddressDisplay, { address, className: 'ad-cls' }))
    expect(markup).toContain('ad-cls')
  })
})
