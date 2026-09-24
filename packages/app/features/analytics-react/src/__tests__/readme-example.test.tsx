/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the PostHog browser SDK (the
 * network edge) is mocked; the analytics core, the PostHog bond and
 * react-router are real.
 *
 * @module
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

const { mockInit, mockCapture } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockCapture: vi.fn(),
}))

vi.mock('posthog-js', () => ({
  posthog: {
    init: mockInit,
    capture: mockCapture,
    identify: vi.fn(),
    group: vi.fn(),
    reset: vi.fn(),
    __loaded: false,
  },
}))

import { setProvider } from '@molecule/app-analytics'
import { createProvider } from '@molecule/app-analytics-posthog'

import { AnalyticsRouteListener } from '../index.js'

// Startup, once — as in the README example.
const posthogKey = 'phc_example_project_key'
setProvider(createProvider({ apiKey: posthogKey }))

/**
 * The README example's app, verbatim.
 *
 * @returns The routed app with the analytics listener mounted.
 */
function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AnalyticsRouteListener />
      <nav>
        <Link to="/pricing">Pricing</Link>
      </nav>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/pricing" element={<h1>Pricing</h1>} />
      </Routes>
    </BrowserRouter>
  )
}

describe('README @example', () => {
  it('sends a PostHog $pageview on mount and on every client-side navigation', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    expect(mockInit).toHaveBeenCalledWith(
      posthogKey,
      expect.objectContaining({ capture_pageview: false }),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<App />)
    })
    expect(container.querySelector('h1')?.textContent).toBe('Home')
    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenLastCalledWith(
      '$pageview',
      expect.objectContaining({ $pathname: '/', page_name: '/' }),
    )

    const link = container.querySelector('a[href="/pricing"]') as HTMLAnchorElement
    await act(async () => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    })
    expect(container.querySelector('h1')?.textContent).toBe('Pricing')
    expect(mockCapture).toHaveBeenCalledTimes(2)
    expect(mockCapture).toHaveBeenLastCalledWith(
      '$pageview',
      expect.objectContaining({
        $pathname: '/pricing',
        $current_url: 'http://localhost:3000/pricing',
      }),
    )

    await act(async () => root.unmount())
    container.remove()
  })
})
