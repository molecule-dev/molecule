// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { usePreview } from '../hooks/usePreview.js'
import { PreviewProvider as PreviewProviderComponent } from '../providers.js'

/**
 * Minimal in-memory PreviewProvider mock. Models the two distinct URLs the hook
 * cares about: `url` (load target) and `currentUrl` (the location reported by
 * the running preview via recordNavigation).
 */
function createMockPreviewProvider(initialUrl = ''): PreviewProvider {
  let state: PreviewState = {
    url: initialUrl,
    currentUrl: initialUrl,
    isLoading: false,
    device: 'none',
    error: null,
    isConnected: false,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
  }
  const history: string[] = []
  let index = -1
  const listeners = new Set<(s: PreviewState) => void>()
  const notify = (): void => listeners.forEach((l) => l(state))
  const flags = (): { canGoBack: boolean; canGoForward: boolean } => ({
    canGoBack: index > 0,
    canGoForward: index < history.length - 1,
  })
  const push = (url: string): void => {
    history.length = index + 1
    if (history[index] === url) return
    history.push(url)
    index = history.length - 1
  }

  return {
    name: 'mock',
    setUrl: (url: string) => {
      push(url)
      state = {
        ...state,
        url,
        currentUrl: url,
        isLoading: true,
        error: null,
        loadNonce: state.loadNonce + 1,
        ...flags(),
      }
      notify()
    },
    getUrl: () => state.url,
    refresh: () => {
      state = { ...state, isLoading: true, loadNonce: state.loadNonce + 1 }
      notify()
    },
    setDevice: (device: DeviceFrame) => {
      state = { ...state, device }
      notify()
    },
    getState: () => state,
    navigateTo: (path: string) => {
      const url = `${state.url.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
      push(url)
      state = { ...state, url, currentUrl: url, isLoading: true, ...flags() }
      notify()
    },
    recordNavigation: (url: string) => {
      if (url === state.currentUrl) return
      push(url)
      state = { ...state, currentUrl: url, ...flags() }
      notify()
    },
    back: () => {
      if (index <= 0) return
      index--
      const url = history[index]
      state = { ...state, url, currentUrl: url, loadNonce: state.loadNonce + 1, ...flags() }
      notify()
    },
    forward: () => {
      if (index >= history.length - 1) return
      index++
      const url = history[index]
      state = { ...state, url, currentUrl: url, loadNonce: state.loadNonce + 1, ...flags() }
      notify()
    },
    canGoBack: () => index > 0,
    canGoForward: () => index < history.length - 1,
    subscribe: (cb: (s: PreviewState) => void) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    openExternal: () => {},
  }
}

describe('usePreview', () => {
  const wrap = (provider: PreviewProvider) => {
    return ({ children }: { children: ReactNode }): React.ReactElement => (
      <PreviewProviderComponent provider={provider}>{children}</PreviewProviderComponent>
    )
  }

  it('exposes state and controls including recordNavigation', () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    const { result } = renderHook(() => usePreview(), { wrapper: wrap(provider) })

    expect(result.current.state.url).toBe('http://localhost:3000')
    expect(result.current.state.currentUrl).toBe('http://localhost:3000')
    expect(typeof result.current.recordNavigation).toBe('function')
    expect(typeof result.current.setUrl).toBe('function')
  })

  it('re-renders with the new currentUrl when the preview navigates (recordNavigation)', () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    const { result } = renderHook(() => usePreview(), { wrapper: wrap(provider) })

    act(() => {
      result.current.recordNavigation('http://localhost:3000/about')
    })

    // The displayed location updates; the load target is untouched (no reload).
    expect(result.current.state.currentUrl).toBe('http://localhost:3000/about')
    expect(result.current.state.url).toBe('http://localhost:3000')
  })

  it('updates both url and currentUrl when setUrl loads a new URL', () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    const { result } = renderHook(() => usePreview(), { wrapper: wrap(provider) })

    act(() => {
      result.current.setUrl('http://localhost:3000/dashboard')
    })

    expect(result.current.state.url).toBe('http://localhost:3000/dashboard')
    expect(result.current.state.currentUrl).toBe('http://localhost:3000/dashboard')
  })

  it('exposes back/forward and re-renders the canGoBack/canGoForward flags reactively', () => {
    const provider = createMockPreviewProvider()
    const { result } = renderHook(() => usePreview(), { wrapper: wrap(provider) })

    expect(typeof result.current.back).toBe('function')
    expect(typeof result.current.forward).toBe('function')
    expect(result.current.state.canGoBack).toBe(false)

    act(() => {
      result.current.setUrl('http://localhost:3000/a')
      result.current.recordNavigation('http://localhost:3000/b')
    })
    expect(result.current.state.canGoBack).toBe(true)
    expect(result.current.state.canGoForward).toBe(false)

    const nonceBefore = result.current.state.loadNonce
    act(() => {
      result.current.back()
    })
    // Back loads the previous entry (url + a loadNonce bump) and enables Forward.
    expect(result.current.state.url).toBe('http://localhost:3000/a')
    expect(result.current.state.canGoForward).toBe(true)
    expect(result.current.state.loadNonce).toBe(nonceBefore + 1)
  })
})
