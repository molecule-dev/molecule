// @vitest-environment jsdom
/**
 * The optimistic toggle's observable contract, ported from
 * `@molecule/app-ui-react`'s `optimistic-toggle-button` test with the same
 * inputs, calls and expected values.
 *
 * Svelte translations: React's `rerender` of a mounted component is a write to
 * the store the host reads, React's `key` change (a remount) is the `{#key}`
 * block recreating the button, React's `createRef` has no Svelte counterpart —
 * the native `<button>` the caller gets is the observable, so the disabled case
 * asserts that element directly — and React's `act` around a settled promise is
 * `waitFor` / a scheduler tick.
 *
 * @module
 */
import { fireEvent, screen, waitFor } from '@testing-library/dom'
import {
  type Component,
  type ComponentProps,
  createRawSnippet,
  flushSync,
  mount,
  tick,
  unmount,
} from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ButtonProps } from '../types.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

const { default: Host } = await import('./OptimisticToggleHost.svelte')
const { default: Button } = await import('../components/Button.svelte')
const { default: OptimisticToggleButton } =
  await import('../components/OptimisticToggleButton.svelte')

/** A promise with its settle functions exposed, so a test controls the save. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

type HostProps = ComponentProps<typeof Host>
type ToggleProps = ComponentProps<typeof OptimisticToggleButton>

/** Mounts the host in a fresh container and lets its initial effects settle. */
async function renderHost(props: HostProps): Promise<void> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(Host, { target: host, props }))
  flushSync()
  await tick()
}

/**
 * Mounts the toggle button itself in a fresh container, returning a teardown
 * that also removes it from the afterEach lists so it is unmounted once.
 *
 * @param props - The toggle props.
 * @returns The teardown.
 */
function renderToggle(props: ToggleProps): { destroy: () => void } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const instance = mount(OptimisticToggleButton, { target: host, props })
  mounted.push(instance)
  flushSync()
  return {
    destroy: () => {
      const mountedAt = mounted.indexOf(instance)
      if (mountedAt !== -1) mounted.splice(mountedAt, 1)
      const hostAt = hosts.indexOf(host)
      if (hostAt !== -1) hosts.splice(hostAt, 1)
      unmount(instance)
      host.remove()
    },
  }
}

/** Flushes a store-driven update through render and pending effects. */
async function flush(): Promise<void> {
  flushSync()
  await tick()
}

describe('OptimisticToggleButton', () => {
  it.each([
    ['Favorite Article', 'Unfavorite Article'],
    ['Watch equipment', 'Stop watching equipment'],
  ])(
    'keeps the complete %s action label through persistence and remount',
    async (inactiveLabel, activeLabel) => {
      let persisted = false
      const commit = vi.fn(async (desired: boolean) => {
        persisted = desired
        return persisted
      })
      const props: ToggleProps = { value: persisted, commit, inactiveLabel, activeLabel }

      const view = renderToggle(props)
      fireEvent.click(screen.getByRole('button', { name: inactiveLabel }))
      await flush()
      expect(screen.getByRole('button', { name: activeLabel }).getAttribute('aria-pressed')).toBe(
        'true',
      )
      expect(commit).toHaveBeenCalledExactlyOnceWith(true)
      // React's `unmount` then a fresh `render`: the remount reads the value
      // the save persisted.
      view.destroy()

      const reloaded = renderToggle({ value: persisted, commit, inactiveLabel, activeLabel })
      fireEvent.click(screen.getByRole('button', { name: activeLabel }))
      await flush()
      expect(screen.getByRole('button', { name: inactiveLabel }).getAttribute('aria-pressed')).toBe(
        'false',
      )
      expect(commit.mock.calls).toEqual([[true], [false]])
      reloaded.destroy()
    },
  )

  it('flips Follow to Unfollow immediately through a save longer than the deployed wait', async () => {
    // Only the timer/date APIs are faked: Svelte schedules its effects on a
    // microtask, which must keep running for the mount and the flush below.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    const response = deferred<boolean>()
    const commit = vi.fn(() => response.promise)
    await renderHost({
      mode: 'value',
      value: writable(false),
      signedIn: writable(true),
      self: writable(false),
      recordKey: writable('a'),
      commit,
      activeLabel: 'Unfollow',
      inactiveLabel: 'Follow',
    })
    const button = screen.getByRole('button', { name: 'Follow' }) as HTMLButtonElement
    fireEvent.click(button)
    flushSync()
    expect(screen.getByRole('button', { name: 'Unfollow' })).toBe(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.disabled).toBe(false)
    await vi.advanceTimersByTimeAsync(6_000)
    expect(button.textContent?.trim()).toBe('Unfollow')
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    response.resolve(true)
    await vi.advanceTimersByTimeAsync(0)
    flushSync()
    fireEvent.click(button)
    flushSync()
    expect(button.textContent?.trim()).toBe('Follow')
  })

  it('saves a second tap in order while the first save is pending (non-X1 alerts)', async () => {
    const first = deferred<boolean>()
    const second = deferred<boolean>()
    const commit = vi
      .fn<(desired: boolean) => Promise<boolean>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    await renderHost({
      mode: 'value',
      value: writable(false),
      signedIn: writable(true),
      self: writable(false),
      recordKey: writable('a'),
      commit,
      activeLabel: 'Mute alerts',
      inactiveLabel: 'Enable alerts',
    })
    const button = screen.getByRole('button') as HTMLButtonElement
    fireEvent.click(button)
    flushSync()
    fireEvent.click(button)
    flushSync()
    expect(button.textContent?.trim()).toBe('Enable alerts')
    expect(commit.mock.calls).toEqual([[true]])
    first.resolve(true)
    await waitFor(() => expect(commit.mock.calls).toEqual([[true], [false]]))
    expect(button.textContent?.trim()).toBe('Enable alerts')
    second.resolve(false)
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'))
  })

  it('rolls back a rejected save and permits another try', async () => {
    const response = deferred<boolean>()
    const error = new Error('save rejected')
    const onError = vi.fn()
    const commit = vi.fn().mockReturnValueOnce(response.promise).mockResolvedValueOnce(true)
    await renderHost({
      mode: 'value',
      value: writable(false),
      signedIn: writable(true),
      self: writable(false),
      recordKey: writable('a'),
      commit,
      onError,
      activeLabel: 'Unstar',
      inactiveLabel: 'Star',
    })
    const button = screen.getByRole('button') as HTMLButtonElement
    fireEvent.click(button)
    flushSync()
    response.reject(error)
    await waitFor(() => expect(button.textContent?.trim()).toBe('Star'))
    expect(onError).toHaveBeenCalledWith(error)
    fireEvent.click(button)
    flushSync()
    expect(button.textContent?.trim()).toBe('Unstar')
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('keeps a pending choice during a same-record refetch and accepts a later server change', async () => {
    const response = deferred<boolean>()
    const value = writable(false)
    await renderHost({
      mode: 'value',
      value,
      signedIn: writable(true),
      self: writable(false),
      recordKey: writable('a'),
      commit: () => response.promise,
      activeLabel: 'Unfollow',
      inactiveLabel: 'Follow',
    })
    const button = screen.getByRole('button') as HTMLButtonElement
    fireEvent.click(button)
    flushSync()
    // A same-record refetch hands down the same value: the pending choice stays.
    value.set(false)
    await flush()
    expect(button.textContent?.trim()).toBe('Unfollow')
    response.resolve(true)
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'))
    value.set(true)
    await flush()
    value.set(false)
    await flush()
    expect(button.textContent?.trim()).toBe('Follow')
  })

  it('keeps a visitor action present, with explicit permission and self-record gates in the app', async () => {
    const commit = vi.fn(async (next: boolean) => next)
    const signedIn = writable(true)
    const self = writable(false)
    await renderHost({
      mode: 'gate',
      value: writable(false),
      signedIn,
      self,
      recordKey: writable('a'),
      commit,
      activeLabel: 'Unfollow',
      inactiveLabel: 'Follow',
    })
    expect(screen.getByRole('button', { name: 'Follow' })).toBeTruthy()
    self.set(true)
    await flush()
    expect(screen.queryByRole('button')).toBeNull()
    signedIn.set(false)
    self.set(false)
    await flush()
    expect(screen.queryByRole('button')).toBeNull()
    expect(commit).not.toHaveBeenCalled()
  })

  it('honors an explicit permission disable and forwards the native ref', async () => {
    const commit = vi.fn(async (next: boolean) => next)
    await renderHost({
      mode: 'disabled',
      value: writable(false),
      signedIn: writable(true),
      self: writable(false),
      recordKey: writable('a'),
      commit,
      activeLabel: 'Unstar',
      inactiveLabel: 'Star',
    })
    // The ref's subject in React — the native button — is the observable here:
    // a real click on the disabled control never reaches the handler.
    const button = screen.getByRole('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    button.click()
    flushSync()
    expect(commit).not.toHaveBeenCalled()
  })

  it('resets the display and pending work when the record key changes', async () => {
    const response = deferred<boolean>()
    const recordKey = writable('a')
    await renderHost({
      mode: 'record',
      value: writable(false),
      signedIn: writable(true),
      self: writable(false),
      recordKey,
      commit: () => response.promise,
      activeLabel: 'Unstar',
      inactiveLabel: 'Star',
    })
    fireEvent.click(screen.getByRole('button'))
    flushSync()
    // React's `key="a"` → `key="b"` unmounts the button and mounts a fresh one.
    recordKey.set('b')
    await flush()
    response.resolve(true)
    await flush()
    expect(screen.getByRole('button').textContent?.trim()).toBe('Star')
  })

  it('leaves a local UI button on its existing path', async () => {
    const click = vi.fn()
    const children = createRawSnippet(() => ({ render: () => '<span>Open menu</span>' }))
    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)
    mounted.push(
      mount(Button as Component<ButtonProps>, {
        target: host,
        props: { onClick: click, children },
      }),
    )
    flushSync()
    fireEvent.click(screen.getByRole('button'))
    expect(click).toHaveBeenCalledOnce()
  })
})
