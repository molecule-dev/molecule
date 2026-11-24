// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-plan-updated-page-vue` — a port of
 * `@molecule/app-plan-updated-page-react/src/__tests__/PlanUpdated.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

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

// The binding composables, the router `Link`, and the UI markers the React
// tests mock — the same observable contract, in Vue's shape.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useAuth: mockUseAuth,
    useTranslation: () => ({
      t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? key,
    }),
    useVerifyPaymentReturn: mockUseVerifyPaymentReturn,
    Link: defineComponent({
      name: 'Link',
      props: { to: { type: String, required: true } },
      setup(props, { slots }) {
        return () => h('a', { href: props.to }, slots.default?.())
      },
    }),
  }
})

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      setup(_props, { slots, attrs }) {
        return () => h('button', { 'data-button': '', ...attrs }, slots.default?.())
      },
    }),
    Flex: defineComponent({
      name: 'Flex',
      setup(_props, { slots }) {
        return () => h('div', { 'data-flex': '' }, slots.default?.())
      },
    }),
    Icon: defineComponent({
      name: 'Icon',
      setup() {
        return () => h('span', { 'data-icon': '' })
      },
    }),
    Spinner: defineComponent({
      name: 'Spinner',
      setup() {
        return () => h('span', { 'data-spinner': '' })
      },
    }),
  }
})

import { createApp, defineComponent, h, ref } from 'vue'

import { PlanUpdated } from '../PlanUpdated.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link PlanUpdated} and returns the markup it produced. */
const html = (props: Record<string, unknown> = {}): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(PlanUpdated, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('PlanUpdated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ state: ref({ initialized: true }) })
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: ref('idle'),
      isReturn: ref(false),
      provider: ref(null),
      transactionId: ref(null),
      error: ref(null),
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
      status: ref('verifying'),
      isReturn: ref(true),
      provider: ref('stripe'),
      transactionId: ref('cs_live_1'),
      error: ref(null),
      retry: vi.fn(),
    })
    const markup = html()
    expect(markup).toContain('data-spinner=""')
    expect(markup).not.toContain('Thank you!')
  })

  it('offers a retry when confirmation fails', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: ref('failed'),
      isReturn: ref(true),
      provider: ref('stripe'),
      transactionId: ref('cs_live_1'),
      error: ref(new Error('502')),
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

  it('leaves the receipt link out when the app has no billing page', () => {
    expect(html()).toContain('View receipt')
    const markup = html({ receiptHref: null })
    expect(markup).not.toContain('View receipt')
    expect(markup).toContain('Thank you!')
  })
})
