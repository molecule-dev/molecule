// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react'
import React, { StrictMode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { useConsumedSearchParam } from '../hooks.js'
import { BrowserRouter } from '../routers.js'

let token = ''
let routerSearch = ''
let navigate: ReturnType<typeof useNavigate>
let updateToken: (value: string) => void

function Consumer() {
  const [consumed, setConsumed] = useConsumedSearchParam('token')
  updateToken = setConsumed
  token = consumed
  routerSearch = useLocation().search
  navigate = useNavigate()
  return null
}

const mount = () =>
  render(
    <StrictMode>
      <BrowserRouter>
        <Consumer />
      </BrowserRouter>
    </StrictMode>,
  )

const begin = (path = '/reset-password?token=first-link-secret&safe=byte%20value#section') => {
  window.history.replaceState({ safe: 'state' }, '', path)
  token = ''
  routerSearch = ''
}

afterEach(() => {
  cleanup()
})

describe('useConsumedSearchParam', () => {
  it('retains the credential in state while router and window agree after cleanup', () => {
    begin()
    mount()

    expect(token).toBe('first-link-secret')
    expect(window.location.search).not.toContain('first-link-secret')
    expect(routerSearch).toBe(window.location.search)
    expect(window.location.search).toContain('safe=byte+value')
    expect(window.location.hash).toBe('#section')
    expect(window.history.state.safe).toBe('state')
  })

  it('keeps the consumed credential through query-only navigation', async () => {
    begin()
    mount()

    await act(async () => {
      await navigate('?safe=2')
    })

    expect(token).toBe('first-link-secret')
    expect(routerSearch).toBe('?safe=2')
    expect(window.location.search).toBe('?safe=2')
  })

  it('retains a manual token edit until a new link arrives', async () => {
    begin()
    mount()

    act(() => updateToken('pasted-token'))
    await act(async () => {
      await navigate('?safe=2')
    })
    expect(token).toBe('pasted-token')

    await act(async () => {
      await navigate('/reset-password?token=second-link-secret&safe=2')
    })
    expect(token).toBe('second-link-secret')
  })

  it('consumes and cleans a second credential on the same mounted route', async () => {
    begin()
    mount()

    await act(async () => {
      await navigate('/reset-password?token=second-link-secret&safe=2')
    })

    expect(token).toBe('second-link-secret')
    expect(window.location.search).not.toContain('second-link-secret')
    expect(routerSearch).toBe(window.location.search)
  })

  it('leaves an ordinary route without the credential parameter unchanged', () => {
    begin('/search?safe=1#results')
    mount()

    expect(token).toBe('')
    expect(routerSearch).toBe('?safe=1')
    expect(window.location.search).toBe('?safe=1')
    expect(window.location.hash).toBe('#results')
    expect(window.history.state.safe).toBe('state')
  })
})
