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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { VendorCard } = await import('../VendorCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('VendorCard', () => {
  it('renders the name in an <h3> and the avatar', () => {
    const markup = html(createElement(VendorCard, { name: 'Acme Supplies' }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Acme Supplies')
    expect(markup).toContain('data-avatar-name="Acme Supplies"')
  })

  it('renders the description when present', () => {
    const markup = html(
      createElement(VendorCard, { name: 'V', description: 'Trusted parts seller' }),
    )
    expect(markup).toContain('Trusted parts seller')
  })

  it('renders the rating (1 decimal) and review count when present', () => {
    const markup = html(createElement(VendorCard, { name: 'V', rating: 4.7, reviewCount: 312 }))
    expect(markup).toContain('4.7')
    expect(markup).toContain('(312)')
  })

  it('renders the memberSince line', () => {
    const markup = html(createElement(VendorCard, { name: 'V', memberSince: 'since 2019' }))
    expect(markup).toContain('since 2019')
  })

  it('renders the badges and actions slots', () => {
    const markup = html(
      createElement(VendorCard, {
        name: 'V',
        badges: createElement('span', { 'data-badges': '' }),
        actions: createElement('button', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-badges=""')
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className onto the Card', () => {
    const markup = html(createElement(VendorCard, { name: 'V', className: 'vc-cls' }))
    expect(markup).toContain('vc-cls')
  })
})
