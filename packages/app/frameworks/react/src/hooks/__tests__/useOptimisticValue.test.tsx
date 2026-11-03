// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { createElement, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useOptimisticValue } from '../useOptimisticValue.js'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

const deferred = <T,>(): Deferred<T> => {
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
const manualServer = () => {
  const calls: Array<{ next: Favorite; reply: Deferred<Favorite> }> = []
  const commit = vi.fn((next: Favorite) => {
    const reply = deferred<Favorite>()
    calls.push({ next, reply })
    return reply.promise
  })
  return { calls, commit }
}

const FavoriteButton = (props: {
  value: Favorite
  commit: (next: Favorite) => Promise<Favorite>
}): ReactElement => {
  const favorite = useOptimisticValue({
    value: props.value,
    equals: (a, b) => a.favorited === b.favorited && a.count === b.count,
    commit: props.commit,
  })
  return createElement(
    'button',
    {
      'aria-pressed': favorite.value.favorited,
      'data-pending': String(favorite.pending),
      'data-error': favorite.error ? String(favorite.error) : '',
      onClick: () =>
        favorite.update((current) => ({
          favorited: !current.favorited,
          count: current.count + (current.favorited ? -1 : 1),
        })),
    },
    String(favorite.value.count),
  )
}

const button = (): HTMLElement => screen.getByRole('button')

describe('useOptimisticValue', () => {
  it('saves a second tap made while the first save is still running', async () => {
    const server = manualServer()
    render(
      createElement(FavoriteButton, {
        value: { favorited: false, count: 2 },
        commit: server.commit,
      }),
    )

    fireEvent.click(button())
    expect(button().getAttribute('aria-pressed')).toBe('true')
    expect(button().textContent).toBe('3')
    fireEvent.click(button())
    expect(button().getAttribute('aria-pressed')).toBe('false')
    expect(button().textContent).toBe('2')
    expect(server.calls).toHaveLength(1)

    await act(async () => server.calls[0].reply.resolve({ favorited: true, count: 3 }))
    expect(server.calls.map((call) => call.next.favorited)).toEqual([true, false])
    expect(button().getAttribute('aria-pressed')).toBe('false')

    await act(async () => server.calls[1].reply.resolve({ favorited: false, count: 2 }))
    expect(button().getAttribute('data-pending')).toBe('false')
    expect(button().textContent).toBe('2')
  })

  it('keeps the saved value when the parent re-renders with the props it loaded first', async () => {
    const server = manualServer()
    const loaded = { favorited: false, count: 2 }
    const view = render(createElement(FavoriteButton, { value: loaded, commit: server.commit }))

    fireEvent.click(button())
    await act(async () => server.calls[0].reply.resolve({ favorited: true, count: 3 }))
    view.rerender(
      createElement(FavoriteButton, {
        value: { favorited: false, count: 2 },
        commit: server.commit,
      }),
    )
    expect(button().getAttribute('aria-pressed')).toBe('true')
    expect(button().textContent).toBe('3')
  })

  it('shows a refetched value when nothing is being saved', () => {
    const server = manualServer()
    const view = render(
      createElement(FavoriteButton, {
        value: { favorited: false, count: 2 },
        commit: server.commit,
      }),
    )
    view.rerender(
      createElement(FavoriteButton, {
        value: { favorited: true, count: 9 },
        commit: server.commit,
      }),
    )
    expect(button().getAttribute('aria-pressed')).toBe('true')
    expect(button().textContent).toBe('9')
    expect(server.commit).not.toHaveBeenCalled()
  })

  it('keeps the tap during a save when a refetch arrives, and falls back to it on failure', async () => {
    const server = manualServer()
    const view = render(
      createElement(FavoriteButton, {
        value: { favorited: false, count: 2 },
        commit: server.commit,
      }),
    )

    fireEvent.click(button())
    view.rerender(
      createElement(FavoriteButton, {
        value: { favorited: false, count: 5 },
        commit: server.commit,
      }),
    )
    expect(button().getAttribute('aria-pressed')).toBe('true')

    await act(async () => server.calls[0].reply.reject(new Error('offline')))
    expect(button().getAttribute('aria-pressed')).toBe('false')
    expect(button().textContent).toBe('5')
    expect(button().getAttribute('data-error')).toBe('Error: offline')
  })

  it('saves with the newest commit the component rendered', async () => {
    const first = vi.fn(async (next: Favorite) => next)
    const second = vi.fn(async (next: Favorite) => next)
    const value = { favorited: false, count: 0 }
    const view = render(createElement(FavoriteButton, { value, commit: first }))
    view.rerender(createElement(FavoriteButton, { value, commit: second }))

    await act(async () => {
      fireEvent.click(button())
    })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith({ favorited: true, count: 1 }, value)
  })

  it('counts every press of a quantity stepper and saves the newest total', async () => {
    const saves: Array<Deferred<void>> = []
    const commit = vi.fn((_next: number) => {
      const reply = deferred<void>()
      saves.push(reply)
      return reply.promise
    })
    const { result } = renderHook(() => useOptimisticValue({ value: 1, commit }))

    act(() => {
      result.current.update((n) => n + 1)
      result.current.update((n) => n + 1)
      result.current.update((n) => n + 1)
    })
    expect(result.current.value).toBe(4)
    await act(async () => saves[0].resolve())
    expect(commit.mock.calls.map((call) => call[0])).toEqual([2, 4])
    await act(async () => saves[1].resolve())
    expect(result.current).toMatchObject({ value: 4, pending: false, error: null })
  })
})
