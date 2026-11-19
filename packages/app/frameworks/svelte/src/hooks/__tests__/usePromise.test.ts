// @vitest-environment jsdom
/**
 * `usePromise`: React's `usePromise` cases in Svelte's idiom. The hook runs
 * during component init and returns a readable store of React's `[state, call]`
 * tuple; each call's outcome is published to that store, and destroying the
 * component (React's unmount) stops further updates.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../../context.js'
import { usePromise, type UsePromiseState, type UsePromiseStore } from '../usePromise.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/** The mounted hosts this file tears down after each case. */
const mounts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of mounts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * A mounted host that calls `usePromise` once during a child's init.
 *
 * @param asyncFn - The async function to wrap.
 * @returns The hook's store and the unmount.
 */
function mountHook<T, A extends unknown[]>(
  asyncFn: (...args: A) => Promise<T>,
): {
  tracker: UsePromiseStore<T, A>
  stop: () => Promise<void>
} {
  const captured: { result?: UsePromiseStore<T, A> } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = usePromise(asyncFn)
      },
    },
  })
  flushSync()
  const tracker = captured.result
  if (tracker === undefined) throw new Error('the host never ran the hook')
  let stopped = false
  const stop = async (): Promise<void> => {
    if (stopped) return
    stopped = true
    await unmount(app)
    container.remove()
  }
  mounts.push(stop)
  return { tracker, stop }
}

/**
 * The current state of a mounted tracker.
 *
 * @param tracker - The hook's store.
 * @returns The state React's tuple carries first.
 */
function stateOf<T, A extends unknown[]>(tracker: UsePromiseStore<T, A>): UsePromiseState<T> {
  return get(tracker)[0]
}

describe('usePromise', () => {
  it('initial state is idle with null value and error', () => {
    const asyncFn = vi.fn(() => Promise.resolve('data'))
    const { tracker } = mountHook(asyncFn)

    const state = stateOf(tracker)
    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })

  it('sets pending on call, then resolved on success', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))

    const { tracker } = mountHook(asyncFn)

    const callPromise = get(tracker)[1]()

    expect(stateOf(tracker).status).toBe('pending')
    expect(stateOf(tracker).value).toBeNull()
    expect(stateOf(tracker).error).toBeNull()

    resolve('hello')
    await callPromise

    expect(stateOf(tracker).status).toBe('resolved')
    expect(stateOf(tracker).value).toBe('hello')
    expect(stateOf(tracker).error).toBeNull()
  })

  it('sets pending on call, then rejected on error', async () => {
    let reject!: (error: Error) => void
    const asyncFn = vi.fn(() => new Promise<string>((_r, rej) => (reject = rej)))

    const { tracker } = mountHook(asyncFn)

    const callPromise = get(tracker)[1]()

    expect(stateOf(tracker).status).toBe('pending')

    reject(new Error('something went wrong'))
    try {
      await callPromise
    } catch (_error) {
      // expected rejection — the promise rejects by design; ignoring here is safe
    }

    expect(stateOf(tracker).status).toBe('rejected')
    expect(stateOf(tracker).value).toBeNull()
    expect(stateOf(tracker).error).toBeInstanceOf(Error)
    const error = stateOf(tracker).error
    if (error === null) throw new Error('expected the failure to be recorded')
    expect(error.message).toBe('something went wrong')
  })

  it('cancel sets status to rejected with error message', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))

    const { tracker } = mountHook(asyncFn)

    get(tracker)[1]()

    expect(stateOf(tracker).status).toBe('pending')

    stateOf(tracker).cancel('User cancelled')

    expect(stateOf(tracker).status).toBe('rejected')
    expect(stateOf(tracker).error).toBeInstanceOf(Error)
    const error = stateOf(tracker).error
    if (error === null) throw new Error('expected the cancellation to be recorded')
    expect(error.message).toBe('User cancelled')

    // Resolve should be ignored after cancel
    resolve('should be ignored')
    await flush()

    expect(stateOf(tracker).status).toBe('rejected')
    expect(stateOf(tracker).value).toBeNull()
  })

  it('cancel without message sets rejected with null error', async () => {
    const asyncFn = vi.fn(() => new Promise<string>(() => {}))

    const { tracker } = mountHook(asyncFn)

    get(tracker)[1]()

    stateOf(tracker).cancel()

    expect(stateOf(tracker).status).toBe('rejected')
    expect(stateOf(tracker).error).toBeNull()
  })

  it('reset clears state back to idle', async () => {
    const asyncFn = vi.fn(() => Promise.resolve('data'))

    const { tracker } = mountHook(asyncFn)

    await get(tracker)[1]()

    expect(stateOf(tracker).status).toBe('resolved')
    expect(stateOf(tracker).value).toBe('data')

    stateOf(tracker).reset()

    expect(stateOf(tracker).status).toBe('idle')
    expect(stateOf(tracker).value).toBeNull()
    expect(stateOf(tracker).error).toBeNull()
  })

  it('multiple calls - only latest result is used (stale calls ignored)', async () => {
    const resolvers: Array<(value: string) => void> = []
    const asyncFn = vi.fn(
      (_id: string) =>
        new Promise<string>((r) => {
          resolvers.push((val: string) => r(val))
        }),
    )

    const { tracker } = mountHook(asyncFn)

    // Start first call
    get(tracker)[1]('first')

    // Start second call (should make first stale)
    const promise2 = get(tracker)[1]('second')

    expect(stateOf(tracker).status).toBe('pending')

    // Resolve the first call - should be ignored since it's stale
    resolvers[0]('first-result')
    await flush()

    // Value should still be null because first call is stale
    expect(stateOf(tracker).value).toBeNull()
    expect(stateOf(tracker).status).toBe('pending')

    // Resolve the second call - should be applied
    resolvers[1]('second-result')
    await promise2

    expect(stateOf(tracker).status).toBe('resolved')
    expect(stateOf(tracker).value).toBe('second-result')
  })

  it('unmount prevents state updates', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))

    const { tracker, stop } = mountHook(asyncFn)

    get(tracker)[1]()

    expect(stateOf(tracker).status).toBe('pending')

    // Unmount the component
    await stop()

    // Resolve after unmount - should not throw or update state
    resolve('after unmount')
    await flush()

    // State should still be pending (no update after unmount)
    expect(stateOf(tracker).status).toBe('pending')
  })

  it('returns the resolved value from the wrapped function', async () => {
    const asyncFn = vi.fn(() => Promise.resolve(42))

    const { tracker } = mountHook(asyncFn)

    const returnedValue = await get(tracker)[1]()

    expect(returnedValue).toBe(42)
  })
})
