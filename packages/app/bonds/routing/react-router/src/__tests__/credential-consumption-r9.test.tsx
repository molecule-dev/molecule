// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import React, { StrictMode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { afterEach, expect, it } from 'vitest'

import { useConsumedSearchParam } from '../hooks.js'
import { BrowserRouter } from '../routers.js'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StrictMode>
    <BrowserRouter>{children}</BrowserRouter>
  </StrictMode>
)

afterEach(() => cleanup())

it('associates consumed values with their cleaned entries through Back and Forward', async () => {
  window.history.replaceState({}, '', '/reset-password?token=token-A&link=A')
  const { result } = renderHook(
    () => ({
      consumed: useConsumedSearchParam('token'),
      search: useLocation().search,
      navigate: useNavigate(),
    }),
    { wrapper },
  )
  expect(result.current.consumed[0]).toBe('token-A')

  await act(async () => {
    await result.current.navigate('/reset-password?token=token-B&link=B')
  })
  expect(result.current.consumed[0]).toBe('token-B')

  await act(async () => {
    await result.current.navigate(-1)
  })
  await waitFor(() => expect(result.current.search).toBe('?link=A'))
  expect(result.current.consumed[0]).toBe('token-A')

  await act(async () => {
    await result.current.navigate(1)
  })
  await waitFor(() => expect(result.current.search).toBe('?link=B'))
  expect(result.current.consumed[0]).toBe('token-B')
})
