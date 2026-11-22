// @vitest-environment jsdom
/**
 * Unit tests for the Vue `WebhookInspector` — a port of
 * `@molecule/app-webhook-inspector-react/src/__tests__/webhook-inspector.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `fontWeight`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// The i18n mock the React tests get from the real bond: `t` resolves to the
// inline English default.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h } from 'vue'

import type { WebhookDelivery, WebhookInspectorProps } from '../types.js'
import { WebhookInspector } from '../WebhookInspector.js'

/** Renders a {@link WebhookInspector} and returns the markup it produced. */
const html = (props: WebhookInspectorProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(WebhookInspector, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

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

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebhookInspector', () => {
  it('renders a <details> per delivery with its event type and status code', () => {
    const markup = html({ deliveries })
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
    const markup = html({ deliveries: [...deliveries, pending] })
    expect(markup).toContain('bgTone-success') // success
    expect(markup).toContain('bgTone-error') // failure
    expect(markup).toContain('bgTone-warning') // pending
    // The colour is the theme's (a ClassMap class), never a literal in a style.
    expect(markup).toContain('textOnTone')
    expect(markup).not.toContain('background')
  })

  it('renders attempt number and duration when present', () => {
    const markup = html({ deliveries })
    expect(markup).toContain('#2')
    expect(markup).toContain('120ms')
  })

  it('renders the request and response JSON panels', () => {
    const markup = html({ deliveries })
    expect(markup).toContain('Request')
    expect(markup).toContain('Response')
    expect(markup).toContain('5000')
  })

  it('renders the retry button only for failed deliveries when onRetry is supplied', () => {
    const withRetry = html({ deliveries, onRetry: () => {} })
    expect(withRetry.match(/Retry/g) ?? []).toHaveLength(1)
    const without = html({ deliveries })
    expect(without).not.toContain('Retry')
  })

  it('opens the details for the selected delivery', () => {
    const markup = html({ deliveries, selectedId: '1' })
    expect(markup).toMatch(/<details[^>]*open/)
  })

  it('forwards className', () => {
    const markup = html({ deliveries, className: 'wi-cls' })
    expect(markup).toContain('wi-cls')
  })

  it('gives the retry button an accessible description naming its delivery', () => {
    const doc = new DOMParser().parseFromString(
      html({ deliveries, onRetry: () => {} }),
      'text/html',
    )
    const button = doc.querySelector('[data-mol-id="webhook-inspector-retry"]')
    expect(button).not.toBeNull()
    // The description is the row's event-type span, and it carries that text.
    const describedBy = button?.getAttribute('aria-describedby') ?? ''
    expect(describedBy).not.toBe('')
    expect(doc.getElementById(describedBy)?.textContent).toBe('payment.failed')
  })

  it('renders the retry button outside the summary, as a sibling of the details', () => {
    const doc = new DOMParser().parseFromString(
      html({ deliveries, onRetry: () => {} }),
      'text/html',
    )
    const button = doc.querySelector('[data-mol-id="webhook-inspector-retry"]')
    expect(button?.closest('summary')).toBeNull()
    expect(button?.closest('details')).toBeNull()
    expect(button?.parentElement?.nextElementSibling).toBeNull()
    expect(button?.parentElement?.previousElementSibling?.tagName).toBe('DETAILS')
  })
})
