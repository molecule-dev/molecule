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

import { StatusTimeline, type StatusTimelineStep } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered order status timeline.
 */
function OrderStatus(): React.JSX.Element {
  const order = { id: 'ORD-1042', status: 'shipped' }
  const steps: StatusTimelineStep[] = [
    { key: 'placed', label: 'Order placed' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
  ]
  return (
    <StatusTimeline
      steps={steps}
      currentKey={order.status}
      ariaLabel={`Order ${order.id} status`}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('bolds the current step and mutes only the steps after it', () => {
    const html = renderToStaticMarkup(<OrderStatus />)
    expect(html).toContain('<ol')
    expect(html).toContain('aria-label="Order ORD-1042 status"')
    expect(html.match(/<li/g)).toHaveLength(4)
    const bold = classMap.fontWeight('semibold')
    expect(html).toContain(`class="${bold}">Shipped</span>`)
    expect(html).toContain(`class="${classMap.textMuted}">Delivered</span>`)
    expect(html).toContain('<span class="">Order placed</span>')
    expect(html).toContain('<span class="">Processing</span>')
  })
})
