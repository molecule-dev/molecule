// @vitest-environment jsdom
/**
 * Unit tests for the Vue `PricingTable` — a port of
 * `@molecule/app-pricing-table-react/src/__tests__/pricing-table.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* member was applied without a real bond — the same mock
// the React tests use.
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

// The same UI markers the React tests mock `@molecule/app-ui-react` with: a
// `data-button` button and a `data-card` div carrying the style it received.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'MButton',
      emits: ['click'],
      setup(_props, { slots, emit }) {
        return () =>
          h(
            'button',
            { 'data-button': '', onClick: (event: MouseEvent) => emit('click', event) },
            slots.default?.(),
          )
      },
    }),
    Card: defineComponent({
      name: 'MCard',
      props: { style: [String, Object] },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', style: props.style }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

import { PricingTable } from '../PricingTable.js'
import type { PricingFeature, PricingPlan, PricingTableProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a {@link PricingTable} and returns the markup it produced.
 *
 * @param props - The table props.
 * @returns The rendered markup.
 */
const render = (props: PricingTableProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(PricingTable, props),
    }),
  )
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const plans: PricingPlan[] = [
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
const features: PricingFeature[] = [
  { label: 'Projects', values: { free: '3', pro: 'Unlimited' } },
  { label: 'API access', values: { free: false, pro: true }, groupHeading: 'Developer' },
]

describe('PricingTable', () => {
  it('renders each plan name and price', () => {
    const markup = render({ plans, features })
    expect(markup).toContain('Free')
    expect(markup).toContain('$0')
    expect(markup).toContain('Pro')
    expect(markup).toContain('$12')
  })

  it('renders the plan CTA button', () => {
    const markup = render({ plans, features })
    expect(markup).toContain('Upgrade')
    expect(markup).toContain('data-button=""')
  })

  it('highlights the recommended plan via an outline style', () => {
    const markup = render({ plans, features })
    expect(inlineStyleMismatch(markup, { outline: '2px solid currentColor' })).toBeNull()
  })

  it('renders each feature row label and per-plan values', () => {
    const markup = render({ plans, features })
    expect(markup).toContain('Projects')
    expect(markup).toContain('Unlimited')
    expect(markup).toContain('API access')
  })

  it('renders ✓ / — for boolean feature values', () => {
    const markup = render({ plans, features })
    expect(markup).toContain('✓')
    expect(markup).toContain('—')
  })

  it('renders a group heading row when a feature has one', () => {
    const markup = render({ plans, features })
    expect(markup).toContain('Developer')
  })

  it('forwards className', () => {
    const markup = render({ plans, features, className: 'pt-cls' })
    expect(markup).toContain('pt-cls')
  })

  it('keys every feature row, so React logs no missing-key warning', () => {
    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })
    try {
      render({ plans, features })
    } finally {
      spy.mockRestore()
    }
    expect(errors.filter((e) => e.includes('unique "key"'))).toEqual([])
  })
})
