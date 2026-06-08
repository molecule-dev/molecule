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

const { WebhookInspector } = await import('../WebhookInspector.js')
import type { WebhookDelivery } from '../WebhookInspector.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const deliveries: WebhookDelivery[] = [
  {
    id: '1',
    eventType: 'payment.succeeded',
    timestamp: '10:00',
    statusCode: 200,
    status: 'success',
    durationMs: 120,
    requestBody: { amount: 5000 },
    responseBody: 'ok',
  },
  {
    id: '2',
    eventType: 'payment.failed',
    timestamp: '10:05',
    statusCode: 500,
    status: 'failure',
    attempt: 2,
  },
]

describe('WebhookInspector', () => {
  it('renders a <details> per delivery with its event type and status code', () => {
    const markup = html(createElement(WebhookInspector, { deliveries }))
    expect(markup.match(/<details/g) ?? []).toHaveLength(2)
    expect(markup).toContain('payment.succeeded')
    expect(markup).toContain('payment.failed')
    expect(markup).toContain('200')
    expect(markup).toContain('500')
  })

  it('colors the status code badge by status', () => {
    const markup = html(createElement(WebhookInspector, { deliveries }))
    expect(markup).toContain('#22c55e') // success
    expect(markup).toContain('#ef4444') // failure
  })

  it('renders attempt number and duration when present', () => {
    const markup = html(createElement(WebhookInspector, { deliveries }))
    expect(markup).toContain('#2')
    expect(markup).toContain('120ms')
  })

  it('renders the request and response JSON panels', () => {
    const markup = html(createElement(WebhookInspector, { deliveries }))
    expect(markup).toContain('Request')
    expect(markup).toContain('Response')
    expect(markup).toContain('5000')
  })

  it('renders the retry button only for failed deliveries when onRetry is supplied', () => {
    const withRetry = html(createElement(WebhookInspector, { deliveries, onRetry: () => {} }))
    expect(withRetry.match(/Retry/g) ?? []).toHaveLength(1)
    const without = html(createElement(WebhookInspector, { deliveries }))
    expect(without).not.toContain('Retry')
  })

  it('opens the details for the selected delivery', () => {
    const markup = html(createElement(WebhookInspector, { deliveries, selectedId: '1' }))
    expect(markup).toMatch(/<details[^>]*open/)
  })

  it('forwards className', () => {
    const markup = html(createElement(WebhookInspector, { deliveries, className: 'wi-cls' }))
    expect(markup).toContain('wi-cls')
  })
})
