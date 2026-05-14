import { createElement } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `page` + `useLocation` are hoisted so tests can inspect/vary them.
const { mockPage, mockUseLocation } = vi.hoisted(() => ({
  mockPage: vi.fn(),
  mockUseLocation: vi.fn(),
}))

vi.mock('@molecule/app-analytics', () => ({ page: mockPage }))
vi.mock('react-router-dom', () => ({ useLocation: mockUseLocation }))

const { AnalyticsRouteListener } = await import('../AnalyticsRouteListener.js')

afterEach(() => {
  vi.clearAllMocks()
})

describe('AnalyticsRouteListener', () => {
  it('renders nothing into the DOM', () => {
    mockUseLocation.mockReturnValue({ pathname: '/home', search: '' })
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(createElement(AnalyticsRouteListener))
    })
    expect(container.innerHTML).toBe('')
    act(() => root.unmount())
  })

  it('records a page view with the current pathname + search on mount', () => {
    mockUseLocation.mockReturnValue({ pathname: '/dashboard', search: '?tab=1' })
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(createElement(AnalyticsRouteListener))
    })
    expect(mockPage).toHaveBeenCalledTimes(1)
    expect(mockPage).toHaveBeenCalledWith(
      expect.objectContaining({ name: '/dashboard', path: '/dashboard?tab=1' }),
    )
    act(() => root.unmount())
  })

  it('records a fresh page view when the route changes', () => {
    mockUseLocation.mockReturnValue({ pathname: '/a', search: '' })
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(createElement(AnalyticsRouteListener))
    })
    expect(mockPage).toHaveBeenCalledTimes(1)

    mockUseLocation.mockReturnValue({ pathname: '/b', search: '' })
    act(() => {
      root.render(createElement(AnalyticsRouteListener))
    })
    expect(mockPage).toHaveBeenCalledTimes(2)
    expect(mockPage).toHaveBeenLastCalledWith(expect.objectContaining({ name: '/b', path: '/b' }))
    act(() => root.unmount())
  })

  it('does not re-record when the route is unchanged across renders', () => {
    mockUseLocation.mockReturnValue({ pathname: '/same', search: '' })
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(createElement(AnalyticsRouteListener))
    })
    act(() => {
      root.render(createElement(AnalyticsRouteListener))
    })
    expect(mockPage).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
  })
})
