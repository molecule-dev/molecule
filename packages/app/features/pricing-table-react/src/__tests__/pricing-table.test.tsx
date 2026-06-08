import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Card: ({ children, style }: { children?: ReactNode; style?: Record<string, unknown> }) =>
    createElement('div', { 'data-card': '', style }, children),
}))

const { PricingTable } = await import('../PricingTable.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const plans = [
  { id: 'free', name: 'Free', price: '$0', interval: '/mo' },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    interval: '/mo',
    recommended: true,
    cta: { label: 'Upgrade', onClick: () => {} },
  },
]
const features = [
  { label: 'Projects', values: { free: '3', pro: 'Unlimited' } },
  { label: 'API access', values: { free: false, pro: true }, groupHeading: 'Developer' },
]

describe('PricingTable', () => {
  it('renders each plan name and price', () => {
    const markup = html(createElement(PricingTable, { plans, features }))
    expect(markup).toContain('Free')
    expect(markup).toContain('$0')
    expect(markup).toContain('Pro')
    expect(markup).toContain('$12')
  })

  it('renders the plan CTA button', () => {
    const markup = html(createElement(PricingTable, { plans, features }))
    expect(markup).toContain('Upgrade')
    expect(markup).toContain('data-button=""')
  })

  it('highlights the recommended plan via an outline style', () => {
    const markup = html(createElement(PricingTable, { plans, features }))
    expect(markup).toContain('outline:2px solid currentColor')
  })

  it('renders each feature row label and per-plan values', () => {
    const markup = html(createElement(PricingTable, { plans, features }))
    expect(markup).toContain('Projects')
    expect(markup).toContain('Unlimited')
    expect(markup).toContain('API access')
  })

  it('renders ✓ / — for boolean feature values', () => {
    const markup = html(createElement(PricingTable, { plans, features }))
    expect(markup).toContain('✓')
    expect(markup).toContain('—')
  })

  it('renders a group heading row when a feature has one', () => {
    const markup = html(createElement(PricingTable, { plans, features }))
    expect(markup).toContain('Developer')
  })

  it('forwards className', () => {
    const markup = html(createElement(PricingTable, { plans, features, className: 'pt-cls' }))
    expect(markup).toContain('pt-cls')
  })
})
