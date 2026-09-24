/**
 * Order / shipment progress timeline.
 *
 * Exports `<OrderTimeline>` and `OrderMilestone` type.
 *
 * @example
 * ```tsx
 * import { type OrderMilestone, OrderTimeline } from '@molecule/app-order-timeline-react'
 *
 * const STAGES = [
 *   { id: 'placed', label: 'Order placed' },
 *   { id: 'shipped', label: 'Shipped' },
 *   { id: 'out_for_delivery', label: 'Out for delivery' },
 *   { id: 'delivered', label: 'Delivered' },
 * ]
 *
 * export function OrderStatus() {
 *   const order = { status: 'out_for_delivery', shippedAt: 'Jun 3', carrier: 'FedEx', eta: 'today by 8 pm' }
 *   const reached = STAGES.findIndex((stage) => stage.id === order.status)
 *   const isDelivered = order.status === 'delivered'
 *   const milestones: OrderMilestone[] = STAGES.map((stage, i) => ({
 *     id: stage.id,
 *     label: stage.label,
 *     detail: stage.id === 'shipped' ? `${order.shippedAt} via ${order.carrier}` : undefined,
 *     completed: i < reached || isDelivered,
 *     current: i === reached && !isDelivered,
 *   }))
 *   return (
 *     <OrderTimeline
 *       milestones={milestones}
 *       orientation="vertical"
 *       eta={isDelivered ? undefined : `Estimated arrival: ${order.eta}`}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * All strings (`label`, `detail`, `eta`) are caller-provided — resolve
 * them through your app's `t()` before passing so the timeline localizes.
 *
 * Status node colors are currently fixed hex values (blue = current,
 * green = completed, gray = pending) rather than theme variables — the
 * pending gray has low contrast on dark surfaces. `completed` and
 * `current` are independent booleans — the component does NOT derive them from an order status,
 * so map your status to them yourself as above: mark every finished milestone
 * `completed: true` and exactly one in-progress milestone
 * `current: true`; a milestone with neither renders as pending.
 *
 * @module
 */

export * from './OrderTimeline.js'
