// @vitest-environment jsdom
/**
 * The title of React's `credential-consumption-r9.test.tsx`, over this bond's real Solid
 * Router: React ran it under `StrictMode`; Solid has no StrictMode, so the same Back and
 * Forward sequence runs on a normal browser `<Router>` mount.
 */
import type { Navigator } from '@solidjs/router'
import { Route, Router, useLocation, useNavigate } from '@solidjs/router'
import { render } from 'solid-js/web'
import { afterEach, expect, it, vi } from 'vitest'

import { useConsumedSearchParam } from '../use-consumed-search-param.js'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

it('associates consumed values with their cleaned entries through Back and Forward', async () => {
  window.history.replaceState({}, '', '/reset-password?token=token-A&link=A')

  let consumed!: [string, (value: string) => void]
  let location!: ReturnType<typeof useLocation>
  let navigate!: Navigator

  function Probe() {
    consumed = useConsumedSearchParam('token')
    location = useLocation()
    navigate = useNavigate()
    return <div />
  }

  const container = document.createElement('div')
  document.body.append(container)
  const dispose = render(
    () => (
      <Router>
        <Route path="*" component={Probe} />
      </Router>
    ),
    container,
  )

  // Wait for the cleanup replace to reach the address too: the value is held before the
  // navigation commits, and pushing the next link before that would replace this entry.
  await vi.waitFor(() => {
    expect(consumed[0]).toBe('token-A')
    expect(window.location.search).toBe('?link=A')
  })

  navigate('/reset-password?token=token-B&link=B')
  await vi.waitFor(() => {
    expect(consumed[0]).toBe('token-B')
    expect(window.location.search).toBe('?link=B')
  })

  navigate(-1)
  await vi.waitFor(() => expect(location.search).toBe('?link=A'))
  expect(consumed[0]).toBe('token-A')

  navigate(1)
  await vi.waitFor(() => expect(location.search).toBe('?link=B'))
  expect(consumed[0]).toBe('token-B')

  dispose()
  container.remove()
})
