/**
 * What the binding kit's step types record, run on the React reference: kept
 * call results (`as` / `on`), function identity (`stable`), selector
 * callbacks (`$fn` with `pick`), outside-step rejections and the `storage`
 * step through an area's storage provider.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider } from '@molecule/app-i18n'

import {
  type BindingAdapter,
  bindingCaseFamilies,
  type HookCase,
  type HookCases,
  type MountOptions,
  reactiveSources,
  requireSources,
  runHookCase,
} from '../bindings/index.js'
import { featureCases } from '../features/index.js'
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

  it('restores the bonds after a case that throws mid-run, so later cases are unaffected', async () => {
    const i18nBefore = getI18nProvider()
    await expect(
      run('useLogger', { args: ['app'], steps: [{ type: 'call', on: 'db', method: 'info' }] }),
    ).rejects.toThrow('no call kept a value as db')
    // The case bonded its own i18n provider (en/fr/de/ar); the one before it is back.
    expect(getI18nProvider()).toBe(i18nBefore)
    const result = await run('useTranslation', {})
    expect(result.snapshots).toHaveLength(1)
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

describe('runHookCase mount flags', () => {
  /** An adapter whose host records the options it was mounted with. */
  const recordingAdapter = (seen: (MountOptions | undefined)[]): BindingAdapter => ({
    name: 'recording',
    has: () => true,
    mount: async (_hook, _args, _services, _shape, options) => {
      seen.push(options)
      return {
        result: () => 1,
        read: (value) => value,
        setArgs: async () => undefined,
        flush: async () => undefined,
        unmount: async () => undefined,
      }
    },
  })

  it("mounts a feature hook with its own family's flags, not the binding kit's", async () => {
    const seen: (MountOptions | undefined)[] = []
    const adapter = recordingAdapter(seen)
    await runHookCase(adapter, 'useFeatureOnly', { name: 'flags' }, undefined, {
      reactiveArgs: true,
    })
    // Without a family, a hook the binding kit has no family for mounts with no flags.
    await runHookCase(adapter, 'useFeatureOnly', { name: 'flags' })
    expect(seen).toEqual([{ reactiveArgs: true, arity: 0 }, undefined])
  })

  it('passes a reactive hook the longest argument list its case uses', async () => {
    const seen: (MountOptions | undefined)[] = []
    await runHookCase(
      recordingAdapter(seen),
      'useFeatureOnly',
      {
        name: 'arity',
        args: ['/items'],
        steps: [
          { type: 'args', args: ['/items', true] },
          { type: 'args', args: [] },
        ],
      },
      undefined,
      { reactiveArgs: true },
    )
    expect(seen).toEqual([{ reactiveArgs: true, arity: 2 }])
  })

  it('every hook family whose cases change arguments follows them on the same mount', () => {
    const families: HookCases[] = [
      ...bindingCaseFamilies,
      ...Object.values(featureCases).flatMap((feature) => feature.hooks ?? []),
    ]
    const changing = families.filter((family) =>
      family.cases.some((c) => (c.steps ?? []).some((step) => step.type === 'args')),
    )
    expect(changing.length).toBeGreaterThan(0)
    expect(changing.filter((family) => !family.reactiveArgs).map((family) => family.hook)).toEqual(
      [],
    )
  })
})

describe('reactive argument sources', () => {
  const box = (value: unknown) => ({ value })

  it('gives every position up to the arity a source, undefined past the arguments', () => {
    expect(
      reactiveSources('useIsActive', ['/items'], { reactiveArgs: true, arity: 2 }, box),
    ).toEqual([{ value: '/items' }, { value: undefined }])
    expect(reactiveSources('useIsActive', ['/items'], {}, box)).toBeNull()
  })

  it('refuses a function argument, which Vue and Solid would read as a getter', () => {
    expect(() =>
      reactiveSources('useAsync', [() => 1], { reactiveArgs: true, arity: 1 }, box),
    ).toThrow(/argument 0 is a function/)
  })

  it('refuses to change the arguments of a hook whose family is not reactive', () => {
    expect(() => requireSources('useLogger', null)).toThrow(/must set reactiveArgs/)
    expect(requireSources('useIsActive', [box(1)])).toEqual([{ value: 1 }])
  })
})
