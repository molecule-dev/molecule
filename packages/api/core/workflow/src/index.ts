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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual workflow screens/flows, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip:
 * - [ ] Starting an instance from the UI puts it in the workflow's
 *   `initialState`; each UI action drives one `transition()` and the instance
 *   advances ONLY along a transition defined for its current state. Walk the
 *   whole path front to back — the step/status shown in the UI matches
 *   `getState()` at every stage and `getHistory()` lists the fromState ->
 *   toState hops in the exact order they happened.
 * - [ ] A step whose work must succeed before advancing actually gates the
 *   next transition. `guard`/`action` identifiers are DECLARATIVE ONLY — the
 *   bundled bonds never evaluate or run them — so the handler enforces it
 *   around `transition()` (check, then transition, then act): a required
 *   approval or input holds the instance in its current state, the advancing
 *   action only appears in `getAvailableActions()` once the precondition is
 *   met, and the UI cannot move on until the real work succeeded.
 * - [ ] Branching routes correctly: an input that should take branch A takes
 *   A, not B. The handler picks which action to apply from the instance data
 *   and the instance lands in branch A's target state (confirm via
 *   `getState()`/history), never the other branch's.
 * - [ ] A failed step is handled per the definition — retry loops back, halt
 *   lands in the error/terminal state, compensate runs the rollback
 *   transition — never silently left in the pre-failure state as if it
 *   succeeded and never wedged with no available actions. `transition()`
 *   THROWS on an action illegal for the current state; the handler catches it
 *   and answers an error instead of pretending the step advanced.
 * - [ ] State is durable, not in-memory: reload the page (or come back later /
 *   restart the server) and re-fetch the instance — it is at the SAME step
 *   with its `data` intact, proving state lives in the workflow bond's store.
 *   Requires the `workflows`/`workflow_instances`/`workflow_events` tables to
 *   be migrated first.
 * - [ ] Integrity — a caller cannot POST an arbitrary action or target state
 *   to jump ahead or skip a required approval. `transition()` only honors
 *   actions defined for the instance's CURRENT state (throws otherwise), and
 *   the server authorizes ownership before every transition/list (nothing is
 *   user-scoped by default) so one user can neither advance nor read another's
 *   instance. Build the UI's buttons from `getAvailableActions()`, but enforce
 *   every transition server-side.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
