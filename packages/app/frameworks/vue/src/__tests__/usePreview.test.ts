// @vitest-environment jsdom

/**
 * `usePreview` over a provider that models the two distinct URLs the composable
 * cares about: `url` (load target) and `currentUrl` (the location the running
 * preview reports through `recordNavigation`).
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { usePreview } from '../composables/usePreview.js'
import { moleculePlugin } from '../plugin.js'
import type { UsePreviewResult } from '../types.js'

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

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Mounts one component whose setup calls `usePreview` under the given provider.
 *
 * @param provider - The provider the plugin injects.
 * @returns The composable result and the mounted wrapper.
 */
function openPreview(provider: PreviewProvider): {
  preview: UsePreviewResult
  wrapper: VueWrapper
} {
  let preview!: UsePreviewResult
  const Page = defineComponent({
    setup() {
      preview = usePreview()
      return () => h('div')
    },
  })
  const wrapper = mount(Page, { global: { plugins: [[moleculePlugin, { preview: provider }]] } })
  wrappers.push(wrapper)
  return { preview, wrapper }
}

describe('usePreview', () => {
  it('exposes state and controls including recordNavigation', () => {
    const { preview } = openPreview(createMockPreviewProvider('http://localhost:3000'))

    expect(preview.state.value.url).toBe('http://localhost:3000')
    expect(preview.state.value.currentUrl).toBe('http://localhost:3000')
    expect(typeof preview.recordNavigation).toBe('function')
    expect(typeof preview.setUrl).toBe('function')
  })

  it('re-renders with the new currentUrl when the preview navigates (recordNavigation)', () => {
    const { preview } = openPreview(createMockPreviewProvider('http://localhost:3000'))

    preview.recordNavigation('http://localhost:3000/about')

    // The displayed location updates; the load target is untouched (no reload).
    expect(preview.state.value.currentUrl).toBe('http://localhost:3000/about')
    expect(preview.state.value.url).toBe('http://localhost:3000')
  })

  it('updates both url and currentUrl when setUrl loads a new URL', () => {
    const { preview } = openPreview(createMockPreviewProvider('http://localhost:3000'))

    preview.setUrl('http://localhost:3000/dashboard')

    expect(preview.state.value.url).toBe('http://localhost:3000/dashboard')
    expect(preview.state.value.currentUrl).toBe('http://localhost:3000/dashboard')
  })

  it('exposes back/forward and re-renders the canGoBack/canGoForward flags reactively', () => {
    const { preview } = openPreview(createMockPreviewProvider())

    expect(typeof preview.back).toBe('function')
    expect(typeof preview.forward).toBe('function')
    expect(preview.state.value.canGoBack).toBe(false)

    preview.setUrl('http://localhost:3000/a')
    preview.recordNavigation('http://localhost:3000/b')
    expect(preview.state.value.canGoBack).toBe(true)
    expect(preview.state.value.canGoForward).toBe(false)

    const nonceBefore = preview.state.value.loadNonce
    preview.back()
    // Back loads the previous entry (url + a loadNonce bump) and enables Forward.
    expect(preview.state.value.url).toBe('http://localhost:3000/a')
    expect(preview.state.value.canGoForward).toBe(true)
    expect(preview.state.value.loadNonce).toBe(nonceBefore + 1)
  })
})
