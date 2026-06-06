/**
 * Vertical ordered-step status timeline.
 *
 * Exports `<StatusTimeline>` — render a list of steps with colored dots
 * indicating reached state and bolded label on the current step. Generic
 * for orders, workflows, kanban progressions, etc.
 *
 * @example
 * ```tsx
 * import { StatusTimeline } from '@molecule/app-status-timeline-react'
 *
 * <StatusTimeline
 *   steps={[
 *     { key: 'placed', label: 'Order Placed' },
 *     { key: 'processing', label: 'Processing' },
 *     { key: 'shipped', label: 'Shipped' },
 *     { key: 'delivered', label: 'Delivered' },
 *   ]}
 *   currentKey="shipped"
 *   ariaLabel="Order status"
 * />
 * ```
 * @module
 */

export * from './StatusTimeline.js'
