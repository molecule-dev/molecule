/**
 * Cases for the storage hooks (`useStorage`, `useStorageProvider`,
 * `useStorageValue`, `useStoragePreference`).
 *
 * Simple read/write cases run against the kit's base recorded provider,
 * seeded through `context.storage` (its writes record as `storage.set` /
 * `storage.remove` / `storage.clear`; a `storage` step writes from outside
 * without recording). Cases that need a synchronous read, a change
 * subscription, a deferred or failing read, or the preference store's bonded
 * provider seed `areas.core.storage` (see `fakes/core.ts`): that provider
 * records reads too, `core.storage.reply` settles a deferred read and a
 * `storage` step stores an outside write and delivers it to a subscriber.
 *
 * `useStoragePreference` reads the module-singleton preference store over the
 * BONDED provider, not the React context — its cases always seed
 * `areas.core.storage`, which bonds that provider for the case.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** `useStorageProvider()`: the storage provider from the framework's context. */
export const useStorageProviderCases: HookCases = {
  hook: 'useStorageProvider',
  cases: [
    {
      name: 'reads and misses through the context provider',
      context: { storage: { a: 'one' } },
      steps: [
        { type: 'call', method: 'get', args: ['a'] },
        { type: 'call', method: 'get', args: ['missing'] },
        { type: 'call', method: 'getMany', args: [['a', 'missing']] },
      ],
    },
    {
      name: 'writes go through the provider',
      context: { storage: { a: 'one' } },
      steps: [
        { type: 'call', method: 'set', args: ['b', 2] },
        { type: 'call', method: 'remove', args: ['a'] },
        { type: 'call', method: 'keys' },
      ],
    },
    { name: 'without a storage provider', context: { omitServices: ['storage'] } },
  ],
}

/** `useStorageValue(key, options?)`: one storage key as React state. */
export const useStorageValueCases: HookCases = {
  hook: 'useStorageValue',
  cases: [
    {
      name: 'a seeded value loads after mount',
      context: { storage: { theme: 'dark' } },
      args: ['theme'],
    },
    {
      name: 'a missing key falls back to the default value',
      args: ['missing', { defaultValue: 'light' }],
    },
    {
      name: 'without a default the value stays null',
      args: ['missing'],
    },
    {
      name: 'setValue persists and updates the value',
      args: ['theme', { defaultValue: 'light' }],
      steps: [
        { type: 'call', method: 'setValue', args: ['dark'] },
        { type: 'call', method: 'setValue', args: [''] },
      ],
    },
    {
      name: 'an object value round-trips',
      args: ['draft'],
      steps: [
        { type: 'call', method: 'setValue', args: [{ title: 'Hi', tags: ['a'] }] },
        { type: 'call', method: 'removeValue' },
      ],
    },
    {
      name: 'removeValue falls back to the default value',
      context: { storage: { theme: 'dark' } },
      args: ['theme', { defaultValue: 'light' }],
      steps: [{ type: 'call', method: 'removeValue' }],
    },
    {
      name: 'an outside write does not reach the hook without sync',
      context: { storage: { theme: 'dark' } },
      args: ['theme'],
      steps: [{ type: 'storage', key: 'theme', value: 'blue' }],
    },
    {
      name: 'sync on a provider without a subscription does nothing',
      context: { storage: { theme: 'dark' } },
      args: ['theme', { sync: true }],
      steps: [{ type: 'storage', key: 'theme', value: 'blue' }],
    },
    {
      name: 'a deferred read stays loading until it settles',
      context: { storage: { theme: 'dark' }, areas: { core: { storage: { deferReads: true } } } },
      args: ['theme', { defaultValue: 'light' }],
      steps: [{ type: 'control', name: 'core.storage.reply', args: ['dark'] }],
    },
    {
      name: 'a write before the first read lands wins',
      // The late read keeps the written value and still ends loading.
      context: {
        storage: { theme: 'dark' },
        areas: { core: { storage: { deferReads: true } } },
      },
      args: ['theme', { defaultValue: 'light' }],
      steps: [
        { type: 'call', method: 'setValue', args: ['blue'] },
        { type: 'control', name: 'core.storage.reply', args: ['dark'] },
      ],
    },
    {
      name: 'a new key starts over and loads its own value',
      context: { storage: { a: 'value of a', b: 'value of b' } },
      args: ['a', { defaultValue: 'default' }],
      steps: [{ type: 'args', args: ['b', { defaultValue: 'default' }] }],
    },
    {
      name: 'unmount while the first read is pending',
      context: { areas: { core: { storage: { deferReads: true } } } },
      args: ['theme'],
      steps: [{ type: 'unmount' }, { type: 'control', name: 'core.storage.reply', args: ['dark'] }],
    },
    {
      name: 'a failing read surfaces the error and clears loading',
      context: { areas: { core: { storage: { failReads: 'storage unavailable' } } } },
      args: ['theme', { defaultValue: 'light' }],
    },
    {
      name: 'a failing write records the error and rejects',
      context: { areas: { core: { storage: { failWrites: 'quota exceeded' } } } },
      args: ['theme', { defaultValue: 'light' }],
      steps: [
        { type: 'call', method: 'setValue', args: ['dark'] },
        { type: 'call', method: 'removeValue' },
      ],
    },
    {
      name: 'an outside write reaches the hook through sync',
      context: { areas: { core: { storage: { sync: true } } } },
      args: ['theme', { sync: true, defaultValue: 'light' }],
      steps: [
        { type: 'storage', key: 'theme', value: 'dark' },
        { type: 'storage', key: 'theme', value: null },
      ],
    },
    {
      name: 'without a storage provider',
      args: ['theme'],
      context: { omitServices: ['storage'], storage: { theme: 'dark' } },
    },
  ],
}

/** `useStoragePreference(key, options?)`: one preference through `getPreferenceStore()`. */
export const useStoragePreferenceCases: HookCases = {
  hook: 'useStoragePreference',
  cases: [
    {
      name: 'a synchronous provider answers on the first render',
      context: { storage: { width: 320 }, areas: { core: { storage: { sync: true } } } },
      args: ['width', { defaultValue: 280 }],
    },
    {
      name: 'a missing key reports the default once ready',
      context: { areas: { core: { storage: { sync: true } } } },
      args: ['width', { defaultValue: 280 }],
    },
    {
      name: 'without options the value is null until stored',
      context: { areas: { core: { storage: { sync: true } } } },
      args: ['width'],
    },
    {
      name: 'setValue persists through the preference store',
      context: { storage: { width: 320 }, areas: { core: { storage: { sync: true } } } },
      args: ['width', { defaultValue: 280 }],
      steps: [
        { type: 'call', method: 'setValue', args: [340] },
        { type: 'call', method: 'setValue', args: [360] },
      ],
    },
    {
      name: 'a functional update receives the previous value',
      context: { storage: { width: 320 }, areas: { core: { storage: { sync: true } } } },
      args: ['width', { defaultValue: 280 }],
      steps: [{ type: 'call', method: 'setValue', args: [{ $fn: 'grow', returns: 340 }] }],
    },
    {
      name: 'an asynchronous provider converges after hydration',
      context: {
        storage: { width: 320 },
        areas: { core: { storage: { deferReads: true } } },
      },
      args: ['width', { defaultValue: 280 }],
      steps: [{ type: 'control', name: 'core.storage.reply', args: [320] }],
    },
    {
      name: 'an edit before hydration wins over the stale snapshot',
      context: {
        storage: { width: 320 },
        areas: { core: { storage: { deferReads: true } } },
      },
      args: ['width', { defaultValue: 280 }],
      steps: [
        { type: 'call', method: 'setValue', args: [360] },
        { type: 'control', name: 'core.storage.reply', args: [320] },
      ],
    },
    {
      name: 'unmount before hydration settles',
      context: {
        storage: { width: 320 },
        areas: { core: { storage: { deferReads: true } } },
      },
      args: ['width', { defaultValue: 280 }],
      steps: [{ type: 'unmount' }, { type: 'control', name: 'core.storage.reply', args: [320] }],
    },
    {
      name: 'an outside write applies after hydration',
      context: { storage: { width: 320 }, areas: { core: { storage: { sync: true } } } },
      args: ['width', { defaultValue: 280 }],
      steps: [{ type: 'storage', key: 'width', value: 400 }],
    },
    {
      name: 'removeValue falls back to the default and persists the removal',
      context: { storage: { width: 320 }, areas: { core: { storage: { sync: true } } } },
      args: ['width', { defaultValue: 280 }],
      steps: [{ type: 'call', method: 'removeValue' }],
    },
    {
      name: 'a null key is local state and persists nothing',
      context: { areas: { core: { storage: { sync: true } } } },
      args: [null, { defaultValue: 'none' }],
      steps: [
        { type: 'call', method: 'setValue', args: ['typed'] },
        { type: 'call', method: 'removeValue' },
      ],
    },
    {
      name: 'switching keys re-reads the other key',
      // Safe for hosts that re-mount on an argument change: the kit snapshots
      // after the effects flush, where React's in-place key switch and a
      // fresh mount have both converged on the new key's value.
      context: {
        storage: { width: 320, density: 'compact' },
        areas: { core: { storage: { sync: true } } },
      },
      args: ['width', { defaultValue: 280 }],
      steps: [{ type: 'args', args: ['density', { defaultValue: 'cozy' }] }],
    },
    {
      name: 'without a storage provider',
      args: ['width', { defaultValue: 280 }],
      context: {
        omitServices: ['storage'],
        storage: { width: 320 },
        areas: { core: { storage: { sync: true } } },
      },
    },
  ],
}

/** `useStorage()`: the provider's operations as stable callbacks, no React state. */
export const useStorageCases: HookCases = {
  hook: 'useStorage',
  cases: [
    {
      name: 'reads, writes and removes through the provider',
      context: { storage: { a: 'one' } },
      steps: [
        { type: 'call', method: 'get', args: ['a'] },
        { type: 'call', method: 'set', args: ['b', 2] },
        { type: 'call', method: 'get', args: ['b'] },
        { type: 'call', method: 'remove', args: ['a'] },
        { type: 'call', method: 'keys' },
      ],
    },
    {
      name: 'clear empties the provider',
      context: { storage: { a: 1, b: 2 } },
      steps: [
        { type: 'call', method: 'clear' },
        { type: 'call', method: 'keys' },
      ],
    },
    {
      name: 'a missing key reads as null',
      steps: [{ type: 'call', method: 'get', args: ['nope'] }],
    },
    { name: 'without a storage provider', context: { omitServices: ['storage'] } },
  ],
}
