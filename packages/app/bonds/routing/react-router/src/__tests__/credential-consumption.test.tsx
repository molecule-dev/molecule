// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import React, { StrictMode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { useConsumedSearchParam } from '../hooks.js'
import { BrowserRouter } from '../routers.js'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StrictMode>
    <BrowserRouter>{children}</BrowserRouter>
  </StrictMode>
)

const mount = () =>
  renderHook(
    () => ({
      consumed: useConsumedSearchParam('token'),
      search: useLocation().search,
      navigate: useNavigate(),
    }),
    { wrapper },
  ).result

const begin = (path = '/reset-password?token=first-link-secret&safe=byte%20value#section') => {
  window.history.replaceState({ safe: 'state' }, '', path)
}

afterEach(() => {
  cleanup()
})

describe('useConsumedSearchParam', () => {
  it('retains the credential in state while router and window agree after cleanup', () => {
    begin()
    const result = mount()

    expect(result.current.consumed[0]).toBe('first-link-secret')
    expect(window.location.search).not.toContain('first-link-secret')
    expect(result.current.search).toBe(window.location.search)
    expect(window.location.search).toContain('safe=byte+value')
    expect(window.location.hash).toBe('#section')
    expect(window.history.state.safe).toBe('state')
  })

  it('keeps the consumed credential through query-only navigation', async () => {
    begin()
    const result = mount()

    await act(async () => {
      await result.current.navigate('?safe=2')
    })

    expect(result.current.consumed[0]).toBe('first-link-secret')
    expect(result.current.search).toBe('?safe=2')
    expect(window.location.search).toBe('?safe=2')
  })

  it('retains a manual token edit until a new link arrives', async () => {
    begin()
    const result = mount()

    act(() => result.current.consumed[1]('pasted-token'))
    await act(async () => {
      await result.current.navigate('?safe=2')
    })
    expect(result.current.consumed[0]).toBe('pasted-token')

    await act(async () => {
      await result.current.navigate('/reset-password?token=second-link-secret&safe=2')
    })
    expect(result.current.consumed[0]).toBe('second-link-secret')
  })

  it('consumes and cleans a second credential on the same mounted route', async () => {
    begin()
    const result = mount()

    await act(async () => {
      await result.current.navigate('/reset-password?token=second-link-secret&safe=2')
    })

    expect(result.current.consumed[0]).toBe('second-link-secret')
    expect(window.location.search).not.toContain('second-link-secret')
    expect(result.current.search).toBe(window.location.search)
  })

  it('leaves an ordinary route without the credential parameter unchanged', () => {
    begin('/search?safe=1#results')
    const result = mount()

    expect(result.current.consumed[0]).toBe('')
    expect(result.current.search).toBe('?safe=1')
    expect(window.location.search).toBe('?safe=1')
    expect(window.location.hash).toBe('#results')
    expect(window.history.state.safe).toBe('state')
  })
})
