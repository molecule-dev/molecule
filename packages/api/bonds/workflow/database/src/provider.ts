/**
 * Database implementation of WorkflowProvider.
 *
 * Uses the abstract `@molecule/api-database` DataStore for persistence.
 * Tables: `workflows`, `workflow_instances`, `workflow_events`.
 *
 * @module
 */

import { create as dbCreate, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type {
  StateDefinition,
  Workflow,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowInstance,
  WorkflowProvider,
} from '@molecule/api-workflow'

import { getAction, getGuard, getHook, WorkflowGuardRejectedError } from './registry.js'
import type {
  WorkflowActionFn,
  WorkflowContext,
  WorkflowEventRow,
  WorkflowInstanceRow,
  WorkflowRow,
} from './types.js'

/**
 * Deserializes a raw JSON/JSONB column value returned by the bonded DataStore.
 *
 * Database bonds do NOT normalize the shape of a JSON column: PostgreSQL
 * `jsonb` (and MySQL `json`) columns are returned by the driver ALREADY
 * PARSED — a JS object/array — while the SQLite bond stores JSON as TEXT and
 * returns a string. Calling `JSON.parse()` unconditionally therefore crashes
 * on real Postgres with `SyntaxError: "[object Object]" is not valid JSON`.
 * This guard parses only when the value is still a string and passes an
 * already-parsed value through unchanged, so the round-trip is correct on
 * every database bond.
 *
 * @param value - The raw column value (a JSON string on SQLite, a parsed object on Postgres/MySQL).
 * @returns The parsed value, narrowed to `T`.
 */
function parseMaybeJson<T>(value: string | Record<string, unknown>): T {
  return (typeof value === 'string' ? JSON.parse(value) : value) as T
}

/**
 * Converts a workflow database row into a typed {@link Workflow}.
 *
 * @param row - The raw database row.
 * @returns The deserialized workflow.
 */
function toWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    initialState: row.initialState,
    states: parseMaybeJson<Record<string, StateDefinition>>(row.states),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Converts a workflow instance database row into a typed {@link WorkflowInstance}.
 *
 * @param row - The raw database row.
 * @returns The deserialized workflow instance.
 */
function toWorkflowInstance(row: WorkflowInstanceRow): WorkflowInstance {
  return {
    id: row.id,
    workflowId: row.workflowId,
    state: row.state,
    data: parseMaybeJson<Record<string, unknown>>(row.data),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Converts a workflow event database row into a typed {@link WorkflowEvent}.
 *
 * @param row - The raw database row.
 * @returns The deserialized workflow event.
 */
function toWorkflowEvent(row: WorkflowEventRow): WorkflowEvent {
  const event: WorkflowEvent = {
    id: row.id,
    instanceId: row.instanceId,
    action: row.action,
    fromState: row.fromState,
    toState: row.toState,
    createdAt: row.createdAt,
  }
  if (row.data) {
    try {
      event.data = parseMaybeJson<Record<string, unknown>>(row.data)
    } catch (_error) {
      /* ignore malformed JSON — event.data is optional; a parse failure leaves it undefined */
    }
  }
  return event
}

/**
 * Resolves a transition `action` identifier to its registered handler.
 *
 * A referenced-but-unregistered action is a misconfiguration: it throws so the
 * side-effect is never silently dropped. An absent identifier resolves to
 * `undefined` (no action to run).
 *
 * @param key - The transition's `action` identifier, if any.
 * @returns The registered handler, or `undefined` when no identifier is set.
 * @throws {Error} If `key` is set but no handler is registered for it.
 */
function resolveAction(key: string | undefined): WorkflowActionFn | undefined {
  if (!key) return undefined
  const fn = getAction(key)
  if (!fn) {
    throw new Error(
      t('workflow.error.actionNotRegistered', undefined, {
        defaultValue: `Action handler '${key}' is referenced by this transition but no handler is registered. Register it with registerAction('${key}', fn).`,
      }),
    )
  }
  return fn
}

/**
 * Resolves a state `onEnter` / `onExit` identifier to its registered handler.
 *
 * A referenced-but-unregistered hook is a misconfiguration: it throws so the
 * side-effect is never silently dropped. An absent identifier resolves to
 * `undefined` (no hook to run).
 *
 * @param kind - Which hook is being resolved (`onEnter` or `onExit`), for the error message.
 * @param key - The state's hook identifier, if any.
 * @returns The registered handler, or `undefined` when no identifier is set.
 * @throws {Error} If `key` is set but no handler is registered for it.
 */
function resolveHook(
  kind: 'onEnter' | 'onExit',
  key: string | undefined,
): WorkflowActionFn | undefined {
  if (!key) return undefined
  const fn = getHook(key)
  if (!fn) {
    throw new Error(
      t('workflow.error.hookNotRegistered', undefined, {
        defaultValue: `${kind} hook '${key}' is referenced by this state but no handler is registered. Register it with registerHook('${key}', fn).`,
      }),
    )
  }
  return fn
}

/**
 * Database-backed workflow provider implementing the {@link WorkflowProvider} interface.
 *
 * Stores workflow definitions, instances, and event history in the bonded DataStore.
 */
export const provider: WorkflowProvider = {
  name: 'database',

  async createWorkflow(definition: WorkflowDefinition): Promise<Workflow> {
    const result = await dbCreate<WorkflowRow>('workflows', {
      name: definition.name,
      initialState: definition.initialState,
      states: JSON.stringify(definition.states),
    })
    return toWorkflow(result.data!)
  },

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const row = await findById<WorkflowRow>('workflows', workflowId)
    return row ? toWorkflow(row) : null
  },

  async listWorkflows(): Promise<Workflow[]> {
    const rows = await findMany<WorkflowRow>('workflows', {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    return rows.map(toWorkflow)
  },

  async startInstance(
    workflowId: string,
    data?: Record<string, unknown>,
  ): Promise<WorkflowInstance> {
    const workflowRow = await findById<WorkflowRow>('workflows', workflowId)
    if (!workflowRow) {
      throw new Error(
        t('workflow.error.workflowNotFound', undefined, {
          defaultValue: `Workflow '${workflowId}' not found`,
        }),
      )
    }

    const result = await dbCreate<WorkflowInstanceRow>('workflow_instances', {
      workflowId,
      state: workflowRow.initialState,
      data: JSON.stringify(data ?? {}),
    })

    return toWorkflowInstance(result.data!)
  },

  async getInstance(instanceId: string): Promise<WorkflowInstance | null> {
    const row = await findById<WorkflowInstanceRow>('workflow_instances', instanceId)
    return row ? toWorkflowInstance(row) : null
  },

  async transition(
    instanceId: string,
    action: string,
    data?: Record<string, unknown>,
  ): Promise<WorkflowInstance> {
    const instanceRow = await findById<WorkflowInstanceRow>('workflow_instances', instanceId)
    if (!instanceRow) {
      throw new Error(
        t('workflow.error.instanceNotFound', undefined, {
          defaultValue: `Workflow instance '${instanceId}' not found`,
        }),
      )
    }

    const workflowRow = await findById<WorkflowRow>('workflows', instanceRow.workflowId)
    if (!workflowRow) {
      throw new Error(
        t('workflow.error.workflowNotFound', undefined, {
          defaultValue: `Workflow '${instanceRow.workflowId}' not found`,
        }),
      )
    }

    const states = parseMaybeJson<Record<string, StateDefinition>>(workflowRow.states)
    const currentState = states[instanceRow.state]

    if (!currentState) {
      throw new Error(
        t('workflow.error.invalidState', undefined, {
          defaultValue: `State '${instanceRow.state}' not found in workflow definition`,
        }),
      )
    }

    const transitionDef = currentState.transitions[action]
    if (!transitionDef) {
      throw new Error(
        t('workflow.error.invalidAction', undefined, {
          defaultValue: `Action '${action}' is not available from state '${instanceRow.state}'`,
        }),
      )
    }

    const fromState = instanceRow.state
    const toState = transitionDef.target

    const existingData = parseMaybeJson<Record<string, unknown>>(instanceRow.data)
    const context: WorkflowContext = {
      instanceId,
      workflowId: instanceRow.workflowId,
      action,
      fromState,
      toState,
      // A fresh, mutable copy so handlers can safely add/change fields; the
      // final value is what gets persisted below.
      data: data ? { ...existingData, ...data } : { ...existingData },
      workflow: toWorkflow(workflowRow),
    }

    // 1. Guard — evaluate BEFORE allowing the transition. A referenced-but-
    //    unregistered guard is a misconfiguration (reported, not passed); a
    //    guard returning falsy blocks the transition (reported, never dropped).
    if (transitionDef.guard) {
      const guardFn = getGuard(transitionDef.guard)
      if (!guardFn) {
        throw new Error(
          t('workflow.error.guardNotRegistered', undefined, {
            defaultValue: `Guard '${transitionDef.guard}' is referenced by this transition but no handler is registered. Register it with registerGuard('${transitionDef.guard}', fn).`,
          }),
        )
      }
      const allowed = await guardFn(context)
      if (!allowed) {
        throw new WorkflowGuardRejectedError(instanceId, action, transitionDef.guard)
      }
    }

    // 2. Resolve every side-effect handler up front, so a missing one throws
    //    BEFORE any hook fires or the instance is persisted (no partial run).
    const targetState: StateDefinition | undefined = states[toState]
    const onExitFn = resolveHook('onExit', currentState.onExit)
    const actionFn = resolveAction(transitionDef.action)
    const onEnterFn = resolveHook('onEnter', targetState?.onEnter)

    // 3. Invoke in order: onExit (leaving) → action (transition) → onEnter (entering).
    if (onExitFn) await onExitFn(context)
    if (actionFn) await actionFn(context)
    if (onEnterFn) await onEnterFn(context)

    const now = new Date().toISOString()

    await updateById('workflow_instances', instanceId, {
      state: toState,
      data: JSON.stringify(context.data),
      updatedAt: now,
    })

    await dbCreate('workflow_events', {
      instanceId,
      action,
      fromState,
      toState,
      data: data ? JSON.stringify(data) : null,
    })

    return {
      id: instanceRow.id,
      workflowId: instanceRow.workflowId,
      state: toState,
      data: context.data,
      createdAt: instanceRow.createdAt,
      updatedAt: now,
    }
  },

  async getState(instanceId: string): Promise<string> {
    const row = await findById<WorkflowInstanceRow>('workflow_instances', instanceId)
    if (!row) {
      throw new Error(
        t('workflow.error.instanceNotFound', undefined, {
          defaultValue: `Workflow instance '${instanceId}' not found`,
        }),
      )
    }
    return row.state
  },

  async getHistory(instanceId: string): Promise<WorkflowEvent[]> {
    const rows = await findMany<WorkflowEventRow>('workflow_events', {
      where: [{ field: 'instanceId', operator: '=' as const, value: instanceId }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })
    return rows.map(toWorkflowEvent)
  },

  async getAvailableActions(instanceId: string): Promise<string[]> {
    const instanceRow = await findById<WorkflowInstanceRow>('workflow_instances', instanceId)
    if (!instanceRow) {
      throw new Error(
        t('workflow.error.instanceNotFound', undefined, {
          defaultValue: `Workflow instance '${instanceId}' not found`,
        }),
      )
    }

    const workflowRow = await findById<WorkflowRow>('workflows', instanceRow.workflowId)
    if (!workflowRow) {
      throw new Error(
        t('workflow.error.workflowNotFound', undefined, {
          defaultValue: `Workflow '${instanceRow.workflowId}' not found`,
        }),
      )
    }

    const states = parseMaybeJson<Record<string, StateDefinition>>(workflowRow.states)
    const currentState = states[instanceRow.state]

    if (!currentState) return []

    return Object.keys(currentState.transitions)
  },
}
