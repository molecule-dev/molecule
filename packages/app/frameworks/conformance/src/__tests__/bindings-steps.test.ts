/**
 * What the binding kit's step types record, run on the React reference: kept
 * call results (`as` / `on`), function identity (`stable`), selector
 * callbacks (`$fn` with `pick`), outside-step rejections and the `storage`
 * step through an area's storage provider.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { type HookCase, runHookCase } from '../bindings/index.js'
import { reactBindingAdapter } from './react-bindings-adapter.js'

const run = (hook: string, testCase: Omit<HookCase, 'name'>) =>
  runHookCase(reactBindingAdapter, hook, { name: 'kit step', ...testCase })

describe('binding kit steps', () => {
  it('calls a method of a value an earlier call kept', async () => {
    const result = await run('useLogger', {
      args: ['app'],
      steps: [
        { type: 'call', method: 'child', args: ['db'], as: 'db' },
        { type: 'call', on: 'db', method: 'info', args: ['connected'] },
      ],
    })
    expect(result.calls).toContainEqual({ name: 'logger.info', args: ['app:db', 'connected'] })
    expect(result.calls.map((call) => call.name)).toContain('=> db.info')
  })

  it('fails the case when a call names a value nothing kept', async () => {
    await expect(
      run('useLogger', { args: ['app'], steps: [{ type: 'call', on: 'db', method: 'info' }] }),
    ).rejects.toThrow('no call kept a value as db')
  })

  it('records whether a method is the same function across re-renders', async () => {
    const result = await run('useTranslation', {
      steps: [
        { type: 'stable', methods: ['t'] },
        { type: 'args', args: [] },
        { type: 'stable', methods: ['t'] },
      ],
    })
    expect(result.calls.filter((call) => call.name === 'stable')).toEqual([
      { name: 'stable', args: [{ t: 'first' }] },
      { name: 'stable', args: [{ t: 'same' }] },
    ])
  })

  it('lets a $fn with pick act as a selector', async () => {
    const result = await run('useStore', {
      context: { areas: { core: { stores: { counter: { initialState: { count: 2 } } } } } },
      args: [{ $ref: 'core.counter' }, { selector: { $fn: 'select', pick: [0, 'count'] } }],
    })
    expect(result.snapshots[0]).toEqual({ result: 2, route: '/' })
  })

  it('records an outside step that rejects instead of failing the case', async () => {
    const result = await run('useLocale', { steps: [{ type: 'locale', locale: 'xx' }] })
    const rejected = result.calls.find((call) => call.name === '! locale')
    expect(rejected?.args[0]).toEqual({ rejected: expect.any(String) })
  })

  it('writes a storage step through the storage provider an area put in place', async () => {
    const result = await run('useStorageValue', {
      context: { areas: { core: { storage: { sync: true } } } },
      args: ['theme', { sync: true, defaultValue: 'light' }],
      steps: [{ type: 'storage', key: 'theme', value: 'dark' }],
    })
    expect(result.snapshots.map((s) => (s as { result: { value: unknown } }).result.value)).toEqual(
      ['light', 'dark'],
    )
  })
})
