// @vitest-environment jsdom
/**
 * The optimistic toggle's observable contract, mirroring
 * `@molecule/app-ui-react`'s `optimistic-toggle-button` test with the same
 * inputs, calls and expected values.
 *
 * Solid translations: React's `rerender` of a mounted component is a write to
 * a signal the props read; React's `key` change (a remount) is the keyed
 * `<For>` item being replaced; React's `createRef` is a callback `ref`; React's
 * `act` around a settled promise is `waitFor`.
 *
 * @module
 */
import { fireEvent, waitFor, within } from '@testing-library/dom'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Button } from '../components/Button.jsx'
import { OptimisticToggleButton } from '../components/OptimisticToggleButton.jsx'

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

const disposers: Array<() => void> = []

/** Mounts JSX into a fresh container and registers its disposer. */
function mount(jsx: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(jsx, container))
}

beforeEach(() => {
  setClassMap(
    new Proxy(
      {},
      {
        get: (_target, name) =>
          name === 'cn' ? (...parts: unknown[]) => parts.filter(Boolean).join(' ') : () => '',
      },
    ) as UIClassMap,
  )
})
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

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
      const props = { commit, inactiveLabel, activeLabel }

      const first = document.createElement('div')
      document.body.appendChild(first)
      const disposeFirst = render(
        () => <OptimisticToggleButton value={persisted} {...props} />,
        first,
      )
      fireEvent.click(within(first).getByRole('button', { name: inactiveLabel }))
      expect(
        within(first).getByRole('button', { name: activeLabel }).getAttribute('aria-pressed'),
      ).toBe('true')
      expect(commit).toHaveBeenCalledExactlyOnceWith(true)
      // React's `view.unmount()`: dispose the first tree, then mount afresh from
      // the persisted server value, as a reloaded page would.
      disposeFirst()
      first.remove()

      const reloaded = document.createElement('div')
      document.body.appendChild(reloaded)
      disposers.push(
        render(() => <OptimisticToggleButton value={persisted} {...props} />, reloaded),
      )
      fireEvent.click(within(reloaded).getByRole('button', { name: activeLabel }))
      expect(
        within(reloaded).getByRole('button', { name: inactiveLabel }).getAttribute('aria-pressed'),
      ).toBe('false')
      expect(commit.mock.calls).toEqual([[true], [false]])
    },
  )

  it('flips Follow to Unfollow immediately through a save longer than the deployed wait', async () => {
    vi.useFakeTimers()
    const response = deferred<boolean>()
    const commit = vi.fn(() => response.promise)
    mount(() => (
      <OptimisticToggleButton
        value={false}
        commit={commit}
        activeLabel="Unfollow"
        inactiveLabel="Follow"
      />
    ))
    const button = within(document.body).getByRole('button', {
      name: 'Follow',
    }) as HTMLButtonElement
    fireEvent.click(button)
    expect(within(document.body).getByRole('button', { name: 'Unfollow' })).toBe(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.disabled).toBe(false)
    await vi.advanceTimersByTimeAsync(6_000)
    expect(button.textContent).toBe('Unfollow')
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    response.resolve(true)
    await vi.advanceTimersByTimeAsync(0)
    fireEvent.click(button)
    expect(button.textContent).toBe('Follow')
  })

  it('saves a second tap in order while the first save is pending (non-X1 alerts)', async () => {
    const first = deferred<boolean>()
    const second = deferred<boolean>()
    const commit = vi
      .fn<(desired: boolean) => Promise<boolean>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    mount(() => (
      <OptimisticToggleButton
        value={false}
        commit={commit}
        activeLabel="Mute alerts"
        inactiveLabel="Enable alerts"
      />
    ))
    const button = within(document.body).getByRole('button') as HTMLButtonElement
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button.textContent).toBe('Enable alerts')
    expect(commit.mock.calls).toEqual([[true]])
    first.resolve(true)
    await waitFor(() => expect(commit.mock.calls).toEqual([[true], [false]]))
    expect(button.textContent).toBe('Enable alerts')
    second.resolve(false)
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'))
  })

  it('rolls back a rejected save and permits another try', async () => {
    const response = deferred<boolean>()
    const error = new Error('save rejected')
    const onError = vi.fn()
    const commit = vi.fn().mockReturnValueOnce(response.promise).mockResolvedValueOnce(true)
    mount(() => (
      <OptimisticToggleButton
        value={false}
        commit={commit}
        onError={onError}
        activeLabel="Unstar"
        inactiveLabel="Star"
      />
    ))
    const button = within(document.body).getByRole('button')
    fireEvent.click(button)
    response.reject(error)
    await waitFor(() => expect(button.textContent).toBe('Star'))
    expect(onError).toHaveBeenCalledWith(error)
    fireEvent.click(button)
    expect(button.textContent).toBe('Unstar')
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('keeps a pending choice during a same-record refetch and accepts a later server change', async () => {
    const response = deferred<boolean>()
    const [value, setValue] = createSignal(false)
    const props = {
      commit: () => response.promise,
      activeLabel: 'Unfollow',
      inactiveLabel: 'Follow',
    }
    mount(() => <OptimisticToggleButton value={value()} {...props} />)
    const button = within(document.body).getByRole('button')
    fireEvent.click(button)
    // A same-record refetch hands down the same value: the pending choice stays.
    setValue(false)
    expect(button.textContent).toBe('Unfollow')
    response.resolve(true)
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'))
    expect(button.textContent).toBe('Unfollow')
    setValue(true)
    setValue(false)
    expect(button.textContent).toBe('Follow')
  })

  it('keeps a visitor action present, with explicit permission and self-record gates in the app', () => {
    const commit = vi.fn(async (next: boolean) => next)
    const [signedIn, setSignedIn] = createSignal(true)
    const [self, setSelf] = createSignal(false)
    /** The app-owned gate: the shared toggle is the signed-in visitor's action only. */
    const ProfileAction = (): JSX.Element => (
      <Show when={signedIn() && !self()}>
        <OptimisticToggleButton
          value={false}
          commit={commit}
          activeLabel="Unfollow"
          inactiveLabel="Follow"
        />
      </Show>
    )
    mount(() => <ProfileAction />)
    expect(within(document.body).getByRole('button', { name: 'Follow' })).toBeTruthy()
    setSelf(true)
    expect(within(document.body).queryByRole('button')).toBeNull()
    setSignedIn(false)
    setSelf(false)
    expect(within(document.body).queryByRole('button')).toBeNull()
    expect(commit).not.toHaveBeenCalled()
  })

  it('honors an explicit permission disable and forwards the native ref', () => {
    const commit = vi.fn(async (next: boolean) => next)
    let element: HTMLButtonElement | undefined
    mount(() => (
      <OptimisticToggleButton
        ref={(node: unknown) => {
          element = node instanceof HTMLButtonElement ? node : undefined
        }}
        disabled
        value={false}
        commit={commit}
        activeLabel="Unstar"
        inactiveLabel="Star"
      />
    ))
    fireEvent.click(within(document.body).getByRole('button'))
    expect(element?.disabled).toBe(true)
    expect(commit).not.toHaveBeenCalled()
  })

  it('resets the display and pending work when the record key changes', async () => {
    const response = deferred<boolean>()
    const [record, setRecord] = createSignal('a')
    const props = { commit: () => response.promise, activeLabel: 'Unstar', inactiveLabel: 'Star' }
    // React's `key="a"` → `key="b"` unmounts and mounts the button; `<For>`
    // reconciles by item identity, so a new key disposes the old instance.
    mount(() => (
      <For each={[record()]}>{() => <OptimisticToggleButton value={false} {...props} />}</For>
    ))
    fireEvent.click(within(document.body).getByRole('button'))
    setRecord('b')
    response.resolve(true)
    await waitFor(() => expect(within(document.body).getByRole('button').textContent).toBe('Star'))
  })

  it('leaves a local UI button on its existing path', () => {
    const click = vi.fn()
    mount(() => <Button onClick={click}>Open menu</Button>)
    fireEvent.click(within(document.body).getByRole('button'))
    expect(click).toHaveBeenCalledOnce()
  })
})
