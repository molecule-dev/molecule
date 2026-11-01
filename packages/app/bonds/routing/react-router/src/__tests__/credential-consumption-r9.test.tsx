// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from '@testing-library/react'
import React, { StrictMode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { afterEach, expect, it } from 'vitest'

import { useConsumedSearchParam } from '../hooks.js'
import { BrowserRouter } from '../routers.js'

let token = ''
let search = ''
let navigate: ReturnType<typeof useNavigate>

function Consumer() {
  ;[token] = useConsumedSearchParam('token')
  search = useLocation().search
  navigate = useNavigate()
  return null
}

afterEach(() => cleanup())

it('associates consumed values with their cleaned entries through Back and Forward', async () => {
  window.history.replaceState({}, '', '/reset-password?token=token-A&link=A')
  render(
    <StrictMode>
      <BrowserRouter>
        <Consumer />
      </BrowserRouter>
    </StrictMode>,
  )
  expect(token).toBe('token-A')

  await act(async () => {
    await navigate('/reset-password?token=token-B&link=B')
  })
  expect(token).toBe('token-B')

  await act(async () => {
    await navigate(-1)
  })
  await waitFor(() => expect(search).toBe('?link=A'))
  expect(token).toBe('token-A')

  await act(async () => {
    await navigate(1)
  })
  await waitFor(() => expect(search).toBe('?link=B'))
  expect(token).toBe('token-B')
})
