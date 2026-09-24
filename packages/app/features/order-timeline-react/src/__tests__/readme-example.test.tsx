/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type OrderMilestone, OrderTimeline } from '../index.js'

const STAGES = [
  { id: 'placed', label: 'Order placed' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'out_for_delivery', label: 'Out for delivery' },
  { id: 'delivered', label: 'Delivered' },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered order status timeline.
 */
function OrderStatus(): React.JSX.Element {
  const order = {
    status: 'out_for_delivery',
    shippedAt: 'Jun 3',
    carrier: 'FedEx',
    eta: 'today by 8 pm',
  }
  const reached = STAGES.findIndex((stage) => stage.id === order.status)
  const isDelivered = order.status === 'delivered'
  const milestones: OrderMilestone[] = STAGES.map((stage, i) => ({
    id: stage.id,
    label: stage.label,
    detail: stage.id === 'shipped' ? `${order.shippedAt} via ${order.carrier}` : undefined,
    completed: i < reached || isDelivered,
    current: i === reached && !isDelivered,
  }))
  return (
    <OrderTimeline
      milestones={milestones}
      orientation="vertical"
      eta={isDelivered ? undefined : `Estimated arrival: ${order.eta}`}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('marks earlier stages completed, the current stage in progress, and shows the ETA', () => {
    const html = renderToStaticMarkup(<OrderStatus />)
    for (const label of ['Order placed', 'Shipped', 'Out for delivery', 'Delivered']) {
      expect(html).toContain(`>${label}</span>`)
    }
    expect(html).toContain('Jun 3 via FedEx')
    expect(html).toContain('Estimated arrival: today by 8 pm')
    // 2 completed nodes (green), 1 current (blue, ringed), 1 pending (gray)
    expect(html.match(/border-radius:50%;background:#22c55e/g)).toHaveLength(2)
    expect(html.match(/background:#60a5fa;border:3px solid currentColor/g)).toHaveLength(1)
    expect(html.match(/border-radius:50%;background:#d1d5db/g)).toHaveLength(1)
    // vertical orientation → 24px connectors between the 4 nodes
    expect(html.match(/height:24px/g)).toHaveLength(3)
  })
})
