// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useOptimisticToggle.test.tsx`: the
 * server-backed boolean toggle states for state, under the same titles.
 *
 * React's `renderHook` case becomes a mounted probe whose result is captured;
 * the React result object's plain fields are Solid accessors here, so a state
 * assertion reads them into one snapshot first. Every other input and
 * expectation is the same.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import * as bindings from '../index.js'

interface Reply {
  promise: Promise<boolean>
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}

/**
 * A save the test answers by hand.
 *
 * @returns The pending promise and its resolvers.
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
 * A save adapter that records each desired value and settles on demand.
 *
 * @returns The recorded requests and the `commit` mock.
 */
function manualServer() {
  const requests: Array<{ desired: boolean; reply: Reply }> = []
  const commit = vi.fn((desired: boolean) => {
    const reply = deferred()
    requests.push({ desired, reply })
    return reply.promise
  })
  return { requests, commit }
}

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container the tree rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
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
    function Star(): JSX.Element {
      const star = bindings.useOptimisticToggle({ value: false, commit: server.commit })
      return (
        <button type="button" aria-pressed={star.value()} onClick={star.toggle}>
          <span data-icon="star" />
          {star.value() ? 'Unstar repository' : 'Star repository'}
        </button>
      )
    }
    mount(() => <Star />)
    const control = document.querySelector<HTMLButtonElement>('button')
    if (!control) throw new Error('no button rendered')
    control.click()
    expect(control.textContent).toBe('Unstar repository')
    expect(control.querySelector('[data-icon="star"]')).not.toBeNull()
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    expect(server.commit).toHaveBeenCalledExactlyOnceWith(true)
    server.requests[0].reply.resolve(true)
    await settle()
    control.click()
    expect(control.textContent).toBe('Star repository')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    server.requests[1].reply.resolve(false)
    await settle()
  })

  it('queues a second click even when both use the same action before a render', async () => {
    const server = manualServer()
    let toggle!: () => void
    let readState!: () => { value: boolean; pending: boolean; error: unknown }
    function Probe(): null {
      const result = bindings.useOptimisticToggle({ value: false, commit: server.commit })
      toggle = result.toggle
      readState = () => ({
        value: result.value(),
        pending: result.pending(),
        error: result.error(),
      })
      return null
    }
    mount(() => <Probe />)
    toggle()
    toggle()
    expect(readState()).toMatchObject({ value: false, pending: true })
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    server.requests[0].reply.resolve(true)
    await settle()
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    expect(readState().value).toBe(false)
    server.requests[1].reply.resolve(false)
    await settle()
    expect(readState()).toMatchObject({ value: false, pending: false, error: null })
  })

  it('accepts a second native click while the first save is pending', async () => {
    const server = manualServer()
    function Subscription(): JSX.Element {
      const subscription = bindings.useOptimisticToggle({
        value: false,
        commit: server.commit,
      })
      return (
        <button onClick={subscription.toggle} aria-busy={subscription.pending()}>
          {subscription.value() ? 'Unsubscribe' : 'Subscribe'}
        </button>
      )
    }
    mount(() => <Subscription />)
    const control = document.querySelector<HTMLButtonElement>('button')
    if (!control) throw new Error('no button rendered')
    control.click()
    expect(control.textContent).toBe('Unsubscribe')
    expect(control.hasAttribute('disabled')).toBe(false)
    control.click()
    expect(control.textContent).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    server.requests[0].reply.resolve(true)
    await settle()
    expect(control.textContent).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    server.requests[1].reply.resolve(false)
    await settle()
    expect(control.getAttribute('aria-busy')).toBe('false')
  })

  it('settles on the server answer when the server declines the desired change', async () => {
    const server = manualServer()
    let toggle!: () => void
    let readState!: () => { value: boolean; pending: boolean; error: unknown }
    function Probe(): null {
      const result = bindings.useOptimisticToggle({ value: false, commit: server.commit })
      toggle = result.toggle
      readState = () => ({
        value: result.value(),
        pending: result.pending(),
        error: result.error(),
      })
      return null
    }
    mount(() => <Probe />)
    toggle()
    expect(readState().value).toBe(true)
    server.requests[0].reply.resolve(false)
    await settle()
    expect(readState()).toMatchObject({ value: false, pending: false, error: null })
    expect(server.requests).toHaveLength(1)
  })

  it('rolls back the newest failure to the confirmed value and reports the error', async () => {
    const server = manualServer()
    const onError = vi.fn()
    let toggle!: () => void
    let readState!: () => { value: boolean; pending: boolean; error: unknown }
    function Probe(): null {
      const result = bindings.useOptimisticToggle({
        value: false,
        commit: server.commit,
        onError,
      })
      toggle = result.toggle
      readState = () => ({
        value: result.value(),
        pending: result.pending(),
        error: result.error(),
      })
      return null
    }
    mount(() => <Probe />)
    toggle()
    server.requests[0].reply.resolve(true)
    await settle()
    toggle()
    const error = new Error('offline')
    server.requests[1].reply.reject(error)
    await settle()
    expect(readState()).toMatchObject({ value: true, pending: false, error })
    expect(onError).toHaveBeenCalledExactlyOnceWith(error, true)
  })

  it('keeps pending intent through refetches and uses the latest committed save adapter', async () => {
    const first = manualServer()
    const next = manualServer()
    const [value, setValue] = createSignal(false)
    const [commit, setCommit] = createSignal<(desired: boolean) => Promise<boolean>>(first.commit)
    let toggle!: () => void
    let readValue!: () => boolean
    let readState!: () => { value: boolean; pending: boolean }
    function Probe(): null {
      const result = bindings.useOptimisticToggle(() => ({ value: value(), commit: commit() }))
      toggle = result.toggle
      readValue = () => result.value()
      readState = () => ({ value: result.value(), pending: result.pending() })
      return null
    }
    mount(() => <Probe />)
    const action = toggle
    setValue(true)
    setCommit(() => next.commit)
    expect(readValue()).toBe(true)
    expect(toggle).toBe(action)
    action()
    expect(first.requests).toHaveLength(0)
    expect(next.requests.map((request) => request.desired)).toEqual([false])
    setValue(false)
    setValue(true)
    expect(readState().value).toBe(false)
    next.requests[0].reply.resolve(false)
    await settle()
    expect(readState()).toMatchObject({ value: false, pending: false })
  })

  it('uses a late server boolean as the source for the next argument-free action', async () => {
    const commit = vi.fn(async (desired: boolean) => desired)
    const [enabled, setEnabled] = createSignal(false)
    let toggle!: () => void
    let readValue!: () => boolean
    function Probe(): null {
      const result = bindings.useOptimisticToggle(() => ({ value: enabled(), commit }))
      toggle = result.toggle
      readValue = () => result.value()
      return null
    }
    mount(() => <Probe />)
    // P415 l3172 mounted its control before the profile answered. A later true prop
    // must show the server value and choose DELETE/disable on the next click.
    setEnabled(true)
    expect(readValue()).toBe(true)
    toggle()
    expect(commit).toHaveBeenCalledExactlyOnceWith(false)
    await settle()
    expect(readValue()).toBe(false)
  })

  it('restores a saved subscription from a fresh asynchronous server snapshot after remount', async () => {
    let saved = false
    const methods: string[] = []
    const commit = async (desired: boolean): Promise<boolean> => {
      methods.push(desired ? 'PUT' : 'DELETE')
      saved = desired
      return saved
    }
    const [enabled, setEnabled] = createSignal(false)
    function Subscription(): JSX.Element {
      const subscription = bindings.useOptimisticToggle(() => ({
        value: enabled(),
        commit,
      }))
      return (
        <button onClick={subscription.toggle}>
          {subscription.value() ? 'Unsubscribe from stock alerts' : 'Subscribe to stock alerts'}
        </button>
      )
    }
    const container = mount(() => <Subscription />)
    container.querySelector<HTMLButtonElement>('button')?.click()
    await settle()
    expect(saved).toBe(true)
    expect(container.querySelector('button')?.textContent).toBe('Unsubscribe from stock alerts')
    for (const dispose of disposers.splice(0)) dispose()
    const reloaded = mount(() => <Subscription />)
    setEnabled(saved)
    expect(reloaded.querySelector('button')?.textContent).toBe('Unsubscribe from stock alerts')
    reloaded.querySelector<HTMLButtonElement>('button')?.click()
    await settle()
    expect(saved).toBe(false)
    expect(methods).toEqual(['PUT', 'DELETE'])
  })

  it('leaves a local UI switch as plain state with no server commit', () => {
    function LocalSwitch(): JSX.Element {
      const [open, setOpen] = createSignal(false)
      return <button onClick={() => setOpen((value) => !value)}>{String(open())}</button>
    }
    mount(() => <LocalSwitch />)
    const control = document.querySelector<HTMLButtonElement>('button')
    if (!control) throw new Error('no button rendered')
    control.click()
    expect(control.textContent).toBe('true')
    control.click()
    expect(control.textContent).toBe('false')
  })
})
