// @vitest-environment jsdom
/**
 * Unit tests for the Solid `PricingTable` — a port of
 * `@molecule/app-pricing-table-react/src/__tests__/pricing-table.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element; onClick?: () => void }) => (
    <button data-button="" onClick={props.onClick}>
      {props.children}
    </button>
  ),
  Card: (props: { children?: JSX.Element; style?: Record<string, unknown> }) => (
    <div data-card="" style={props.style}>
      {props.children}
    </div>
  ),
}))

import { PricingTable } from '../PricingTable.jsx'
import type { PricingFeature, PricingPlan, PricingTableProps } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a {@link PricingTable} and returns the markup it produced.
 *
 * @param props - The table props.
 * @returns The rendered markup.
 */
function mount(props: PricingTableProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <PricingTable {...props} />, container))
  return container.innerHTML
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
    const markup = mount({ plans, features })
    expect(markup).toContain('Free')
    expect(markup).toContain('$0')
    expect(markup).toContain('Pro')
    expect(markup).toContain('$12')
  })

  it('renders the plan CTA button', () => {
    const markup = mount({ plans, features })
    expect(markup).toContain('Upgrade')
    expect(markup).toContain('data-button=""')
  })

  it('highlights the recommended plan via an outline style', () => {
    const markup = mount({ plans, features })
    expect(markup).toContain('outline: 2px solid currentColor')
  })

  it('renders each feature row label and per-plan values', () => {
    const markup = mount({ plans, features })
    expect(markup).toContain('Projects')
    expect(markup).toContain('Unlimited')
    expect(markup).toContain('API access')
  })

  it('renders ✓ / — for boolean feature values', () => {
    const markup = mount({ plans, features })
    expect(markup).toContain('✓')
    expect(markup).toContain('—')
  })

  it('renders a group heading row when a feature has one', () => {
    const markup = mount({ plans, features })
    expect(markup).toContain('Developer')
  })

  it('forwards className', () => {
    const markup = mount({ plans, features, className: 'pt-cls' })
    expect(markup).toContain('pt-cls')
  })

  it('keys every feature row, so React logs no missing-key warning', () => {
    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })
    try {
      mount({ plans, features })
    } finally {
      spy.mockRestore()
    }
    expect(errors.filter((e) => e.includes('unique "key"'))).toEqual([])
  })
})
