/**
 * Angular order / shipment progress timeline — the counterpart of
 * `@molecule/app-order-timeline-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<OrderTimeline>` — the milestone rail an order, shipment or delivery
 * flow shows: "Placed → Confirmed → Shipped → Out for delivery → Delivered",
 * with connector lines, colored status nodes and an optional ETA line.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { type OrderMilestone, OrderTimeline } from '@molecule/app-order-timeline-angular'
 *
 * @Component({
 *   selector: 'app-delivery',
 *   standalone: true,
 *   imports: [OrderTimeline],
 *   template: `
 *     <div mol-order-timeline [milestones]="milestones" eta="Estimated arrival: today by 8 pm"></div>
 *   `,
 * })
 * export class Delivery {
 *   readonly milestones: OrderMilestone[] = [
 *     { id: 'placed', label: 'Order placed', completed: true },
 *     { id: 'shipped', label: 'Shipped', completed: true, detail: 'Jun 3 via FedEx' },
 *     { id: 'delivery', label: 'Out for delivery', current: true },
 *     { id: 'delivered', label: 'Delivered' },
 *   ]
 * }
 * ```
 *
 * @remarks
 * Requires a bonded ClassMap (the frame uses `cm.stack`, `cm.flex`, …) —
 * rendering throws otherwise.
 *
 * All strings (`label`, `detail`, `eta`) are caller-provided — resolve them
 * through your app's `t()` before passing so the timeline localizes. Node
 * labels and details are templates; a node `eta` is projected content
 * (`[slot=eta]`) and a text `eta` is an input.
 *
 * Status node colors are fixed hex values (blue = current, green = completed,
 * gray = pending) rather than theme variables. `completed` and `current` are
 * independent booleans: mark every finished milestone `completed: true` and
 * exactly one in-progress milestone `current: true`; a milestone with neither
 * renders as pending.
 *
 * @module
 */

export * from './order-timeline.component.js'
export * from './types.js'
