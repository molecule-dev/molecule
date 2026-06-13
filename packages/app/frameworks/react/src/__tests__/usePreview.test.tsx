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
  }
  const listeners = new Set<(s: PreviewState) => void>()
  const notify = (): void => listeners.forEach((l) => l(state))

  return {
    name: 'mock',
    setUrl: (url: string) => {
      state = { ...state, url, currentUrl: url, isLoading: true, error: null }
      notify()
    },
    getUrl: () => state.url,
    refresh: () => {
      state = { ...state, isLoading: true }
      notify()
    },
    setDevice: (device: DeviceFrame) => {
      state = { ...state, device }
      notify()
    },
    getState: () => state,
    navigateTo: (path: string) => {
      const url = `${state.url.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
      state = { ...state, url, currentUrl: url, isLoading: true }
      notify()
    },
    recordNavigation: (url: string) => {
      if (url === state.currentUrl) return
      state = { ...state, currentUrl: url }
      notify()
    },
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
})
