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
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`bgTone-success`) a node picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { OrderTimeline } = await import('../OrderTimeline.js')
import type { OrderMilestone } from '../OrderTimeline.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

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
    expect(markup).toContain('bgTone-info') // current
    expect(markup).toContain('bgTone-success') // completed
    expect(markup).toContain('bgBorder') // pending: the theme's border colour
    expect(markup).not.toContain('background')
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
