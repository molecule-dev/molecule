/**
 * Database-backed workflow provider for molecule.dev.
 *
 * Stores workflow definitions, instances, and event history using the
 * abstract `@molecule/api-database` DataStore. Wire this provider at
 * startup with `setProvider(provider)` from `@molecule/api-workflow`.
 *
 * @remarks
 * - **Requires its tables before first use.** This bond ships
 *   `__setup__/workflow.sql` (`workflows`, `workflow_instances`,
 *   `workflow_events`); molecule scaffolds replay the `.sql` files under
 *   `__setup__` on `migrate`, but adding this bond to an existing app means
 *   applying that DDL yourself first. The shipped DDL is PostgreSQL dialect.
 * - `guard` / `action` / `onEnter` / `onExit` in workflow definitions are
 *   string IDENTIFIERS that `transition()` EVALUATES against a pluggable
 *   handler registry — they are keys, never executable strings (no `eval`).
 *   Register named handlers at startup with `registerGuard`, `registerAction`,
 *   and `registerHook`. On a transition, `transition()` first runs the guard
 *   (a falsy result BLOCKS the transition with a `WorkflowGuardRejectedError`),
 *   then on success invokes `onExit` → `action` → `onEnter` in that order,
 *   threading a mutable {@link WorkflowContext} whose `data` is persisted. A
 *   referenced identifier with no registered handler is a misconfiguration and
 *   throws — it is never silently skipped. A definition with no guard/action/
 *   hook identifiers transitions exactly as before.
 * - `transition()` is read-then-write with no lock or transaction: serialize
 *   concurrent transitions per instance yourself when a double-fire matters,
 *   and authorize server-side — nothing is user-scoped.
 * - **Needs a bonded DataStore** (`setStore()` from `@molecule/api-database`) — without
 *   one every call throws. Wire this bond with the core's `setProvider(provider)` from
 *   `@molecule/api-workflow` (not `bond('workflow-database', ...)`); there is no
 *   `createProvider()`.
 * - Handler registries are module-global and in-memory: call `registerGuard` /
 *   `registerAction` / `registerHook` at EVERY startup (they are not persisted with the
 *   definition). `createWorkflow()` inserts a NEW row each call — create a definition once
 *   (or look it up with `listWorkflows()`) instead of on every boot.
 * - `transition(instanceId, action, data)` takes the ACTION name (a key of the current
 *   state's `transitions`), not the target state; an unknown action throws
 *   `Action '<a>' is not available from state '<s>'`.
 *
 * @example
 * ```typescript
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { createWorkflow, getHistory, setProvider, startInstance, transition } from '@molecule/api-workflow'
 * import { provider, registerGuard, registerHook } from '@molecule/api-workflow-database'
 *
 * // Startup: bond the DataStore (reads DATABASE_URL; apply __setup__/workflow.sql first),
 * // then this provider, then register EVERY guard/action/hook key the definitions reference.
 * setStore(store)
 * setProvider(provider)
 * registerGuard('isPaid', (ctx) => ctx.data.paid === true)
 * registerHook('stampShipped', (ctx) => {
 *   ctx.data.shippedAt = new Date().toISOString() // mutations to ctx.data are persisted
 * })
 *
 * const orderFlow = await createWorkflow({
 *   name: 'order-lifecycle',
 *   initialState: 'pending',
 *   states: {
 *     pending: { transitions: { ship: { target: 'shipped', guard: 'isPaid' }, cancel: { target: 'cancelled' } } },
 *     shipped: { transitions: {}, onEnter: 'stampShipped', final: true },
 *     cancelled: { transitions: {}, final: true },
 *   },
 * })
 *
 * const order = await startInstance(orderFlow.id, { orderId: 'ord_123', paid: false })
 * // transition() takes the ACTION name; the guard reads the merged data (paid: true here).
 * const shipped = await transition(order.id, 'ship', { paid: true })
 * // shipped.state === 'shipped'; shipped.data.shippedAt is set by the onEnter hook
 * const history = await getHistory(order.id) // [{ action: 'ship', fromState: 'pending', toState: 'shipped', … }]
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './registry.js'
export * from './types.js'
