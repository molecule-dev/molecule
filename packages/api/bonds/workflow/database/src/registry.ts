/**
 * Pluggable guard / action / hook registry for the database workflow bond.
 *
 * A workflow definition stores `guard`, `action`, `onEnter`, and `onExit` as
 * string IDENTIFIERS — never executable code. To evaluate them SAFELY (no
 * `eval` of arbitrary strings) the application registers named handlers by key
 * at startup, and the provider's `transition()` looks each identifier up here
 * and runs the registered function. This keeps behaviour swappable (register a
 * different function to change it) and safe (a definition can never inject
 * code). A referenced identifier with no registered handler is treated as a
 * misconfiguration and reported by `transition()` — never silently skipped.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import type { WorkflowActionFn, WorkflowGuardFn } from './types.js'

const guards = new Map<string, WorkflowGuardFn>()
const actions = new Map<string, WorkflowActionFn>()
const hooks = new Map<string, WorkflowActionFn>()

/**
 * Registers a guard predicate under `key`. A transition whose `guard`
 * identifier matches `key` runs this predicate; a falsy result blocks the
 * transition. Re-registering the same key replaces the previous predicate.
 *
 * @param key - The guard identifier used in workflow definitions.
 * @param fn - The predicate deciding whether the transition may proceed.
 */
export const registerGuard = (key: string, fn: WorkflowGuardFn): void => {
  guards.set(key, fn)
}

/**
 * Registers a transition action handler under `key`. A transition whose
 * `action` identifier matches `key` runs this handler during the transition.
 * Re-registering the same key replaces the previous handler.
 *
 * @param key - The action identifier used in workflow definitions.
 * @param fn - The side-effect handler to run during the transition.
 */
export const registerAction = (key: string, fn: WorkflowActionFn): void => {
  actions.set(key, fn)
}

/**
 * Registers a state hook handler under `key`. A state whose `onEnter` or
 * `onExit` identifier matches `key` runs this handler when entered/exited.
 * Re-registering the same key replaces the previous handler.
 *
 * @param key - The hook identifier used in workflow definitions.
 * @param fn - The side-effect handler to run on state enter/exit.
 */
export const registerHook = (key: string, fn: WorkflowActionFn): void => {
  hooks.set(key, fn)
}

/**
 * Looks up a registered guard predicate.
 *
 * @param key - The guard identifier.
 * @returns The registered predicate, or `undefined` if none is registered.
 */
export const getGuard = (key: string): WorkflowGuardFn | undefined => guards.get(key)

/**
 * Looks up a registered transition action handler.
 *
 * @param key - The action identifier.
 * @returns The registered handler, or `undefined` if none is registered.
 */
export const getAction = (key: string): WorkflowActionFn | undefined => actions.get(key)

/**
 * Looks up a registered state hook handler.
 *
 * @param key - The hook identifier.
 * @returns The registered handler, or `undefined` if none is registered.
 */
export const getHook = (key: string): WorkflowActionFn | undefined => hooks.get(key)

/**
 * Reports whether a guard is registered under `key`.
 *
 * @param key - The guard identifier.
 * @returns `true` if a guard is registered.
 */
export const hasGuard = (key: string): boolean => guards.has(key)

/**
 * Reports whether a transition action is registered under `key`.
 *
 * @param key - The action identifier.
 * @returns `true` if an action handler is registered.
 */
export const hasAction = (key: string): boolean => actions.has(key)

/**
 * Reports whether a state hook is registered under `key`.
 *
 * @param key - The hook identifier.
 * @returns `true` if a hook handler is registered.
 */
export const hasHook = (key: string): boolean => hooks.has(key)

/**
 * Clears every registered guard, action, and hook. Primarily for tests and
 * for re-configuring handlers from a clean slate.
 */
export const clearWorkflowHandlers = (): void => {
  guards.clear()
  actions.clear()
  hooks.clear()
}

/**
 * Thrown by `transition()` when a registered guard returns a falsy value and
 * blocks the transition. Distinct from a generic transition error so callers
 * can react to a *denied* transition (e.g. respond 403) rather than treat it
 * as a server fault. Carries the instance, action, and guard that produced it.
 */
export class WorkflowGuardRejectedError extends Error {
  /** The instance whose transition was blocked. */
  readonly instanceId: string
  /** The action that was attempted. */
  readonly action: string
  /** The guard identifier that rejected the transition. */
  readonly guard: string

  /**
   * Builds a guard-rejection error naming the blocked transition.
   *
   * @param instanceId - The instance whose transition was blocked.
   * @param action - The action that was attempted.
   * @param guard - The guard identifier that rejected the transition.
   */
  constructor(instanceId: string, action: string, guard: string) {
    super(
      t('workflow.error.guardRejected', undefined, {
        defaultValue: `Transition '${action}' on instance '${instanceId}' was blocked by guard '${guard}'`,
      }),
    )
    this.name = 'WorkflowGuardRejectedError'
    this.instanceId = instanceId
    this.action = action
    this.guard = guard
  }
}
