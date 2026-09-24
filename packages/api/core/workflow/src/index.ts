/**
 * Workflow/state machine core interface for molecule.dev.
 *
 * Defines the `WorkflowProvider` interface for managing workflow definitions,
 * instances, state transitions, and event history. Bond packages (database,
 * in-memory, etc.) implement this interface. Application code uses the
 * convenience functions which delegate to the bonded provider.
 *
 * @remarks
 * - **`guard` / `onEnter` / `onExit` / `action` are string KEYS, not code.** This core never
 *   evaluates them — the bonded provider does. `@molecule/api-workflow-database` runs them
 *   against handlers you register at EVERY startup (`registerGuard` / `registerAction` /
 *   `registerHook`): a falsy guard rejects the transition, and a key with no registered
 *   handler THROWS on transition. A provider that documents no hook execution ignores them —
 *   then enforce preconditions/side-effects in your handler around {@link transition}.
 * - `transition(instanceId, action, data)` takes the ACTION name (a key of the current
 *   state's `transitions`), NOT the target state.
 * - `createWorkflow()` stores a NEW definition on every call — create it once (or find it
 *   via {@link listWorkflows}), never on every boot.
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
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   createWorkflow,
 *   getAvailableActions,
 *   getHistory,
 *   listWorkflows,
 *   setProvider,
 *   startInstance,
 *   transition,
 * } from '@molecule/api-workflow'
 * import { provider, registerGuard } from '@molecule/api-workflow-database'
 *
 * // Startup: DataStore (DATABASE_URL; apply the bond's __setup__/workflow.sql first), then
 * // the workflow provider, then EVERY guard/hook key the definitions reference.
 * setStore(store)
 * setProvider(provider)
 * registerGuard('isPaid', (ctx) => ctx.data.paid === true)
 *
 * // Create the definition ONCE — createWorkflow() inserts a new row on every call.
 * const existing = (await listWorkflows()).find((workflow) => workflow.name === 'order-lifecycle')
 * const orderFlow =
 *   existing ??
 *   (await createWorkflow({
 *     name: 'order-lifecycle',
 *     initialState: 'pending',
 *     states: {
 *       pending: {
 *         transitions: {
 *           ship: { target: 'shipped', guard: 'isPaid' },
 *           cancel: { target: 'cancelled' },
 *         },
 *       },
 *       shipped: { transitions: {}, final: true },
 *       cancelled: { transitions: {}, final: true },
 *     },
 *   }))
 *
 * const order = await startInstance(orderFlow.id, { orderId: 'ord_123', paid: false })
 * const actions = await getAvailableActions(order.id) // ['ship', 'cancel'] → render the buttons
 *
 * // ACTION name (not the target state); the data merges into the instance before the guard runs.
 * const shipped = await transition(order.id, 'ship', { paid: true }) // shipped.state === 'shipped'
 * const history = await getHistory(order.id) // [{ action: 'ship', fromState: 'pending', toState: 'shipped', … }]
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
 *   next transition — via a registered guard (`@molecule/api-workflow-database`
 *   evaluates `guard` keys) or a check in the handler around `transition()`
 *   (check, then transition, then act): a required
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
