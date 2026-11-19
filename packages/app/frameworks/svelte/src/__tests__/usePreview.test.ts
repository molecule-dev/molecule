// @vitest-environment jsdom

/**
 * `usePreview` over a provider that models the two distinct URLs the hook cares
 * about: `url` (load target) and `currentUrl` (the location the running preview
 * reports through `recordNavigation`). React's `usePreview` cases in the Svelte
 * binding: the state is a readable store and the controls are plain functions.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { setMoleculeContext } from '../context.js'
import { usePreview, type UsePreviewResult } from '../hooks/usePreview.js'
import type { MoleculeConfig } from '../types.js'

/**
 * Minimal in-memory PreviewProvider mock.
 *
 * @param initialUrl - The url the preview starts at.
 * @returns The provider.
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

/** Lets queued microtasks and timers run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

const hosts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts a host that calls `usePreview` once during a child's init, under the
 * given preview provider.
 *
 * @param provider - The provider the context carries.
 * @returns The hook's result and the host's unmount.
 */
function openPreview(provider: PreviewProvider): {
  preview: UsePreviewResult
  stop: () => Promise<void>
} {
  const config: MoleculeConfig = { preview: provider }
  const captured: { result?: UsePreviewResult } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config,
      setMoleculeContext,
      run: () => {
        captured.result = usePreview()
      },
    },
  })
  flushSync()
  const preview = captured.result
  if (!preview) throw new Error('the host never ran the hook')
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { preview, stop }
}

describe('usePreview', () => {
  it('exposes state and controls including recordNavigation', () => {
    const { preview } = openPreview(createMockPreviewProvider('http://localhost:3000'))

    expect(get(preview.state).url).toBe('http://localhost:3000')
    expect(get(preview.state).currentUrl).toBe('http://localhost:3000')
    expect(typeof preview.recordNavigation).toBe('function')
    expect(typeof preview.setUrl).toBe('function')
  })

  it('re-renders with the new currentUrl when the preview navigates (recordNavigation)', async () => {
    const { preview } = openPreview(createMockPreviewProvider('http://localhost:3000'))

    preview.recordNavigation('http://localhost:3000/about')
    await settle()

    // The displayed location updates; the load target is untouched (no reload).
    expect(get(preview.state).currentUrl).toBe('http://localhost:3000/about')
    expect(get(preview.state).url).toBe('http://localhost:3000')
  })

  it('updates both url and currentUrl when setUrl loads a new URL', async () => {
    const { preview } = openPreview(createMockPreviewProvider('http://localhost:3000'))

    preview.setUrl('http://localhost:3000/dashboard')
    await settle()

    expect(get(preview.state).url).toBe('http://localhost:3000/dashboard')
    expect(get(preview.state).currentUrl).toBe('http://localhost:3000/dashboard')
  })

  it('exposes back/forward and re-renders the canGoBack/canGoForward flags reactively', async () => {
    const { preview } = openPreview(createMockPreviewProvider())

    expect(typeof preview.back).toBe('function')
    expect(typeof preview.forward).toBe('function')
    expect(get(preview.state).canGoBack).toBe(false)

    preview.setUrl('http://localhost:3000/a')
    preview.recordNavigation('http://localhost:3000/b')
    await settle()
    expect(get(preview.state).canGoBack).toBe(true)
    expect(get(preview.state).canGoForward).toBe(false)

    const nonceBefore = get(preview.state).loadNonce
    preview.back()
    await settle()
    // Back loads the previous entry (url + a loadNonce bump) and enables Forward.
    expect(get(preview.state).url).toBe('http://localhost:3000/a')
    expect(get(preview.state).canGoForward).toBe(true)
    expect(get(preview.state).loadNonce).toBe(nonceBefore + 1)
  })
})
