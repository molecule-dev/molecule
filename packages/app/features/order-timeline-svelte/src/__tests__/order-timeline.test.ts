// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `OrderTimeline` — a port of
 * `@molecule/app-order-timeline-react/src/__tests__/order-timeline.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte 5 mount (jsdom)
 * and the mocked ClassMap.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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

const { default: OrderTimeline } = await import('../OrderTimeline.svelte')
import type { OrderMilestone } from '../types.js'

afterEach(async () => {
  document.body.innerHTML = ''
})

/** Mounts an {@link OrderTimeline} into a fresh host and returns its markup. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(OrderTimeline, { target: host, props })
  flushSync()
  const markup = host.innerHTML
  queueMicrotask(() => {
    unmount(instance)
  })
  return markup
}

const milestones: OrderMilestone[] = [
  { id: 'placed', label: 'Placed', detail: 'Mar 1', completed: true },
  { id: 'shipped', label: 'Shipped', detail: 'Mar 3', current: true },
  { id: 'delivered', label: 'Delivered' },
]

describe('OrderTimeline', () => {
  it('renders every milestone label', () => {
    const markup = render({ milestones })
    expect(markup).toContain('Placed')
    expect(markup).toContain('Shipped')
    expect(markup).toContain('Delivered')
  })

  it('renders milestone details when present', () => {
    const markup = render({ milestones })
    expect(markup).toContain('Mar 1')
    expect(markup).toContain('Mar 3')
  })

  it('colors completed, current, and pending nodes differently', () => {
    const markup = render({ milestones })
    // The mounted tree writes colors through the CSSOM, which serializes the
    // hex values as `rgb(…)` — the same values React's runtime mount writes.
    expect(markup).toContain('rgb(34, 197, 94)') // completed
    expect(markup).toContain('rgb(96, 165, 250)') // current
    expect(markup).toContain('rgb(209, 213, 219)') // pending
  })

  it('renders the ETA line when present', () => {
    const markup = render({ milestones, eta: 'Arrives Mar 5' })
    expect(markup).toContain('Arrives Mar 5')
  })

  it('renders without error in vertical orientation', () => {
    const markup = render({ milestones, orientation: 'vertical' })
    expect(markup).toContain('Placed')
  })

  it('forwards className', () => {
    const markup = render({ milestones, className: 'ot-cls' })
    expect(markup).toContain('ot-cls')
  })
})
