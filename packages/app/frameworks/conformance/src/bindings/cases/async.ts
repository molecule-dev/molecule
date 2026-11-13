/**
 * Cases for the async-state hooks.
 *
 * `usePromise` and `useAsyncState` return a TUPLE `[state, fn, …]`; the kit
 * snapshots it as a value-shaped result, and a `call` step reaches a tuple
 * member by its index as the method name (`method: '1'` calls the second
 * element). Any binding whose snapshot equals React's tuple has the same
 * members at the same indices, so the index names the same function in every
 * framework.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/**
 * `usePromise(asyncFn)`: `[state, wrapped]` — the state of the latest call and
 * the function that tracks it.
 */
export const usePromiseCases: HookCases = {
  hook: 'usePromise',
  cases: [
    { name: 'idle with no call yet', args: [{ $fn: 'work', resolve: 'done' }] },
    {
      name: 'cancel marks a pending call rejected with its message, and its late result is not shown',
      args: [{ $fn: 'work', defer: true }],
      steps: [
        { type: 'call', method: '1', args: ['a'] },
        { type: 'call', method: '0.cancel', args: ['Stopped'] },
        { type: 'settle', fn: 'work', value: 'late' },
      ],
    },
    {
      name: 'cancel with no message, then reset returns to idle',
      args: [{ $fn: 'work', defer: true }],
      steps: [
        { type: 'call', method: '1' },
        { type: 'call', method: '0.cancel' },
        { type: 'call', method: '0.reset' },
        { type: 'settle', fn: 'work', value: 'late' },
      ],
    },
    {
      name: 'reset after a resolved call clears the value',
      args: [{ $fn: 'work', resolve: 'done' }],
      steps: [
        { type: 'call', method: '1' },
        { type: 'call', method: '0.reset' },
      ],
    },
    {
      name: 'a call shows pending, then resolved with the value and its arguments pass through',
      args: [{ $fn: 'work', defer: true }],
      steps: [
        { type: 'call', method: '1', args: ['a'] },
        { type: 'settle', fn: 'work', value: 'done' },
      ],
    },
    {
      name: 'a rejection marks the state rejected and rethrows to its caller',
      args: [{ $fn: 'work', reject: 'nope' }],
      steps: [{ type: 'call', method: '1', args: ['a'] }],
    },
    {
      name: 'a stale resolution after a newer call started does not overwrite the value',
      args: [{ $fn: 'work', defer: true }],
      steps: [
        { type: 'call', method: '1' },
        { type: 'call', method: '1' },
        { type: 'settle', fn: 'work', value: 'first' },
        { type: 'settle', fn: 'work', value: 'second' },
      ],
    },
    {
      name: 'a stale rejection after a newer call started is not shown but rethrows to its caller',
      args: [{ $fn: 'work', defer: true }],
      steps: [
        { type: 'call', method: '1' },
        { type: 'call', method: '1' },
        { type: 'settle', fn: 'work', error: 'old' },
        { type: 'settle', fn: 'work', value: 'new' },
      ],
    },
    {
      name: 'unmount while a call is pending: no state update and no warning',
      args: [{ $fn: 'work', defer: true }],
      steps: [
        { type: 'call', method: '1', args: ['x'] },
        { type: 'unmount' },
        { type: 'settle', fn: 'work', value: 'late' },
      ],
    },
  ],
}

/**
 * `useAsyncState(initial)`: `[state, setState, extendState]` — `setState`
 * replaces, `extendState` merges; both accept a value, an updater or a promise.
 */
export const useAsyncStateCases: HookCases = {
  hook: 'useAsyncState',
  cases: [
    { name: 'holds the initial state', args: [{ count: 1, name: 'a' }] },
    {
      name: 'setState replaces the whole state',
      args: [{ count: 1, name: 'a' }],
      steps: [{ type: 'call', method: '1', args: [{ count: 2, name: 'a' }] }],
    },
    {
      name: 'setState takes an updater that receives the previous state',
      args: [{ count: 1, name: 'a' }],
      steps: [
        { type: 'call', method: '1', args: [{ $fn: 'bump', returns: { count: 9, name: 'a' } }] },
      ],
    },
    {
      name: 'setState accepts a promise and applies its value',
      args: [{ count: 1, name: 'a' }],
      context: { areas: { async: { promise: { resolve: { count: 5, name: 'a' } } } } },
      steps: [{ type: 'call', method: '1', args: [{ $ref: 'async.resolved' }] }],
    },
    {
      name: 'a rejecting promise leaves the state unchanged',
      args: [{ count: 1, name: 'a' }],
      context: { areas: { async: { promise: { reject: 'no' } } } },
      steps: [{ type: 'call', method: '1', args: [{ $ref: 'async.rejected' }] }],
    },
    {
      name: 'extendState merges a partial into the state',
      args: [{ count: 1, name: 'a' }],
      steps: [{ type: 'call', method: '2', args: [{ name: 'b' }] }],
    },
    {
      name: 'extendState takes an updater that receives the previous state',
      args: [{ count: 1, name: 'a' }],
      steps: [{ type: 'call', method: '2', args: [{ $fn: 'rename', returns: { name: 'c' } }] }],
    },
    {
      name: 'extendState accepts a promise resolving a partial',
      args: [{ count: 1, name: 'a' }],
      context: { areas: { async: { promise: { resolve: { name: 'd' } } } } },
      steps: [{ type: 'call', method: '2', args: [{ $ref: 'async.resolved' }] }],
    },
    {
      name: 'setState accepts a promise resolving an updater',
      args: [{ count: 1, name: 'a' }],
      steps: [{ type: 'call', method: '1', args: [{ $ref: 'async.replaceUpdater' }] }],
    },
    {
      name: 'extendState accepts a promise resolving an updater',
      args: [{ count: 1, name: 'a' }],
      steps: [{ type: 'call', method: '2', args: [{ $ref: 'async.extendUpdater' }] }],
    },
    {
      name: 'a promise settling after a newer synchronous set overwrites it',
      // Pins that useAsyncState has NO latest-wins guard, unlike useHttp and
      // usePromise: whatever settles last wins, even over a newer set.
      args: [{ count: 1, name: 'a' }],
      steps: [
        { type: 'call', method: '1', args: [{ $ref: 'async.pending' }] },
        { type: 'call', method: '1', args: [{ count: 2, name: 'b' }] },
        { type: 'control', name: 'async.resolvePromise', args: [{ count: 9, name: 'z' }] },
      ],
    },
    {
      name: 'unmount before a promise settles: no warning',
      args: [{ count: 1, name: 'a' }],
      steps: [
        { type: 'call', method: '1', args: [{ $ref: 'async.pending' }] },
        { type: 'unmount' },
        { type: 'control', name: 'async.resolvePromise', args: [{ count: 7, name: 'a' }] },
      ],
    },
  ],
}

/**
 * `useOptimisticValue(options)`: the value to render, `pending`, the newest
 * `error`, and `set` / `update`. Commits are scripted `{ $fn }` functions, or
 * the area's `{ $ref: 'async.commit' }` when a case drives `confirm`.
 */
export const useOptimisticValueCases: HookCases = {
  hook: 'useOptimisticValue',
  cases: [
    {
      name: 'shows the server value until it is changed',
      args: [{ value: { starred: false, stars: 40 }, commit: { $fn: 'save' } }],
    },
    {
      name: 'set shows the next value at once and saves it',
      args: [{ value: { starred: false, stars: 40 }, commit: { $fn: 'save' } }],
      steps: [{ type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] }],
    },
    {
      name: 'a commit return value replaces the shown value',
      args: [
        {
          value: { starred: false, stars: 40 },
          commit: { $fn: 'save', resolve: { starred: true, stars: 99 } },
        },
      ],
      steps: [{ type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] }],
    },
    {
      name: 'a rejected commit rolls back to the server value and reports the failure',
      args: [
        {
          value: { starred: false, stars: 40 },
          commit: { $fn: 'save', reject: 'save failed' },
          onError: { $fn: 'saveError' },
        },
      ],
      steps: [{ type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] }],
    },
    {
      name: 'taps during a save coalesce to the newest value',
      args: [{ value: { starred: false, stars: 40 }, commit: { $fn: 'save', defer: true } }],
      steps: [
        { type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] },
        { type: 'call', method: 'set', args: [{ starred: false, stars: 40 }] },
        { type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] },
        { type: 'settle', fn: 'save' },
      ],
    },
    {
      name: 'a queued change saves after the running one',
      args: [{ value: { starred: false, stars: 40 }, commit: { $fn: 'save', defer: true } }],
      steps: [
        { type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] },
        { type: 'call', method: 'set', args: [{ starred: false, stars: 40 }] },
        { type: 'settle', fn: 'save' },
        { type: 'settle', fn: 'save' },
      ],
    },
    {
      name: 'update computes from the value shown now',
      args: [{ value: { starred: false, stars: 40 }, commit: { $fn: 'save' } }],
      steps: [
        {
          type: 'call',
          method: 'update',
          args: [{ $fn: 'toggle', returns: { starred: true, stars: 41 } }],
        },
      ],
    },
    {
      name: 'setting the value the server already has does not save',
      args: [{ value: { starred: false, stars: 40 }, commit: { $fn: 'save' } }],
      steps: [{ type: 'call', method: 'set', args: [{ starred: false, stars: 40 }] }],
    },
    {
      name: 'a custom equals decides what counts as unchanged',
      // `{ $ref: 'async.sameStarred' }` compares only the starred flag: a
      // stars-only change is the same value (no save), a starred flip is not.
      args: [
        {
          value: { starred: false, stars: 40 },
          commit: { $fn: 'save' },
          equals: { $ref: 'async.sameStarred' },
        },
      ],
      steps: [
        { type: 'call', method: 'set', args: [{ starred: false, stars: 99 }] },
        { type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] },
      ],
    },
    {
      name: 'confirm keeps acknowledged progress when the save then fails',
      args: [
        {
          value: { starred: false, stars: 40 },
          commit: { $ref: 'async.commit' },
          onError: { $fn: 'saveError' },
        },
      ],
      context: { areas: { async: { commit: { confirmPatch: { starred: true, stars: 41 } } } } },
      steps: [
        { type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] },
        { type: 'control', name: 'async.rejectCommit', args: ['gone'] },
      ],
    },
    {
      name: 'an outside value during a save does not flip the shown value',
      // Depends on React keeping the pending save across the argument change:
      // a binding that re-mounts on `args` starts clean at the new server
      // value with nothing pending.
      args: [{ value: { starred: false, stars: 40 }, commit: { $fn: 'save', defer: true } }],
      steps: [
        { type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] },
        {
          type: 'args',
          args: [{ value: { starred: false, stars: 45 }, commit: { $fn: 'save', defer: true } }],
        },
        { type: 'settle', fn: 'save' },
      ],
    },
    {
      name: 'an outside value after a save becomes the shown value',
      args: [{ value: { starred: false, stars: 40 }, commit: { $fn: 'save' } }],
      steps: [
        { type: 'call', method: 'set', args: [{ starred: true, stars: 41 }] },
        {
          type: 'args',
          args: [{ value: { starred: false, stars: 45 }, commit: { $fn: 'save' } }],
        },
      ],
    },
  ],
}
