/**
 * Database-backed workflow provider for molecule.dev.
 *
 * Stores workflow definitions, instances, and event history using the
 * abstract `@molecule/api-database` DataStore. Wire this provider at
 * startup with `setProvider(provider)` from `@molecule/api-workflow`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-workflow'
 * import { provider, registerGuard, registerHook } from '@molecule/api-workflow-database'
 *
 * setProvider(provider)
 *
 * // Gate + react to transitions by KEY (definition strings are never eval'd):
 * registerGuard('isPaid', (ctx) => ctx.data.paid === true)
 * registerHook('sendReceipt', async (ctx) => {
 *   await emailReceipt(ctx.instanceId)
 * })
 * ```
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
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './registry.js'
export * from './types.js'
