// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-plan-updated-page-svelte` — a port of
 * `@molecule/app-plan-updated-page-react/src/__tests__/PlanUpdated.test.tsx`:
 * the same behavioral assertions, mounted with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { readable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseAuth, mockUseVerifyPaymentReturn } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseVerifyPaymentReturn: vi.fn(),
}))

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// A bonded glyph, so the real `Icon` renders an `<svg>` without warning.
vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ paths: [{ d: 'M0 0h1v1H0z' }], viewBox: '0 0 20 20' }),
}))

// The binding hooks the React tests mock, in Svelte's shape (readable stores
// for the value fields), plus a plain `<a href>` stand-in for the router link.
vi.mock('@molecule/app-svelte', async () => {
  const { default: Link } = await import('./stubs/Link.svelte')
  return {
    useAuth: mockUseAuth,
    useTranslation: () => ({
      t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? key,
    }),
    useVerifyPaymentReturn: mockUseVerifyPaymentReturn,
    Link,
  }
})

const { default: PlanUpdated } = await import('../PlanUpdated.svelte')

const mounted: Array<Record<string, unknown>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts {@link PlanUpdated} with the given props and returns the rendered markup. */
const html = (props: Record<string, unknown> = {}): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(PlanUpdated, { target, props })
  mounted.push(instance)
  flushSync()
  return target.innerHTML
}

describe('PlanUpdated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ state: readable({ initialized: true }) })
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: readable('idle'),
      isReturn: readable(false),
      provider: readable(null),
      transactionId: readable(null),
      error: readable(null),
      retry: vi.fn(),
    })
  })

  it('renders the confirmation on a normal visit', () => {
    const markup = html()
    expect(markup).toContain('data-mol-id="plan-updated-page"')
    expect(markup).toContain('Thank you!')
  })

  // Until the purchase is confirmed server-side the plan is NOT granted, so a
  // thank-you at this point would be a lie.
  it('shows the spinner while the purchase is being confirmed', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: readable('verifying'),
      isReturn: readable(true),
      provider: readable('stripe'),
      transactionId: readable('cs_live_1'),
      error: readable(null),
      retry: vi.fn(),
    })
    const markup = html()
    expect(markup).toContain('role="status"')
    expect(markup).not.toContain('Thank you!')
  })

  it('offers a retry when confirmation fails', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: readable('failed'),
      isReturn: readable(true),
      provider: readable('stripe'),
      transactionId: readable('cs_live_1'),
      error: readable(new Error('502')),
      retry: vi.fn(),
    })
    const markup = html()
    expect(markup).toContain('data-mol-id="plan-updated-retry"')
    expect(markup).not.toContain('Thank you!')
  })

  it('skips verification when the app opts out', () => {
    html({ verify: false })
    expect(mockUseVerifyPaymentReturn).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })
})
