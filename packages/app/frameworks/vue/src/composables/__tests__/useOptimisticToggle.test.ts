// @vitest-environment jsdom

/**
 * Vue counterpart of the React `useOptimisticToggle` tests: the same observable
 * contract — the value to render, the argument-free action, the save ordering
 * and the error report — with markup owned by the application.
 *
 * @module
 */

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { defineComponent, effectScope, h, nextTick, ref, shallowRef } from 'vue'

import * as bindings from '../../index.js'

interface Reply {
  promise: Promise<boolean>
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}

/**
 * A save whose answer the test gives.
 *
 * @returns The pending promise and its settle functions.
 */
function deferred(): Reply {
  let resolve!: Reply['resolve']
  let reject!: Reply['reject']
  const promise = new Promise<boolean>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/**
 * A server whose saves finish when the test says so.
 *
 * @returns The recorded requests and the commit adapter.
 */
function manualServer(): {
  requests: Array<{ desired: boolean; reply: Reply }>
  commit: (desired: boolean) => Promise<boolean>
} {
  const requests: Array<{ desired: boolean; reply: Reply }> = []
  const commit = vi.fn((desired: boolean) => {
    const reply = deferred()
    requests.push({ desired, reply })
    return reply.promise
  })
  return { requests, commit }
}

/** Lets every pending promise chain and queued render run. */
const settle = async (): Promise<void> => {
  await flushPromises()
  await nextTick()
}

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

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  for (const stop of scopes.splice(0)) stop()
})

describe('useOptimisticToggle', () => {
  it('exports the headless toggle from the public framework binding', () => {
    expect(bindings).toHaveProperty('useOptimisticToggle', expect.any(Function))
  })

  it('accepts no current-state argument and requires a server-confirmed boolean', () => {
    expectTypeOf<bindings.UseOptimisticToggleResult['toggle']>().parameters.toEqualTypeOf<[]>()
    expectTypeOf<bindings.UseOptimisticToggleOptions['commit']>().returns.toEqualTypeOf<
      Promise<boolean>
    >()
  })

  it('sends the desired state in both directions with application-owned markup', async () => {
    const server = manualServer()
    const Star = defineComponent({
      setup() {
        const star = bindings.useOptimisticToggle({ value: false, commit: server.commit })
        return () =>
          h('button', { type: 'button', 'aria-pressed': star.value.value, onClick: star.toggle }, [
            h('span', { 'data-icon': 'star' }),
            star.value.value ? 'Unstar repository' : 'Star repository',
          ])
      },
    })
    const wrapper = mount(Star)
    wrappers.push(wrapper)
    const control = wrapper.get('button')
    await control.trigger('click')
    expect(control.text()).toBe('Unstar repository')
    expect(control.find('[data-icon="star"]').exists()).toBe(true)
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    expect(server.commit).toHaveBeenCalledExactlyOnceWith(true)
    server.requests[0].reply.resolve(true)
    await settle()
    await control.trigger('click')
    expect(control.text()).toBe('Star repository')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    server.requests[1].reply.resolve(false)
    await settle()
  })

  it('queues a second click even when both use the same action before a render', async () => {
    const server = manualServer()
    const result = useInScope(() =>
      bindings.useOptimisticToggle({ value: false, commit: server.commit }),
    )
    const toggle = result.toggle
    toggle()
    toggle()
    expect(result.value.value).toBe(false)
    expect(result.pending.value).toBe(true)
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    server.requests[0].reply.resolve(true)
    await settle()
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    expect(result.value.value).toBe(false)
    server.requests[1].reply.resolve(false)
    await settle()
    expect(result.value.value).toBe(false)
    expect(result.pending.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('accepts a second native click while the first save is pending', async () => {
    const server = manualServer()
    const Subscription = defineComponent({
      setup() {
        const subscription = bindings.useOptimisticToggle({
          value: false,
          commit: server.commit,
        })
        return () =>
          h(
            'button',
            { onClick: subscription.toggle, 'aria-busy': subscription.pending.value },
            subscription.value.value ? 'Unsubscribe' : 'Subscribe',
          )
      },
    })
    const wrapper = mount(Subscription)
    wrappers.push(wrapper)
    const control = wrapper.get('button')
    await control.trigger('click')
    expect(control.text()).toBe('Unsubscribe')
    expect(control.attributes('disabled')).toBeUndefined()
    await control.trigger('click')
    expect(control.text()).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    server.requests[0].reply.resolve(true)
    await settle()
    expect(control.text()).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    server.requests[1].reply.resolve(false)
    await settle()
    expect(control.attributes('aria-busy')).toBe('false')
  })

  it('settles on the server answer when the server declines the desired change', async () => {
    const server = manualServer()
    const result = useInScope(() =>
      bindings.useOptimisticToggle({ value: false, commit: server.commit }),
    )
    result.toggle()
    expect(result.value.value).toBe(true)
    server.requests[0].reply.resolve(false)
    await settle()
    expect(result.value.value).toBe(false)
    expect(result.pending.value).toBe(false)
    expect(result.error.value).toBeNull()
    expect(server.requests).toHaveLength(1)
  })

  it('rolls back the newest failure to the confirmed value and reports the error', async () => {
    const server = manualServer()
    const onError = vi.fn<(error: unknown, value: boolean) => void>()
    const result = useInScope(() =>
      bindings.useOptimisticToggle({ value: false, commit: server.commit, onError }),
    )
    result.toggle()
    server.requests[0].reply.resolve(true)
    await settle()
    result.toggle()
    const error = new Error('offline')
    server.requests[1].reply.reject(error)
    await settle()
    expect(result.value.value).toBe(true)
    expect(result.pending.value).toBe(false)
    expect(result.error.value).toBe(error)
    expect(onError).toHaveBeenCalledExactlyOnceWith(error, true)
  })

  it('keeps pending intent through refetches and uses the latest committed save adapter', async () => {
    const first = manualServer()
    const next = manualServer()
    const value = ref(false)
    const commit = shallowRef(first.commit)
    const result = useInScope(() =>
      bindings.useOptimisticToggle(() => ({ value: value.value, commit: commit.value })),
    )
    const action = result.toggle
    value.value = true
    commit.value = next.commit
    await nextTick()
    expect(result.value.value).toBe(true)
    expect(result.toggle).toBe(action)
    action()
    expect(first.requests).toHaveLength(0)
    expect(next.requests.map((request) => request.desired)).toEqual([false])
    value.value = false
    await nextTick()
    value.value = true
    await nextTick()
    expect(result.value.value).toBe(false)
    next.requests[0].reply.resolve(false)
    await settle()
    expect(result.value.value).toBe(false)
    expect(result.pending.value).toBe(false)
  })

  it('uses a late server boolean as the source for the next argument-free action', async () => {
    const commit = vi.fn(async (desired: boolean) => desired)
    const enabled = ref(false)
    const result = useInScope(() =>
      bindings.useOptimisticToggle(() => ({ value: enabled.value, commit })),
    )
    // The control mounted before the profile answered. A later true value
    // must show the server value and choose DELETE/disable on the next click.
    enabled.value = true
    await nextTick()
    expect(result.value.value).toBe(true)
    result.toggle()
    expect(commit).toHaveBeenCalledExactlyOnceWith(false)
    await settle()
    expect(result.value.value).toBe(false)
  })

  it('restores a saved subscription from a fresh asynchronous server snapshot after remount', async () => {
    let saved = false
    const methods: string[] = []
    const commit = async (desired: boolean): Promise<boolean> => {
      methods.push(desired ? 'PUT' : 'DELETE')
      saved = desired
      return saved
    }
    const Subscription = defineComponent({
      props: {
        enabled: { type: Boolean, required: true },
      },
      setup(props) {
        const subscription = bindings.useOptimisticToggle(() => ({
          value: props.enabled,
          commit,
        }))
        return () =>
          h(
            'button',
            { onClick: subscription.toggle },
            subscription.value.value
              ? 'Unsubscribe from stock alerts'
              : 'Subscribe to stock alerts',
          )
      },
    })
    const first = mount(Subscription, { props: { enabled: false } })
    wrappers.push(first)
    await first.get('button').trigger('click')
    await settle()
    expect(saved).toBe(true)
    expect(first.get('button').text()).toBe('Unsubscribe from stock alerts')
    first.unmount()
    wrappers.splice(wrappers.indexOf(first), 1)
    const reloaded = mount(Subscription, { props: { enabled: false } })
    wrappers.push(reloaded)
    await reloaded.setProps({ enabled: saved })
    expect(reloaded.get('button').text()).toBe('Unsubscribe from stock alerts')
    await reloaded.get('button').trigger('click')
    await settle()
    expect(saved).toBe(false)
    expect(methods).toEqual(['PUT', 'DELETE'])
  })

  it('leaves a local UI switch as plain state with no server commit', async () => {
    const LocalSwitch = defineComponent({
      setup() {
        const open = ref(false)
        return () => h('button', { onClick: () => (open.value = !open.value) }, String(open.value))
      },
    })
    const wrapper = mount(LocalSwitch)
    wrappers.push(wrapper)
    const control = wrapper.get('button')
    await control.trigger('click')
    expect(control.text()).toBe('true')
    await control.trigger('click')
    expect(control.text()).toBe('false')
  })
})
