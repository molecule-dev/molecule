// @vitest-environment jsdom
/**
 * React's `useOptimisticToggle` cases against the Svelte hook: the same server
 * answers, the same calls, the same expected values. A Svelte hook runs once
 * during component init, so where React rerenders with new props this file sets
 * the options store the hook follows on the same mount.
 *
 * @module
 */

import { flushSync, mount, tick, unmount } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../../context.js'
import * as bindings from '../../index.js'
import {
  useOptimisticToggle,
  type UseOptimisticToggleOptions,
  type UseOptimisticToggleResult,
} from '../useOptimisticToggle.js'
import LocalSwitch from './LocalSwitch.svelte'
import OptimisticToggleProbe from './OptimisticToggleProbe.svelte'

/** A server answer the test settles by hand. */
interface Reply {
  promise: Promise<boolean>
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}

/**
 * A promise the test settles by hand.
 *
 * @returns The promise and its settle functions.
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
 * A save adapter whose answers the test chooses, recording each desired value.
 *
 * @returns The recorded requests and the adapter.
 */
function manualServer(): {
  requests: Array<{ desired: boolean; reply: Reply }>
  commit: ReturnType<typeof vi.fn<(desired: boolean) => Promise<boolean>>>
} {
  const requests: Array<{ desired: boolean; reply: Reply }> = []
  const commit = vi.fn<(desired: boolean) => Promise<boolean>>((desired) => {
    const reply = deferred()
    requests.push({ desired, reply })
    return reply.promise
  })
  return { requests, commit }
}

/** Lets a settled save's promise chain and Svelte's pending effects run. */
const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  flushSync()
}

/** Finds the control, failing the test when it is absent. */
function requiredButton(container: ParentNode): HTMLButtonElement {
  const button = container.querySelector('button')
  if (!button) throw new Error('no button rendered')
  return button
}

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts a host that calls `useOptimisticToggle` once during a child's init.
 *
 * @param options - The options (or a store of them) the hook is created with.
 * @returns The hook's result.
 */
function mountHook(
  options: UseOptimisticToggleOptions | Readable<UseOptimisticToggleOptions>,
): UseOptimisticToggleResult {
  const captured: { result?: UseOptimisticToggleResult } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = useOptimisticToggle(options)
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  hosts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return result
}

/** A mounted control component: its container and its unmount. */
interface ProbeHandle {
  /** The component's container. */
  container: HTMLDivElement
  /** Unmounts the component once. */
  stop: () => Promise<void>
}

/**
 * Mounts the application-owned control component.
 *
 * @param options - The options (or a store of them) the component passes to the hook.
 * @param activeLabel - The label shown while the value is true.
 * @param idleLabel - The label shown while the value is false.
 * @returns The container and the unmount.
 */
function mountProbe(
  options: UseOptimisticToggleOptions | Readable<UseOptimisticToggleOptions>,
  activeLabel: string,
  idleLabel: string,
): ProbeHandle {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(OptimisticToggleProbe, {
    target: container,
    props: { options, activeLabel, idleLabel },
  })
  flushSync()
  let stopped = false
  const stop = async (): Promise<void> => {
    if (stopped) return
    stopped = true
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { container, stop }
}

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
    const probe = mountProbe(
      { value: false, commit: server.commit },
      'Unstar repository',
      'Star repository',
    )
    const control = requiredButton(probe.container)
    control.click()
    await tick()
    expect(control.textContent?.trim()).toBe('Unstar repository')
    expect(control.querySelector('[data-icon="star"]')).not.toBeNull()
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    expect(server.commit).toHaveBeenCalledExactlyOnceWith(true)
    server.requests[0].reply.resolve(true)
    await settle()
    control.click()
    await tick()
    expect(control.textContent?.trim()).toBe('Star repository')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    server.requests[1].reply.resolve(false)
    await settle()
  })

  it('queues a second click even when both use the same action before a render', async () => {
    const server = manualServer()
    const result = mountHook({ value: false, commit: server.commit })
    const toggle = result.toggle
    toggle()
    toggle()
    expect(get(result.value)).toBe(false)
    expect(get(result.pending)).toBe(true)
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    server.requests[0].reply.resolve(true)
    await settle()
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    expect(get(result.value)).toBe(false)
    server.requests[1].reply.resolve(false)
    await settle()
    expect(get(result.value)).toBe(false)
    expect(get(result.pending)).toBe(false)
    expect(get(result.error)).toBeNull()
  })

  it('accepts a second native click while the first save is pending', async () => {
    const server = manualServer()
    const probe = mountProbe({ value: false, commit: server.commit }, 'Unsubscribe', 'Subscribe')
    const control = requiredButton(probe.container)
    control.click()
    await tick()
    expect(control.textContent?.trim()).toBe('Unsubscribe')
    expect(control.hasAttribute('disabled')).toBe(false)
    control.click()
    await tick()
    expect(control.textContent?.trim()).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    server.requests[0].reply.resolve(true)
    await settle()
    expect(control.textContent?.trim()).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    server.requests[1].reply.resolve(false)
    await settle()
    expect(control.getAttribute('aria-busy')).toBe('false')
  })

  it('settles on the server answer when the server declines the desired change', async () => {
    const server = manualServer()
    const result = mountHook({ value: false, commit: server.commit })
    result.toggle()
    expect(get(result.value)).toBe(true)
    server.requests[0].reply.resolve(false)
    await settle()
    expect(get(result.value)).toBe(false)
    expect(get(result.pending)).toBe(false)
    expect(get(result.error)).toBeNull()
    expect(server.requests).toHaveLength(1)
  })

  it('rolls back the newest failure to the confirmed value and reports the error', async () => {
    const server = manualServer()
    const onError = vi.fn<(error: unknown, value: boolean) => void>()
    const result = mountHook({ value: false, commit: server.commit, onError })
    result.toggle()
    server.requests[0].reply.resolve(true)
    await settle()
    result.toggle()
    const error = new Error('offline')
    server.requests[1].reply.reject(error)
    await settle()
    expect(get(result.value)).toBe(true)
    expect(get(result.pending)).toBe(false)
    expect(get(result.error)).toBe(error)
    expect(onError).toHaveBeenCalledExactlyOnceWith(error, true)
  })

  it('keeps pending intent through refetches and uses the latest committed save adapter', async () => {
    const first = manualServer()
    const next = manualServer()
    const options = writable<UseOptimisticToggleOptions>({ value: false, commit: first.commit })
    const result = mountHook(options)
    const action = result.toggle
    options.set({ value: true, commit: next.commit })
    expect(get(result.value)).toBe(true)
    expect(result.toggle).toBe(action)
    action()
    expect(first.requests).toHaveLength(0)
    expect(next.requests.map((request) => request.desired)).toEqual([false])
    options.set({ value: false, commit: next.commit })
    options.set({ value: true, commit: next.commit })
    expect(get(result.value)).toBe(false)
    next.requests[0].reply.resolve(false)
    await settle()
    expect(get(result.value)).toBe(false)
    expect(get(result.pending)).toBe(false)
  })

  it('uses a late server boolean as the source for the next argument-free action', async () => {
    const commit = vi.fn<(desired: boolean) => Promise<boolean>>(async (desired) => desired)
    const options = writable<UseOptimisticToggleOptions>({ value: false, commit })
    const result = mountHook(options)
    // P415 l3172 mounted its control before the profile answered. A later true prop
    // must show the server value and choose DELETE/disable on the next click.
    options.set({ value: true, commit })
    expect(get(result.value)).toBe(true)
    result.toggle()
    expect(commit).toHaveBeenCalledExactlyOnceWith(false)
    await settle()
    expect(get(result.value)).toBe(false)
  })

  it('restores a saved subscription from a fresh asynchronous server snapshot after remount', async () => {
    let saved = false
    const methods: string[] = []
    const commit = async (desired: boolean): Promise<boolean> => {
      methods.push(desired ? 'PUT' : 'DELETE')
      saved = desired
      return saved
    }
    const firstOptions = writable<UseOptimisticToggleOptions>({ value: false, commit })
    const first = mountProbe(
      firstOptions,
      'Unsubscribe from stock alerts',
      'Subscribe to stock alerts',
    )
    const firstControl = requiredButton(first.container)
    firstControl.click()
    await settle()
    expect(saved).toBe(true)
    expect(firstControl.textContent?.trim()).toBe('Unsubscribe from stock alerts')
    await first.stop()

    const reloadedOptions = writable<UseOptimisticToggleOptions>({ value: false, commit })
    const reloaded = mountProbe(
      reloadedOptions,
      'Unsubscribe from stock alerts',
      'Subscribe to stock alerts',
    )
    reloadedOptions.set({ value: saved, commit })
    await tick()
    expect(requiredButton(reloaded.container).textContent?.trim()).toBe(
      'Unsubscribe from stock alerts',
    )
    requiredButton(reloaded.container).click()
    await settle()
    expect(saved).toBe(false)
    expect(methods).toEqual(['PUT', 'DELETE'])
  })

  it('leaves a local UI switch as plain state with no server commit', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const app = mount(LocalSwitch, { target: container })
    flushSync()
    hosts.push(async () => {
      await unmount(app)
      container.remove()
    })
    const control = requiredButton(container)
    control.click()
    await tick()
    expect(control.textContent).toBe('true')
    control.click()
    await tick()
    expect(control.textContent).toBe('false')
  })
})
