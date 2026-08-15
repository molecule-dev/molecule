import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseAuth, mockUseVerifyPaymentReturn } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseVerifyPaymentReturn: vi.fn(),
}))

vi.mock('@molecule/app-react', () => ({
  useAuth: mockUseAuth,
  useTranslation: () => ({
    t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
  useVerifyPaymentReturn: mockUseVerifyPaymentReturn,
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (prop === 'cn') return (...names: unknown[]) => names.filter(Boolean).join(' ')
          if (prop === 'sp' || prop === 'textSize' || prop === 'fontWeight' || prop === 'maxW') {
            return () => String(prop)
          }
          if (prop === 'flex') return () => 'flex'
          return String(prop)
        },
      },
    ),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    onClick: _onClick,
    variant: _variant,
    size: _size,
    ...rest
  }: Record<string, unknown> & { children?: ReactNode }) =>
    createElement('button', { 'data-button': '', ...rest }, children),
  Flex: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-flex': '' }, children),
  Icon: () => createElement('span', { 'data-icon': '' }),
  Spinner: () => createElement('span', { 'data-spinner': '' }),
}))

vi.mock('react-router', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to }, children),
}))

const { PlanUpdated } = await import('../PlanUpdated.js')

const html = (element: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(element)

describe('PlanUpdated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ state: { initialized: true } })
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: 'idle',
      isReturn: false,
      provider: null,
      transactionId: null,
      error: null,
      retry: vi.fn(),
    })
  })

  it('renders the confirmation on a normal visit', () => {
    const markup = html(createElement(PlanUpdated))
    expect(markup).toContain('data-mol-id="plan-updated-page"')
    expect(markup).toContain('Thank you!')
  })

  // Until the purchase is confirmed server-side the plan is NOT granted, so a
  // thank-you at this point would be a lie.
  it('shows the spinner while the purchase is being confirmed', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: 'verifying',
      isReturn: true,
      provider: 'stripe',
      transactionId: 'cs_live_1',
      error: null,
      retry: vi.fn(),
    })
    const markup = html(createElement(PlanUpdated))
    expect(markup).toContain('data-spinner=""')
    expect(markup).not.toContain('Thank you!')
  })

  it('offers a retry when confirmation fails', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: 'failed',
      isReturn: true,
      provider: 'stripe',
      transactionId: 'cs_live_1',
      error: new Error('502'),
      retry: vi.fn(),
    })
    const markup = html(createElement(PlanUpdated))
    expect(markup).toContain('data-mol-id="plan-updated-retry"')
    expect(markup).not.toContain('Thank you!')
  })

  it('skips verification when the app opts out', () => {
    html(createElement(PlanUpdated, { verify: false }))
    expect(mockUseVerifyPaymentReturn).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })
})
