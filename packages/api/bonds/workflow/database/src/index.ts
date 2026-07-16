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
 * import { provider } from '@molecule/api-workflow-database'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **Requires its tables before first use.** This bond ships
 *   `__setup__/workflow.sql` (`workflows`, `workflow_instances`,
 *   `workflow_events`); molecule scaffolds replay the `.sql` files under
 *   `__setup__` on `migrate`, but adding this bond to an existing app means
 *   applying that DDL yourself first. The shipped DDL is PostgreSQL dialect.
 * - `guard` / `onEnter` / `onExit` identifiers in workflow definitions are
 *   DECLARATIVE ONLY here — this bond stores them but never evaluates or
 *   executes them. Enforce preconditions and side-effects in your handler
 *   around `transition()`.
 * - `transition()` is read-then-write with no lock or transaction: serialize
 *   concurrent transitions per instance yourself when a double-fire matters,
 *   and authorize server-side — nothing is user-scoped.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
