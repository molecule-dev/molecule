/**
 * What a React recording can hold every framework to, beyond the first render:
 * result fields that appear later (`useParams` after a navigation, `useQuery`'s
 * `isPreviousData` after a key change), an AbortSignal that aborts after the
 * call that received it, the browser's Network Information, and a hook that
 * recovers after it threw.
 *
 * Until 2026-11-14 the shape came from the first snapshot only, so the golden of
 * `useParams` at `/items/9` read `{}` and a framework returning the wrong `id`
 * passed; an abort after the call was invisible; and `navigator.connection`
 * could not be set, so no case reached the data-saver path of `shouldPrefetch()`.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { getQueryClient, shouldPrefetch } from '@molecule/app-query'

import { createQueryFakes } from '../bindings/fakes/query.js'
import {
  type BindingAdapter,
  bindingCaseFamilies,
  completeSnapshots,
  HookThrew,
  type MountedHook,
  runHookCase,
  widenShape,
} from '../bindings/index.js'
import { CallRecorder } from '../ui/steps.js'
import { reactBindingAdapter } from './react-bindings-adapter.js'

const paramsCase = (() => {
  const found = bindingCaseFamilies
    .find((family) => family.hook === 'useParams')
    ?.cases.find((c) => c.name === 'empty when nothing matches, filled when it does')
  if (!found) throw new Error('the useParams case moved; update this test')
  return found
})()

describe('result shape across renders', () => {
  it("widens React's shape with a field that appears after the first render", async () => {
    const result = await runHookCase(reactBindingAdapter, 'useParams', paramsCase)
    expect(result.shape).toEqual({ kind: 'object', fields: { id: 'value' } })
    expect(result.snapshots).toEqual([
      { result: { id: null }, route: '/users' },
      { result: { id: '9' }, route: '/items/9' },
    ])
  })

  it("counterexample: a framework run reads React's shape as given and never widens it", async () => {
    const given = { kind: 'object', fields: {} } as const
    const result = await runHookCase(reactBindingAdapter, 'useParams', paramsCase, given)
    expect(result.shape).toBe(given)
    expect(result.snapshots).toEqual([
      { result: {}, route: '/users' },
      { result: {}, route: '/items/9' },
    ])
  })

  it('keeps the first kind of a field and leaves a non-object shape alone', () => {
    const shape = widenShape(undefined, { a: 1 })
    expect(widenShape(shape, { a: () => 1, b: () => 2 })).toEqual({
      kind: 'object',
      fields: { a: 'value', b: 'method' },
    })
    expect(widenShape({ kind: 'function' }, { a: 1 })).toEqual({ kind: 'function' })
    expect(widenShape(shape, { a: 2 })).toBe(shape)
  })

  it('completes earlier snapshots the way an absent field reads, and skips throws and unmounts', () => {
    const shape = { kind: 'object', fields: { a: 'value', b: 'value', go: 'method' } } as const
    expect(
      completeSnapshots(
        [{ result: { a: 1 }, route: '/' }, { result: { $threw: 'Error' }, route: '/' }, null],
        shape,
      ),
    ).toEqual([
      { result: { a: 1, b: null, go: { $missingMethod: null } }, route: '/' },
      { result: { $threw: 'Error' }, route: '/' },
      null,
    ])
  })
})

describe('AbortSignal arguments', () => {
  it('records the abort of the signal a call received, by call number', () => {
    const recorder = new CallRecorder({ fetch: { returns: 'ok' } })
    const fetch = recorder.spy('fetch')
    const first = new AbortController()
    const second = new AbortController()
    fetch(first.signal)
    fetch(second.signal)
    second.abort()
    expect(
      recorder.calls.map((call) => [call.name, call.name === 'fetch' ? [] : call.args]),
    ).toEqual([
      ['fetch', []],
      ['fetch', []],
      ['fetch aborted', [1]],
    ])
  })

  it('counterexample: a signal already aborted when handed over records nothing more', () => {
    const recorder = new CallRecorder({ fetch: { returns: 'ok' } })
    const controller = new AbortController()
    controller.abort()
    recorder.spy('fetch')(controller.signal)
    expect(recorder.calls.map((call) => call.name)).toEqual(['fetch'])
  })
})

describe('query area connection seed', () => {
  it('puts the seeded Network Information in place for the case and removes it after', () => {
    expect(shouldPrefetch()).toBe(true)
    const fakes = createQueryFakes(
      { areas: { query: { connection: { saveData: true } } } },
      () => undefined,
    )
    expect(shouldPrefetch()).toBe(false)
    expect(getQueryClient()).toBeDefined()
    fakes.dispose?.()
    expect(Object.prototype.hasOwnProperty.call(navigator, 'connection')).toBe(false)
    expect(shouldPrefetch()).toBe(true)
  })
})

describe('an args step after a throw', () => {
  /**
   * An adapter whose hook throws for `'bad'` and returns its argument otherwise, logging
   * each mount and each re-render with new arguments.
   */
  const throwingAdapter = (log: string[]): BindingAdapter => ({
    name: 'throwing',
    has: () => true,
    mount: async (_hook, args) => {
      log.push(`mount ${String(args[0])}`)
      let current: unknown = args[0] === 'bad' ? new HookThrew(new Error('bad')) : args[0]
      const mounted: MountedHook = {
        result: () => current,
        read: (value) => value,
        setArgs: async (next) => {
          log.push(`setArgs ${String(next[0])}`)
          current = next[0]
        },
        flush: async () => undefined,
        unmount: async () => {
          log.push('unmount')
        },
      }
      return mounted
    },
  })

  it('re-mounts the host, since an app mounts a fresh component after a throw', async () => {
    const log: string[] = []
    const result = await runHookCase(throwingAdapter(log), 'useAnything', {
      name: 'recovers',
      args: ['bad'],
      steps: [
        { type: 'args', args: ['good'] },
        { type: 'args', args: ['better'] },
      ],
    })
    // After the recovery the host is live again, so the next args step re-renders it.
    expect(log).toEqual(['mount bad', 'unmount', 'mount good', 'setArgs better', 'unmount'])
    expect(result.snapshots.map((s) => (s as { result: unknown }).result)).toEqual([
      { $threw: 'Error' },
      'good',
      'better',
    ])
  })
})
