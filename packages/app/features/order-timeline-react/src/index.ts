/**
 * Order / shipment progress timeline.
 *
 * Exports `<OrderTimeline>` and `OrderMilestone` type.
 *
 * @example
 * ```tsx
 * import { OrderTimeline, type OrderMilestone } from '@molecule/app-order-timeline-react'
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
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * All strings (`label`, `detail`, `eta`) are caller-provided — resolve
 * them through your app's `t()` before passing so the timeline localizes.
 *
 * Status node colors are currently fixed hex values (blue = current,
 * green = completed, gray = pending) rather than theme variables — the
 * pending gray has low contrast on dark surfaces. `completed` and
 * `current` are independent booleans: mark every finished milestone
 * `completed: true` and exactly one in-progress milestone
 * `current: true`; a milestone with neither renders as pending.
 *
 * @module
 */

export * from './OrderTimeline.js'
