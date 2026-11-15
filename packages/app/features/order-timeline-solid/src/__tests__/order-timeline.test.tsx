// @vitest-environment jsdom
/**
 * Unit tests for the Solid `OrderTimeline` — a port of
 * `@molecule/app-order-timeline-react/src/__tests__/order-timeline.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

const { OrderTimeline } = await import('../OrderTimeline.jsx')
import type { OrderMilestone } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const milestones: OrderMilestone[] = [
  { id: 'placed', label: 'Placed', detail: 'Mar 1', completed: true },
  { id: 'shipped', label: 'Shipped', detail: 'Mar 3', current: true },
  { id: 'delivered', label: 'Delivered' },
]

describe('OrderTimeline', () => {
  it('renders every milestone label', () => {
    const markup = mount(() => <OrderTimeline milestones={milestones} />).innerHTML
    expect(markup).toContain('Placed')
    expect(markup).toContain('Shipped')
    expect(markup).toContain('Delivered')
  })

  it('renders milestone details when present', () => {
    const markup = mount(() => <OrderTimeline milestones={milestones} />).innerHTML
    expect(markup).toContain('Mar 1')
    expect(markup).toContain('Mar 3')
  })

  it('colors completed, current, and pending nodes differently', () => {
    const markup = mount(() => <OrderTimeline milestones={milestones} />).innerHTML
    // The mounted tree writes colors through the CSSOM, which serializes the
    // hex values as `rgb(…)` — the same values React's runtime mount writes.
    expect(markup).toContain('rgb(34, 197, 94)') // completed
    expect(markup).toContain('rgb(96, 165, 250)') // current
    expect(markup).toContain('rgb(209, 213, 219)') // pending
  })

  it('renders the ETA line when present', () => {
    const markup = mount(() => (
      <OrderTimeline milestones={milestones} eta="Arrives Mar 5" />
    )).innerHTML
    expect(markup).toContain('Arrives Mar 5')
  })

  it('renders without error in vertical orientation', () => {
    const markup = mount(() => (
      <OrderTimeline milestones={milestones} orientation="vertical" />
    )).innerHTML
    expect(markup).toContain('Placed')
  })

  it('forwards className', () => {
    const markup = mount(() => (
      <OrderTimeline milestones={milestones} className="ot-cls" />
    )).innerHTML
    expect(markup).toContain('ot-cls')
  })
})
