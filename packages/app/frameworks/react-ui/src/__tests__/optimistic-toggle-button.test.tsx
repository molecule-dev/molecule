// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import React, { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Button } from '../components/Button.js'
import { OptimisticToggleButton } from '../components/OptimisticToggleButton.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
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
  cleanup()
  vi.useRealTimers()
})

describe('OptimisticToggleButton', () => {
  it('flips Follow to Unfollow immediately through a save longer than the deployed wait', async () => {
    vi.useFakeTimers()
    const response = deferred<boolean>()
    const commit = vi.fn(() => response.promise)
    const view = render(
      <OptimisticToggleButton
        value={false}
        commit={commit}
        activeLabel="Unfollow"
        inactiveLabel="Follow"
      />,
    )
    const button = view.getByRole('button', { name: 'Follow' }) as HTMLButtonElement
    fireEvent.click(button)
    expect(view.getByRole('button', { name: 'Unfollow' })).toBe(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.disabled).toBe(false)
    await act(async () => vi.advanceTimersByTimeAsync(6_000))
    expect(button.textContent).toBe('Unfollow')
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    await act(async () => response.resolve(true))
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
    const view = render(
      <OptimisticToggleButton
        value={false}
        commit={commit}
        activeLabel="Mute alerts"
        inactiveLabel="Enable alerts"
      />,
    )
    const button = view.getByRole('button') as HTMLButtonElement
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button.textContent).toBe('Enable alerts')
    expect(commit.mock.calls).toEqual([[true]])
    await act(async () => first.resolve(true))
    expect(commit.mock.calls).toEqual([[true], [false]])
    expect(button.textContent).toBe('Enable alerts')
    await act(async () => second.resolve(false))
    expect(button.getAttribute('aria-busy')).toBe('false')
  })

  it('rolls back a rejected save and permits another try', async () => {
    const response = deferred<boolean>()
    const error = new Error('save rejected')
    const onError = vi.fn()
    const commit = vi.fn().mockReturnValueOnce(response.promise).mockResolvedValueOnce(true)
    const view = render(
      <OptimisticToggleButton
        value={false}
        commit={commit}
        onError={onError}
        activeLabel="Unstar"
        inactiveLabel="Star"
      />,
    )
    const button = view.getByRole('button')
    fireEvent.click(button)
    await act(async () => response.reject(error))
    expect(button.textContent).toBe('Star')
    expect(onError).toHaveBeenCalledWith(error)
    await act(async () => fireEvent.click(button))
    expect(button.textContent).toBe('Unstar')
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('keeps a pending choice during a same-record refetch and accepts a later server change', async () => {
    const response = deferred<boolean>()
    const props = {
      commit: () => response.promise,
      activeLabel: 'Unfollow',
      inactiveLabel: 'Follow',
    }
    const view = render(<OptimisticToggleButton key="record-a" value={false} {...props} />)
    const button = view.getByRole('button')
    fireEvent.click(button)
    view.rerender(<OptimisticToggleButton key="record-a" value={false} {...props} />)
    expect(button.textContent).toBe('Unfollow')
    await act(async () => response.resolve(true))
    view.rerender(<OptimisticToggleButton key="record-a" value={true} {...props} />)
    view.rerender(<OptimisticToggleButton key="record-a" value={false} {...props} />)
    expect(button.textContent).toBe('Follow')
  })

  it('keeps a visitor action present, with explicit permission and self-record gates in the app', () => {
    const commit = vi.fn(async (next: boolean) => next)
    function ProfileAction({ signedIn, self }: { signedIn: boolean; self: boolean }) {
      return signedIn && !self ? (
        <OptimisticToggleButton
          value={false}
          commit={commit}
          activeLabel="Unfollow"
          inactiveLabel="Follow"
        />
      ) : null
    }
    const view = render(<ProfileAction signedIn self={false} />)
    expect(view.getByRole('button', { name: 'Follow' })).toBeTruthy()
    view.rerender(<ProfileAction signedIn self />)
    expect(view.queryByRole('button')).toBeNull()
    view.rerender(<ProfileAction signedIn={false} self={false} />)
    expect(view.queryByRole('button')).toBeNull()
    expect(commit).not.toHaveBeenCalled()
  })

  it('honors an explicit permission disable and forwards the native ref', () => {
    const commit = vi.fn(async (next: boolean) => next)
    const ref = createRef<HTMLButtonElement>()
    const view = render(
      <OptimisticToggleButton
        ref={ref}
        disabled
        value={false}
        commit={commit}
        activeLabel="Unstar"
        inactiveLabel="Star"
      />,
    )
    fireEvent.click(view.getByRole('button'))
    expect(ref.current?.disabled).toBe(true)
    expect(commit).not.toHaveBeenCalled()
  })

  it('resets the display and pending work when the record key changes', async () => {
    const response = deferred<boolean>()
    const props = { commit: () => response.promise, activeLabel: 'Unstar', inactiveLabel: 'Star' }
    const view = render(<OptimisticToggleButton key="a" value={false} {...props} />)
    fireEvent.click(view.getByRole('button'))
    view.rerender(<OptimisticToggleButton key="b" value={false} {...props} />)
    await act(async () => response.resolve(true))
    expect(view.getByRole('button').textContent).toBe('Star')
  })

  it('leaves a local UI button on its existing path', () => {
    const click = vi.fn()
    const view = render(<Button onClick={click}>Open menu</Button>)
    fireEvent.click(view.getByRole('button'))
    expect(click).toHaveBeenCalledOnce()
  })
})
