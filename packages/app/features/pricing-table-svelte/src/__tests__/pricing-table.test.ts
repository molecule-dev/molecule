// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `PricingTable` — a port of
 * `@molecule/app-pricing-table-react/src/__tests__/pricing-table.test.tsx`:
 * the same behavioral assertions, rendered with Svelte in jsdom against the
 * real `@molecule/app-ui-svelte` components and asserted on the markup the
 * component produces.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, unmount } from 'svelte'
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

import PricingTable from '../PricingTable.svelte'
import type { PricingFeature, PricingPlan, PricingTableProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller passes a node value. */
const raw = (html: string) => createRawSnippet(() => ({ render: () => html }))

let instance: ReturnType<typeof mount> | undefined

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = undefined
  document.body.innerHTML = ''
})

/**
 * Renders a {@link PricingTable} and returns the markup it produced.
 *
 * @param props - The table props.
 * @returns The rendered markup.
 */
function render(props: PricingTableProps): string {
  document.body.innerHTML = ''
  instance = mount(PricingTable, { target: document.body, props })
  flushSync()
  return document.body.innerHTML
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
    expect(markup).toContain('<button')
  })

  it('highlights the recommended plan via an outline style', () => {
    const markup = render({ plans, features })
    expect(markup).toContain('outline: 2px solid currentColor')
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

// The `raw` helper is what callers use for node-valued props; a plain string
// and a snippet must render the same content.
describe('PricingTable node values', () => {
  it('renders a snippet plan name', () => {
    const markup = render({
      plans: [{ id: 'pro', name: raw('<strong>Pro plan</strong>'), price: '$12' }],
      features: [],
    })
    expect(markup).toContain('<strong>Pro plan</strong>')
  })
})
