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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Card: ({
    children,
    className,
    style,
  }: {
    children?: ReactNode
    className?: string
    style?: Record<string, unknown>
  }) => createElement('div', { 'data-card': '', className, style }, children),
}))

const { SubscriptionPlanCard } = await import('../SubscriptionPlanCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('SubscriptionPlanCard', () => {
  it('renders the name in an <h3>, the price, and the interval', () => {
    const markup = html(
      createElement(SubscriptionPlanCard, {
        name: 'Pro',
        price: '$19',
        interval: '/mo',
        features: ['Unlimited projects'],
      }),
    )
    expect(markup).toContain('<h3')
    expect(markup).toContain('Pro')
    expect(markup).toContain('$19')
    expect(markup).toContain('/mo')
  })

  it('renders each feature with a check mark', () => {
    const markup = html(
      createElement(SubscriptionPlanCard, {
        name: 'P',
        price: '$1',
        features: ['Feature A', 'Feature B'],
      }),
    )
    expect(markup).toContain('Feature A')
    expect(markup).toContain('Feature B')
    expect(markup.split('✓').length - 1).toBe(2)
  })

  it('renders the CTA as a button (onCta) or a link (ctaHref)', () => {
    const withClick = html(
      createElement(SubscriptionPlanCard, {
        name: 'P',
        price: '$1',
        features: [],
        ctaLabel: 'Choose Pro',
        onCta: () => {},
      }),
    )
    expect(withClick).toContain('Choose Pro')
    const withHref = html(
      createElement(SubscriptionPlanCard, {
        name: 'P',
        price: '$1',
        features: [],
        ctaLabel: 'Choose Pro',
        ctaHref: '/checkout',
      }),
    )
    expect(withHref).toContain('href="/checkout"')
  })

  it('highlights a recommended plan with the default badge and outline style', () => {
    const markup = html(
      createElement(SubscriptionPlanCard, {
        name: 'P',
        price: '$1',
        features: [],
        recommended: true,
      }),
    )
    expect(markup).toContain('Recommended')
    expect(markup).toContain('outline:2px solid currentColor')
  })

  it('renders a custom badge', () => {
    const markup = html(
      createElement(SubscriptionPlanCard, {
        name: 'P',
        price: '$1',
        features: [],
        badge: 'Most popular',
      }),
    )
    expect(markup).toContain('Most popular')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(SubscriptionPlanCard, {
        name: 'P',
        price: '$1',
        features: [],
        className: 'spc-cls',
      }),
    )
    expect(markup).toContain('spc-cls')
  })
})
