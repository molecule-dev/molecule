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

const { OrderTimeline } = await import('../OrderTimeline.js')
import type { OrderMilestone } from '../OrderTimeline.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const milestones: OrderMilestone[] = [
  { id: 'placed', label: 'Placed', detail: 'Mar 1', completed: true },
  { id: 'shipped', label: 'Shipped', detail: 'Mar 3', current: true },
  { id: 'delivered', label: 'Delivered' },
]

describe('OrderTimeline', () => {
  it('renders every milestone label', () => {
    const markup = html(createElement(OrderTimeline, { milestones }))
    expect(markup).toContain('Placed')
    expect(markup).toContain('Shipped')
    expect(markup).toContain('Delivered')
  })

  it('renders milestone details when present', () => {
    const markup = html(createElement(OrderTimeline, { milestones }))
    expect(markup).toContain('Mar 1')
    expect(markup).toContain('Mar 3')
  })

  it('colors completed, current, and pending nodes differently', () => {
    const markup = html(createElement(OrderTimeline, { milestones }))
    expect(markup).toContain('#22c55e') // completed
    expect(markup).toContain('#60a5fa') // current
    expect(markup).toContain('#d1d5db') // pending
  })

  it('renders the ETA line when present', () => {
    const markup = html(createElement(OrderTimeline, { milestones, eta: 'Arrives Mar 5' }))
    expect(markup).toContain('Arrives Mar 5')
  })

  it('renders without error in vertical orientation', () => {
    const markup = html(createElement(OrderTimeline, { milestones, orientation: 'vertical' }))
    expect(markup).toContain('Placed')
  })

  it('forwards className', () => {
    const markup = html(createElement(OrderTimeline, { milestones, className: 'ot-cls' }))
    expect(markup).toContain('ot-cls')
  })
})
