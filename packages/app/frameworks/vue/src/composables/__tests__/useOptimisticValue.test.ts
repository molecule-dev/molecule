// @vitest-environment jsdom

/**
 * Vue counterpart of the React `useOptimisticValue` tests: the same observable
 * contract for a server-backed value — the immediate change, the in-order
 * saves, the coalescing of taps during a save, and the rollback on the newest
 * failure.
 *
 * @module
 */

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, effectScope, h, nextTick, onUpdated, type PropType, ref } from 'vue'

import type { UseOptimisticValueResult } from '../../types.js'
import { useOptimisticValue } from '../useOptimisticValue.js'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

interface Favorite {
  favorited: boolean
  count: number
}

/** A server whose saves finish when the test says so. */
const manualServer = (): {
  calls: Array<{ next: Favorite; reply: Deferred<Favorite> }>
  commit: (next: Favorite) => Promise<Favorite>
} => {
  const calls: Array<{ next: Favorite; reply: Deferred<Favorite> }> = []
  const commit = vi.fn((next: Favorite) => {
    const reply = deferred<Favorite>()
    calls.push({ next, reply })
    return reply.promise
  })
  return { calls, commit }
}

const FavoriteButton = defineComponent({
  props: {
    value: { type: Object as PropType<Favorite>, required: true },
    commit: {
      type: Function as PropType<(next: Favorite) => Promise<Favorite>>,
      required: true,
    },
  },
  setup(props) {
    const favorite = useOptimisticValue<Favorite>(() => ({
      value: props.value,
      equals: (a, b) => a.favorited === b.favorited && a.count === b.count,
      commit: props.commit,
    }))
    return () =>
      h(
        'button',
        {
          'aria-pressed': favorite.value.value.favorited,
          'data-pending': String(favorite.pending.value),
          'data-error': favorite.error.value ? String(favorite.error.value) : '',
          onClick: () =>
            favorite.update((current) => ({
              favorited: !current.favorited,
              count: current.count + (current.favorited ? -1 : 1),
            })),
        },
        String(favorite.value.value.count),
      )
  },
})

const wrappers: VueWrapper[] = []
const scopes: Array<() => void> = []

/**
 * Runs the composable in its own scope — Vue's counterpart of `renderHook`.
 *
 * @param factory - Creates the composable result.
 * @returns The result.
 */
function useInScope<T>(factory: () => T): T {
  const scope = effectScope()
  const result = scope.run(factory)
  if (!result) throw new Error('effectScope did not run the composable')
  scopes.push(() => scope.stop())
  return result
}

/** Lets every pending promise chain and queued render run. */
const settle = async (): Promise<void> => {
  await flushPromises()
  await nextTick()
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  for (const stop of scopes.splice(0)) stop()
})

describe('useOptimisticValue', () => {
  it('saves a second tap made while the first save is still running', async () => {
    const server = manualServer()
    const wrapper = mount(FavoriteButton, {
      props: { value: { favorited: false, count: 2 }, commit: server.commit },
    })
    wrappers.push(wrapper)

    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button').text()).toBe('3')
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('button').text()).toBe('2')
    expect(server.calls).toHaveLength(1)

    server.calls[0].reply.resolve({ favorited: true, count: 3 })
    await settle()
    expect(server.calls.map((call) => call.next.favorited)).toEqual([true, false])
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')

    server.calls[1].reply.resolve({ favorited: false, count: 2 })
    await settle()
    expect(wrapper.get('button').attributes('data-pending')).toBe('false')
    expect(wrapper.get('button').text()).toBe('2')
  })

  it('keeps the saved value when the parent re-renders with the props it loaded first', async () => {
    const server = manualServer()
    const loaded = { favorited: false, count: 2 }
    const wrapper = mount(FavoriteButton, { props: { value: loaded, commit: server.commit } })
    wrappers.push(wrapper)

    await wrapper.get('button').trigger('click')
    server.calls[0].reply.resolve({ favorited: true, count: 3 })
    await settle()
    await wrapper.setProps({ value: { favorited: false, count: 2 }, commit: server.commit })
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button').text()).toBe('3')
  })

  it('shows a refetched value when nothing is being saved', async () => {
    const server = manualServer()
    const wrapper = mount(FavoriteButton, {
      props: { value: { favorited: false, count: 2 }, commit: server.commit },
    })
    wrappers.push(wrapper)
    await wrapper.setProps({ value: { favorited: true, count: 9 }, commit: server.commit })
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button').text()).toBe('9')
    expect(server.commit).not.toHaveBeenCalled()
  })

  it('keeps the tap during a save when a refetch arrives, and falls back to it on failure', async () => {
    const server = manualServer()
    const wrapper = mount(FavoriteButton, {
      props: { value: { favorited: false, count: 2 }, commit: server.commit },
    })
    wrappers.push(wrapper)

    await wrapper.get('button').trigger('click')
    await wrapper.setProps({ value: { favorited: false, count: 5 }, commit: server.commit })
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')

    server.calls[0].reply.reject(new Error('offline'))
    await settle()
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('button').text()).toBe('5')
    expect(wrapper.get('button').attributes('data-error')).toBe('Error: offline')
  })

  it('saves with the newest commit the component rendered', async () => {
    const first = vi.fn(async (next: Favorite) => next)
    const second = vi.fn(async (next: Favorite) => next)
    const value = { favorited: false, count: 0 }
    const wrapper = mount(FavoriteButton, { props: { value, commit: first } })
    wrappers.push(wrapper)
    await wrapper.setProps({ value, commit: second })

    await wrapper.get('button').trigger('click')
    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([{ favorited: true, count: 1 }, value])
  })

  it('counts every press of a quantity stepper and saves the newest total', async () => {
    const saves: Array<Deferred<void>> = []
    const commit = vi.fn((_next: number) => {
      const reply = deferred<void>()
      saves.push(reply)
      return reply.promise
    })
    const result = useInScope(() => useOptimisticValue({ value: 1, commit }))

    result.update((n) => n + 1)
    result.update((n) => n + 1)
    result.update((n) => n + 1)
    expect(result.value.value).toBe(4)
    saves[0].resolve()
    await settle()
    expect(commit.mock.calls.map((call) => call[0])).toEqual([2, 4])
    saves[1].resolve()
    await settle()
    expect(result.value.value).toBe(4)
    expect(result.pending.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('uses the committed callback when a layout effect makes a change', async () => {
    const first = vi.fn(async (next: number) => next)
    const second = vi.fn(async (next: number) => next)
    let value!: UseOptimisticValueResult<number>
    const Page = defineComponent({
      props: {
        commit: {
          type: Function as PropType<(next: number) => Promise<number>>,
          required: true,
        },
      },
      setup(props) {
        value = useOptimisticValue<number>(() => ({ value: 1, commit: props.commit }))
        const done = ref(false)
        onUpdated(() => {
          if (props.commit === second && !done.value) {
            done.value = true
            value.set(2)
          }
        })
        return () => h('div')
      },
    })

    const wrapper = mount(Page, { props: { commit: first } })
    wrappers.push(wrapper)
    await wrapper.setProps({ commit: second })
    await settle()
    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([2, 1])
    expect(value.value.value).toBe(2)
    expect(value.pending.value).toBe(false)
    expect(value.error.value).toBeNull()
  })

  it('uses the committed callback in a descendant layout effect', async () => {
    const first = vi.fn(async (next: number) => next)
    const second = vi.fn(async (next: number) => next)
    const Child = defineComponent({
      props: {
        set: { type: Function as PropType<(next: number) => void>, required: true },
        active: { type: Boolean, required: true },
      },
      setup(props) {
        const done = ref(false)
        onUpdated(() => {
          if (props.active && !done.value) {
            done.value = true
            props.set(2)
          }
        })
        return () => null
      },
    })
    const Parent = defineComponent({
      props: {
        commit: {
          type: Function as PropType<(next: number) => Promise<number>>,
          required: true,
        },
        active: { type: Boolean, required: true },
      },
      setup(props) {
        const value = useOptimisticValue<number>(() => ({ value: 1, commit: props.commit }))
        return () => h(Child, { set: value.set, active: props.active })
      },
    })

    const wrapper = mount(Parent, { props: { commit: first, active: false } })
    wrappers.push(wrapper)
    await wrapper.setProps({ commit: second, active: true })
    await settle()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([2, 1])
  })

  it('does not duplicate saves or replace saved props in StrictMode with an inline comparator', async () => {
    const commit = vi.fn(async (next: Favorite) => next)
    let value!: UseOptimisticValueResult<Favorite>
    let rerender!: () => Promise<void>
    const Page = defineComponent({
      setup() {
        const tick = ref(0)
        rerender = async () => {
          tick.value += 1
          await nextTick()
        }
        value = useOptimisticValue<Favorite>(() => {
          // The inline comparator is rebuilt on every render, like React's
          // inline `equals` prop.
          void tick.value
          return {
            value: { favorited: false, count: 2 },
            equals: (a: Favorite, b: Favorite) =>
              a.favorited === b.favorited && a.count === b.count,
            commit,
          }
        })
        return () => h('div', String(tick.value))
      },
    })
    const wrapper = mount(Page)
    wrappers.push(wrapper)

    expect(commit).not.toHaveBeenCalled()
    value.update((current) => ({
      favorited: !current.favorited,
      count: current.count + 1,
    }))
    await settle()
    await rerender()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(value.value.value).toEqual({ favorited: true, count: 3 })
    expect(value.pending.value).toBe(false)
    expect(value.error.value).toBeNull()
  })

  it('does not show a superseded save error when the next tap matches the server', async () => {
    const reply = deferred<boolean>()
    const onError = vi.fn<(error: unknown, value: boolean) => void>()
    const commit = vi.fn(() => reply.promise)
    const result = useInScope(() => useOptimisticValue({ value: false, commit, onError }))

    result.update((on) => !on)
    result.update((on) => !on)
    reply.reject(new Error('old request failed'))
    await settle()
    expect(result.value.value).toBe(false)
    expect(result.pending.value).toBe(false)
    expect(result.error.value).toBeNull()
    expect(onError).not.toHaveBeenCalled()
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('keeps confirmed progress when a later request in the same commit fails', async () => {
    const reply = deferred<void>()
    const failure = new Error('second request failed')
    type Flags = { first: boolean; second: boolean }
    const result = useInScope(() =>
      useOptimisticValue<Flags>({
        value: { first: false, second: false },
        commit: async (_next, _previous, confirm?: (change: (current: Flags) => Flags) => void) => {
          confirm?.((current) => ({ ...current, first: true }))
          await reply.promise
        },
      }),
    )
    result.set({ first: true, second: true })
    reply.reject(failure)
    await settle()
    expect(result.value.value).toEqual({ first: true, second: false })
    expect(result.pending.value).toBe(false)
    expect(result.error.value).toBe(failure)
  })
})
