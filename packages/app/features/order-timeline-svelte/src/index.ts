/**
 * Svelte order / shipment progress timeline.
 *
 * Exports `OrderTimeline` and the `OrderMilestone` type — the milestone rail an
 * order, shipment or delivery flow shows: "Placed → Confirmed → Shipped → Out
 * for delivery → Delivered". It is the Svelte counterpart of
 * `@molecule/app-order-timeline-react`: the same props and the same DOM for the
 * same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { type OrderMilestone, OrderTimeline } from '@molecule/app-order-timeline-svelte'
 *
 *   const milestones: OrderMilestone[] = [
 *     { id: 'placed', label: 'Order placed', completed: true },
 *     { id: 'shipped', label: 'Shipped', completed: true, detail: 'Jun 3 via FedEx' },
 *     { id: 'delivery', label: 'Out for delivery', current: true },
 *     { id: 'delivered', label: 'Delivered' },
 *   ]
 * </script>
 *
 * <OrderTimeline {milestones} eta="Estimated arrival: today by 8 pm" />
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * All strings (`label`, `detail`, `eta`) are caller-provided — resolve them
 * through your app's `t()` before passing so the timeline localizes. Snippets
 * are accepted too.
 *
 * Status node colors are fixed hex values (blue = current, green = completed,
 * gray = pending) rather than theme variables — the pending gray has low
 * contrast on dark surfaces. `completed` and `current` are independent
 * booleans: mark every finished milestone `completed: true` and exactly one
 * in-progress milestone `current: true`; a milestone with neither renders as
 * pending.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
