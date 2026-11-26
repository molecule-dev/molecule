// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SubscriptionPlanCard` — a port of
 * `@molecule/app-subscription-plan-card-react/src/__tests__/subscription-plan-card.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: defineComponent({
      name: 'Button',
      props: { variant: String, color: String, onClick: Function },
      setup(props, { slots }) {
        return () => h('button', { 'data-button': '', onClick: props.onClick }, slots.default?.())
      },
    }),
    Card: defineComponent({
      name: 'Card',
      props: {
        className: String,
        style: Object,
      },
      setup(props, { slots }) {
        return () =>
          h(
            'div',
            { 'data-card': '', class: props.className, style: props.style },
            slots.default?.(),
          )
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

import { SubscriptionPlanCard } from '../SubscriptionPlanCard.js'
import type { SubscriptionPlanCardProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link SubscriptionPlanCard} with the given props and returns the
 * markup it produced.
 *
 * @param props - The card's props.
 * @returns The markup.
 */
const render = (props: SubscriptionPlanCardProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(SubscriptionPlanCard, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('SubscriptionPlanCard', () => {
  it('renders the name in an <h3>, the price, and the interval', () => {
    const markup = render({
      name: 'Pro',
      price: '$19',
      interval: '/mo',
      features: ['Unlimited projects'],
    })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Pro')
    expect(markup).toContain('$19')
    expect(markup).toContain('/mo')
  })

  it('renders each feature with a check mark', () => {
    const markup = render({
      name: 'P',
      price: '$1',
      features: ['Feature A', 'Feature B'],
    })
    expect(markup).toContain('Feature A')
    expect(markup).toContain('Feature B')
    expect(markup.split('✓').length - 1).toBe(2)
  })

  it('renders the CTA as a button (onCta) or a link (ctaHref)', () => {
    const withClick = render({
      name: 'P',
      price: '$1',
      features: [],
      ctaLabel: 'Choose Pro',
      onCta: () => {},
    })
    expect(withClick).toContain('Choose Pro')
    const withHref = render({
      name: 'P',
      price: '$1',
      features: [],
      ctaLabel: 'Choose Pro',
      ctaHref: '/checkout',
    })
    expect(withHref).toContain('href="/checkout"')
  })

  it('highlights a recommended plan with the default badge and outline style', () => {
    const markup = render({
      name: 'P',
      price: '$1',
      features: [],
      recommended: true,
    })
    expect(markup).toContain('Recommended')
    expect(inlineStyleMismatch(markup, { outline: '2px solid currentColor' })).toBeNull()
  })

  it('renders a custom badge', () => {
    const markup = render({
      name: 'P',
      price: '$1',
      features: [],
      badge: 'Most popular',
    })
    expect(markup).toContain('Most popular')
  })

  it('forwards className', () => {
    const markup = render({
      name: 'P',
      price: '$1',
      features: [],
      className: 'spc-cls',
    })
    expect(markup).toContain('spc-cls')
  })
})
