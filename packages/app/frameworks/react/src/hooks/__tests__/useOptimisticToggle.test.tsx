// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { createElement, useState } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import * as bindings from '../../index.js'

interface Reply {
  promise: Promise<boolean>
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}

function deferred(): Reply {
  let resolve!: Reply['resolve']
  let reject!: Reply['reject']
  const promise = new Promise<boolean>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function manualServer() {
  const requests: Array<{ desired: boolean; reply: Reply }> = []
  const commit = vi.fn((desired: boolean) => {
    const reply = deferred()
    requests.push({ desired, reply })
    return reply.promise
  })
  return { requests, commit }
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
    function Star() {
      const star = bindings.useOptimisticToggle({ value: false, commit: server.commit })
      return createElement(
        'button',
        { type: 'button', 'aria-pressed': star.value, onClick: star.toggle },
        createElement('span', { 'data-icon': 'star' }),
        star.value ? 'Unstar repository' : 'Star repository',
      )
    }
    render(createElement(Star))
    const control = screen.getByRole('button')
    fireEvent.click(control)
    expect(control.textContent).toBe('Unstar repository')
    expect(control.querySelector('[data-icon="star"]')).not.toBeNull()
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    expect(server.commit).toHaveBeenCalledExactlyOnceWith(true)
    await act(async () => server.requests[0].reply.resolve(true))
    fireEvent.click(control)
    expect(control.textContent).toBe('Star repository')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    await act(async () => server.requests[1].reply.resolve(false))
  })

  it('queues a second click even when both use the same action before a render', async () => {
    const server = manualServer()
    const { result } = renderHook(() =>
      bindings.useOptimisticToggle({ value: false, commit: server.commit }),
    )
    const toggle = result.current.toggle
    act(() => {
      toggle()
      toggle()
    })
    expect(result.current).toMatchObject({ value: false, pending: true })
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    await act(async () => server.requests[0].reply.resolve(true))
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    expect(result.current.value).toBe(false)
    await act(async () => server.requests[1].reply.resolve(false))
    expect(result.current).toMatchObject({ value: false, pending: false, error: null })
  })

  it('accepts a second native click while the first save is pending', async () => {
    const server = manualServer()
    function Subscription() {
      const subscription = bindings.useOptimisticToggle({ value: false, commit: server.commit })
      return createElement(
        'button',
        { onClick: subscription.toggle, 'aria-busy': subscription.pending },
        subscription.value ? 'Unsubscribe' : 'Subscribe',
      )
    }
    render(createElement(Subscription))
    const control = screen.getByRole('button')
    fireEvent.click(control)
    expect(control.textContent).toBe('Unsubscribe')
    expect(control.hasAttribute('disabled')).toBe(false)
    fireEvent.click(control)
    expect(control.textContent).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true])
    await act(async () => server.requests[0].reply.resolve(true))
    expect(control.textContent).toBe('Subscribe')
    expect(server.requests.map((request) => request.desired)).toEqual([true, false])
    await act(async () => server.requests[1].reply.resolve(false))
    expect(control.getAttribute('aria-busy')).toBe('false')
  })

  it('settles on the server answer when the server declines the desired change', async () => {
    const server = manualServer()
    const { result } = renderHook(() =>
      bindings.useOptimisticToggle({ value: false, commit: server.commit }),
    )
    act(() => result.current.toggle())
    expect(result.current.value).toBe(true)
    await act(async () => server.requests[0].reply.resolve(false))
    expect(result.current).toMatchObject({ value: false, pending: false, error: null })
    expect(server.requests).toHaveLength(1)
  })

  it('rolls back the newest failure to the confirmed value and reports the error', async () => {
    const server = manualServer()
    const onError = vi.fn()
    const { result } = renderHook(() =>
      bindings.useOptimisticToggle({ value: false, commit: server.commit, onError }),
    )
    act(() => result.current.toggle())
    await act(async () => server.requests[0].reply.resolve(true))
    act(() => result.current.toggle())
    const error = new Error('offline')
    await act(async () => server.requests[1].reply.reject(error))
    expect(result.current).toMatchObject({ value: true, pending: false, error })
    expect(onError).toHaveBeenCalledExactlyOnceWith(error, true)
  })

  it('keeps pending intent through refetches and uses the latest committed save adapter', async () => {
    const first = manualServer()
    const next = manualServer()
    const { result, rerender } = renderHook(
      ({ value, commit }) => bindings.useOptimisticToggle({ value, commit }),
      { initialProps: { value: false, commit: first.commit } },
    )
    const action = result.current.toggle
    rerender({ value: true, commit: next.commit })
    expect(result.current.value).toBe(true)
    expect(result.current.toggle).toBe(action)
    act(() => action())
    expect(first.requests).toHaveLength(0)
    expect(next.requests.map((request) => request.desired)).toEqual([false])
    rerender({ value: false, commit: next.commit })
    rerender({ value: true, commit: next.commit })
    expect(result.current.value).toBe(false)
    await act(async () => next.requests[0].reply.resolve(false))
    expect(result.current).toMatchObject({ value: false, pending: false })
  })

  it('leaves a local UI switch as plain state with no server commit', () => {
    function LocalSwitch() {
      const [open, setOpen] = useState(false)
      return createElement('button', { onClick: () => setOpen((value) => !value) }, String(open))
    }
    render(createElement(LocalSwitch))
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button').textContent).toBe('true')
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button').textContent).toBe('false')
  })
})
