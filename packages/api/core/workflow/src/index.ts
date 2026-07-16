/**
 * Workflow/state machine core interface for molecule.dev.
 *
 * Defines the `WorkflowProvider` interface for managing workflow definitions,
 * instances, state transitions, and event history. Bond packages (database,
 * in-memory, etc.) implement this interface. Application code uses the
 * convenience functions which delegate to the bonded provider.
 *
 * @remarks
 * - **`guard` / `onEnter` / `onExit` / `action` identifiers are DECLARATIVE ONLY.** The
 *   bundled bonds do not evaluate guards or execute hooks — `guard: 'isPaid'` blocks
 *   nothing. Enforce preconditions and side-effects in YOUR handler around
 *   {@link transition} (check, then transition, then act), or in a bond that documents
 *   hook execution.
 * - `transition()` THROWS when the action is not valid for the instance's current state —
 *   catch it and answer 4xx; build action buttons from {@link getAvailableActions} so the
 *   UI only offers legal moves.
 * - **The database bond requires its tables.** `@molecule/api-workflow-database` ships
 *   `__setup__/workflow.sql` (`workflows`, `workflow_instances`, `workflow_events`);
 *   molecule scaffolds replay `__setup__/*.sql` on `migrate`, but adding the bond to an
 *   existing app means applying that DDL yourself before first use.
 * - Nothing is user-scoped and transitions are read-then-write: persist ownership yourself,
 *   authorize server-side before every transition/list, and serialize concurrent
 *   transitions per instance (transaction/lock) when double-fires would matter.
 *
 * @example
 * ```typescript
 * import { setProvider, createWorkflow, startInstance, transition } from '@molecule/api-workflow'
 * import { provider as dbWorkflow } from '@molecule/api-workflow-database'
 *
 * setProvider(dbWorkflow)
 *
 * const workflow = await createWorkflow({
 *   name: 'order-lifecycle',
 *   initialState: 'pending',
 *   states: {
 *     pending: { transitions: { confirm: { target: 'confirmed' } } },
 *     confirmed: { transitions: { ship: { target: 'shipped' } }, final: false },
 *     shipped: { transitions: { deliver: { target: 'delivered' } } },
 *     delivered: { final: true, transitions: {} },
 *   },
 * })
 *
 * const instance = await startInstance(workflow.id, { orderId: '123' })
 * await transition(instance.id, 'confirm')
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
