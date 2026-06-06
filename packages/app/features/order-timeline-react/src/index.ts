/**
 * Order / shipment progress timeline.
 *
 * Exports `<OrderTimeline>` and `OrderMilestone` type.
 *
 * @example
 * ```tsx
 * import { OrderTimeline, OrderMilestone } from '@molecule/app-order-timeline-react'
 *
 * const milestones: OrderMilestone[] = [
 *   { id: 'placed', label: 'Order placed', completed: true },
 *   { id: 'shipped', label: 'Shipped', completed: true, detail: 'Jun 3 via FedEx' },
 *   { id: 'delivery', label: 'Out for delivery', current: true },
 *   { id: 'delivered', label: 'Delivered' },
 * ]
 *
 * <OrderTimeline milestones={milestones} eta="Estimated arrival: today by 8 pm" />
 * ```
 *
 * @module
 */

export * from './OrderTimeline.js'
