// @vitest-environment jsdom

/**
 * The retry button's accessibility contract for `WebhookInspector`.
 *
 * It used to sit INSIDE the `<summary>` — the disclosure's own toggle button —
 * which axe reports as `nested-interactive`: a button that is a child of
 * another control is not reachable for assistive technology, and its clicks
 * needed `preventDefault`/`stopPropagation` to keep the row from toggling. It
 * now renders beside the row (a sibling of the `<details>`) and describes
 * itself through the row's event-type span (`aria-describedby`), so a screen
 * reader names the delivery the button retries.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

/** A failed delivery (the only status the retry button renders for). */
const deliveries: WebhookDelivery[] = [
  {
    id: '1',
    eventType: 'payment.failed',
    timestamp: '10:05',
    statusCode: 500,
    status: 'failure',
  },
]

afterEach(() => {
  cleanup()
})

describe('WebhookInspector retry button', () => {
  it('gives the retry button an accessible description naming its delivery', () => {
    const { container } = render(<WebhookInspector deliveries={deliveries} onRetry={() => {}} />)
    const button = container.querySelector<HTMLButtonElement>(
      '[data-mol-id="webhook-inspector-retry"]',
    )
    expect(button).not.toBeNull()

    // The description is the row's event-type span, and it carries that text.
    const describedBy = button?.getAttribute('aria-describedby') ?? ''
    expect(describedBy).not.toBe('')
    expect(document.getElementById(describedBy)?.textContent).toBe('payment.failed')
  })

  it('renders the retry button outside the summary, as a sibling of the details', () => {
    const { container } = render(<WebhookInspector deliveries={deliveries} onRetry={() => {}} />)
    const button = container.querySelector('[data-mol-id="webhook-inspector-retry"]')
    expect(button?.closest('summary')).toBeNull()
    expect(button?.closest('details')).toBeNull()
    expect(button?.parentElement?.nextElementSibling).toBeNull()
    expect(button?.parentElement?.previousElementSibling?.tagName).toBe('DETAILS')
  })
})
