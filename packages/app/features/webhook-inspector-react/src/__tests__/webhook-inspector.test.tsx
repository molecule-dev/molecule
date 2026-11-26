import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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
        // A tone class carries its tone, so a test can tell `bgTone('success')`
        // from `bgTone('error')` — the real ClassMap gives each its own class.
        if (token === 'bgTone' || token === 'textTone' || token === 'borderTone')
          return (tone: unknown) => `${token}-${String(tone)}`
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

  it('tones the status code badge by status', () => {
    const pending: WebhookDelivery = {
      id: '3',
      eventType: 'invoice.pending',
      timestamp: '10:07',
      statusCode: 202,
      status: 'pending',
    }
    const markup = html(createElement(WebhookInspector, { deliveries: [...deliveries, pending] }))
    expect(markup).toContain('bgTone-success') // success
    expect(markup).toContain('bgTone-error') // failure
    expect(markup).toContain('bgTone-warning') // pending
    // The colour is the theme's (a ClassMap class), never a literal in a style.
    expect(markup).toContain('textOnTone')
    expect(markup).not.toContain('background')
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
