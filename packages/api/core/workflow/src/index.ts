/**
 * Workflow/state machine core interface for molecule.dev.
 *
 * Defines the `WorkflowProvider` interface for managing workflow definitions,
 * instances, state transitions, and event history. Bond packages (database,
 * in-memory, etc.) implement this interface. Application code uses the
 * convenience functions which delegate to the bonded provider.
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

export * from './provider.js'
export * from './types.js'
