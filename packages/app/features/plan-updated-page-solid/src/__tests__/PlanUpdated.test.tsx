// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-plan-updated-page-solid` — a port of
 * `@molecule/app-plan-updated-page-react/src/__tests__/PlanUpdated.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

// The binding primitives, the router `Link`, and the UI markers the React
// tests mock — the same observable contract, in Solid's shape.
vi.mock('@molecule/app-solid', () => ({
  useAuth: mockUseAuth,
  useTranslation: () => ({
    t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
  useVerifyPaymentReturn: mockUseVerifyPaymentReturn,
  Link: (props: { to: string; children?: JSX.Element }) => <a href={props.to}>{props.children}</a>,
}))

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element } & Record<string, unknown>) => {
    const { children, ...rest } = props
    return (
      <button data-button="" {...rest}>
        {children}
      </button>
    )
  },
  Flex: (props: { children?: JSX.Element }) => <div data-flex="">{props.children}</div>,
  Icon: () => <span data-icon="" />,
  Spinner: () => <span data-spinner="" />,
}))

const { PlanUpdated } = await import('../PlanUpdated.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(props: Record<string, unknown> = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <PlanUpdated {...props} />, container))
  return container
}

describe('PlanUpdated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ state: () => ({ initialized: true }) })
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: () => 'idle',
      isReturn: () => false,
      provider: () => null,
      transactionId: () => null,
      error: () => null,
      retry: vi.fn(),
    })
  })

  it('renders the confirmation on a normal visit', () => {
    const container = mount()
    expect(container.innerHTML).toContain('data-mol-id="plan-updated-page"')
    expect(container.innerHTML).toContain('Thank you!')
  })

  // Until the purchase is confirmed server-side the plan is NOT granted, so a
  // thank-you at this point would be a lie.
  it('shows the spinner while the purchase is being confirmed', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: () => 'verifying',
      isReturn: () => true,
      provider: () => 'stripe',
      transactionId: () => 'cs_live_1',
      error: () => null,
      retry: vi.fn(),
    })
    const container = mount()
    expect(container.innerHTML).toContain('data-spinner=""')
    expect(container.innerHTML).not.toContain('Thank you!')
  })

  it('offers a retry when confirmation fails', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: () => 'failed',
      isReturn: () => true,
      provider: () => 'stripe',
      transactionId: () => 'cs_live_1',
      error: () => new Error('502'),
      retry: vi.fn(),
    })
    const container = mount()
    expect(container.innerHTML).toContain('data-mol-id="plan-updated-retry"')
    expect(container.innerHTML).not.toContain('Thank you!')
  })

  it('skips verification when the app opts out', () => {
    mount({ verify: false })
    expect(mockUseVerifyPaymentReturn).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })
})
