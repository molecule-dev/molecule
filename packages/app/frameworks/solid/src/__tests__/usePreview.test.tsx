// @vitest-environment jsdom

/**
 * `usePreview` exposes the live preview state and controls, and follows the
 * provider's navigation updates.
 *
 * Mirrors the React package's `usePreview.test.tsx`.
 *
 * @module
 */

import { createComponent, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { PreviewContext } from '../context.js'
import { usePreview, type UsePreviewResult } from '../primitives/ide.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Minimal in-memory PreviewProvider mock. Models the two distinct URLs the hook
 * cares about: `url` (load target) and `currentUrl` (the location reported by
 * the running preview via recordNavigation).
 *
 * @param initialUrl - The URL the preview starts on.
 * @returns The mock provider.
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
  const notify = (): void =>
    listeners.forEach((listener) => {
      listener(state)
    })
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
    subscribe: (callback: (s: PreviewState) => void) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    openExternal: () => {},
  }
}

/**
 * Mounts a probe that captures the hook result and wraps it in the preview
 * context.
 *
 * @param provider - The preview provider the context carries.
 * @param read - Receives the hook result once the mount has run.
 * @returns The idempotent unmount.
 */
function mountPreview(
  provider: PreviewProvider,
  read: (preview: UsePreviewResult) => void,
): () => void {
  function Probe(): null {
    read(usePreview())
    return null
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    (): JSX.Element =>
      createComponent(PreviewContext.Provider, {
        get value() {
          return provider
        },
        get children() {
          return createComponent(Probe, {})
        },
      }),
    container,
  )
  const unmount = (): void => {
    dispose()
    container.remove()
  }
  disposers.push(unmount)
  return unmount
}

/**
 * Lets the hook's queued snapshot notifications run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

describe('usePreview', () => {
  it('exposes state and controls including recordNavigation', () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    let preview!: UsePreviewResult
    mountPreview(provider, (result) => {
      preview = result
    })

    expect(preview.state().url).toBe('http://localhost:3000')
    expect(preview.state().currentUrl).toBe('http://localhost:3000')
    expect(typeof preview.recordNavigation).toBe('function')
    expect(typeof preview.setUrl).toBe('function')
  })

  it('re-renders with the new currentUrl when the preview navigates (recordNavigation)', async () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    let preview!: UsePreviewResult
    mountPreview(provider, (result) => {
      preview = result
    })

    preview.recordNavigation('http://localhost:3000/about')
    await settle()

    // The displayed location updates; the load target is untouched (no reload).
    expect(preview.state().currentUrl).toBe('http://localhost:3000/about')
    expect(preview.state().url).toBe('http://localhost:3000')
  })

  it('updates both url and currentUrl when setUrl loads a new URL', async () => {
    const provider = createMockPreviewProvider('http://localhost:3000')
    let preview!: UsePreviewResult
    mountPreview(provider, (result) => {
      preview = result
    })

    preview.setUrl('http://localhost:3000/dashboard')
    await settle()

    expect(preview.state().url).toBe('http://localhost:3000/dashboard')
    expect(preview.state().currentUrl).toBe('http://localhost:3000/dashboard')
  })

  it('exposes back/forward and re-renders the canGoBack/canGoForward flags reactively', async () => {
    const provider = createMockPreviewProvider()
    let preview!: UsePreviewResult
    mountPreview(provider, (result) => {
      preview = result
    })

    expect(typeof preview.back).toBe('function')
    expect(typeof preview.forward).toBe('function')
    expect(preview.state().canGoBack).toBe(false)

    preview.setUrl('http://localhost:3000/a')
    preview.recordNavigation('http://localhost:3000/b')
    await settle()
    expect(preview.state().canGoBack).toBe(true)
    expect(preview.state().canGoForward).toBe(false)

    const nonceBefore = preview.state().loadNonce
    preview.back()
    await settle()
    // Back loads the previous entry (url + a loadNonce bump) and enables Forward.
    expect(preview.state().url).toBe('http://localhost:3000/a')
    expect(preview.state().canGoForward).toBe(true)
    expect(preview.state().loadNonce).toBe(nonceBefore + 1)
  })
})
