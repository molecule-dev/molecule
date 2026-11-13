/**
 * Cases for the state-store hooks (`useStore`, `useStateProvider`,
 * `useSetStore`, `useStoreAction`).
 *
 * Stores come from this area's fakes: a case seeds
 * `areas.core.stores.<name>.initialState` and passes the store as
 * `{ $ref: 'core.<name>' }`; a `core.<name>.set` control writes it from
 * outside (unrecorded — only the hook's own writes record, as
 * `core.<name>.setState`). Selectors, equality functions and actions are refs
 * too, so they receive the real state and their calls are recorded.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** One store with a count, seeded for most cases below. */
const counter = { stores: { counter: { initialState: { count: 0, name: 'a' } } } }

/** `useStateProvider()`: the state provider from context, and its factory. */
export const useStateProviderCases: HookCases = {
  hook: 'useStateProvider',
  cases: [
    {
      name: 'createStore returns a store with the state methods',
      steps: [
        {
          type: 'call',
          method: 'createStore',
          args: [{ initialState: { count: 0 }, name: 'probe' }],
        },
      ],
    },
    { name: 'without a state provider', context: { omitServices: ['state'] } },
  ],
}

/** `useStore(store, options?)`: subscribes to a store argument; no provider needed. */
export const useStoreCases: HookCases = {
  hook: 'useStore',
  cases: [
    {
      name: 'reads the initial state',
      args: [{ $ref: 'core.counter' }],
      context: { areas: { core: counter } },
    },
    {
      name: 'an outside write updates the subscribed value',
      args: [{ $ref: 'core.counter' }],
      context: { areas: { core: counter } },
      steps: [
        { type: 'control', name: 'core.counter.set', args: [{ count: 1 }] },
        { type: 'control', name: 'core.counter.set', args: [{ name: 'b' }] },
        { type: 'control', name: 'core.counter.set', args: [{ count: 2, name: 'c' }] },
      ],
    },
    {
      name: 'a selector receives the whole state and derives the result',
      args: [{ $ref: 'core.counter' }, { selector: { $ref: 'core.selectCount' } }],
      context: { areas: { core: counter } },
      steps: [{ type: 'control', name: 'core.counter.set', args: [{ count: 5 }] }],
    },
    {
      name: 'an equal selected value keeps the previous result',
      args: [
        { $ref: 'core.counter' },
        { selector: { $ref: 'core.selectSlice' }, equalityFn: { $ref: 'core.shallowEqual' } },
      ],
      context: { areas: { core: counter } },
      steps: [
        // Writing `name` leaves the selected slice equal: the equality
        // function must keep the previous result.
        { type: 'control', name: 'core.counter.set', args: [{ name: 'b' }] },
        { type: 'control', name: 'core.counter.set', args: [{ count: 1 }] },
      ],
    },
    {
      name: 'an equality function without a selector compares whole states',
      args: [{ $ref: 'core.counter' }, { equalityFn: { $ref: 'core.shallowEqual' } }],
      context: { areas: { core: counter } },
      steps: [{ type: 'control', name: 'core.counter.set', args: [{ name: 'b' }] }],
    },
    {
      name: 'unmount removes the subscription',
      args: [{ $ref: 'core.counter' }],
      context: { areas: { core: counter } },
      steps: [
        { type: 'control', name: 'core.counter.set', args: [{ count: 1 }] },
        { type: 'unmount' },
        { type: 'control', name: 'core.counter.set', args: [{ count: 2 }] },
      ],
    },
    {
      name: 'switching stores reads the new store',
      // Safe for hosts that re-mount on an argument change: the value comes
      // from the new store's own initial state either way.
      args: [{ $ref: 'core.counter' }],
      context: {
        areas: {
          core: {
            stores: { counter: counter.stores.counter, other: { initialState: { count: 9 } } },
          },
        },
      },
      steps: [{ type: 'args', args: [{ $ref: 'core.other' }] }],
    },
    {
      name: 'without a state provider',
      args: [{ $ref: 'core.counter' }],
      context: { omitServices: ['state'], areas: { core: counter } },
    },
  ],
}

/** `useSetStore(store)`: the store's setState function. */
export const useSetStoreCases: HookCases = {
  hook: 'useSetStore',
  cases: [
    {
      name: 'sets state through the store',
      args: [{ $ref: 'core.counter' }],
      context: { areas: { core: counter } },
      steps: [
        { type: 'call', args: [{ count: 3 }] },
        { type: 'call', args: [{ count: 4, name: 'b' }] },
      ],
    },
    {
      name: 'a functional updater receives the current state',
      args: [{ $ref: 'core.counter' }],
      context: { areas: { core: counter } },
      steps: [{ type: 'call', args: [{ $fn: 'bump', returns: { count: 9 } }] }],
    },
    {
      name: 'without a state provider',
      args: [{ $ref: 'core.counter' }],
      context: { omitServices: ['state'], areas: { core: counter } },
    },
  ],
}

/** `useStoreAction(store, action)`: a function bound to a store's setState/getState. */
export const useStoreActionCases: HookCases = {
  hook: 'useStoreAction',
  cases: [
    {
      name: 'runs the action with the store setState and getState',
      args: [{ $ref: 'core.counter' }, { $ref: 'core.increment' }],
      context: { areas: { core: counter } },
      steps: [{ type: 'call', args: [5] }],
    },
    {
      name: 'the action reads fresh state on every call',
      args: [{ $ref: 'core.counter' }, { $ref: 'core.increment' }],
      context: { areas: { core: counter } },
      steps: [
        { type: 'call', args: [2] },
        { type: 'control', name: 'core.counter.set', args: [{ count: 10 }] },
        { type: 'call', args: [3] },
      ],
    },
    {
      name: "the action's return value reaches the caller",
      args: [{ $ref: 'core.counter' }, { $ref: 'core.label' }],
      context: { areas: { core: counter } },
      steps: [
        { type: 'call', args: ['n'] },
        { type: 'control', name: 'core.counter.set', args: [{ count: 7 }] },
        { type: 'call', args: ['n'] },
      ],
    },
    {
      name: 'without a state provider',
      args: [{ $ref: 'core.counter' }, { $ref: 'core.increment' }],
      context: { omitServices: ['state'], areas: { core: counter } },
    },
  ],
}
