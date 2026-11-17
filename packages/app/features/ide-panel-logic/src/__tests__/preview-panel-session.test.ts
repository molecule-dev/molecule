// @vitest-environment jsdom

/**
 * `createPreviewPanelSession` runs the React panel's behaviour over a framework's live preview:
 * a cold load polls the server and mounts the iframe once it answers, the ready handshake from
 * the iframe's own window reveals it (and a forged sender is ignored), a reported navigation
 * reaches the provider, the host's props reach the logic through `update`, and unmounting stops
 * the polling.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import type { PreviewPanelPreview } from '../components/preview-panel-logic.js'
import {
  createPreviewPanelSession,
  type PreviewPanelSession,
} from '../components/preview-panel-session.js'

const URL_A = 'https://app.example.test/'

/** A minimal in-memory live-preview provider. */
function fakeProvider(): PreviewProvider & { navigations: Array<[string, boolean | undefined]> } {
  let state: PreviewState = {
    url: '',
    currentUrl: '',
    isLoading: false,
    device: 'none',
    error: null,
    isConnected: true,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
  }
  const listeners = new Set<(next: PreviewState) => void>()
  const set = (patch: Partial<PreviewState>): void => {
    state = { ...state, ...patch }
    for (const listener of [...listeners]) listener(state)
  }
  const navigations: Array<[string, boolean | undefined]> = []
  return {
    name: 'in-memory',
    navigations,
    setUrl: (url: string) => set({ url, currentUrl: url }),
    getUrl: () => state.url,
    refresh: () => set({ loadNonce: state.loadNonce + 1 }),
    setDevice: (device: DeviceFrame) => set({ device }),
    getState: () => state,
    navigateTo: (path: string) => set({ currentUrl: new URL(path, state.url).toString() }),
    recordNavigation: (url: string, isReplace?: boolean) => {
      navigations.push([url, isReplace])
      set({ currentUrl: url })
    },
    back: () => {},
    forward: () => {},
    canGoBack: () => false,
    canGoForward: () => false,
    subscribe: (callback: (next: PreviewState) => void) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    openExternal: () => {},
  }
}

const actionsOf = new WeakMap<PreviewProvider, Omit<PreviewPanelPreview, 'state'>>()

/**
 * What a framework binding's `usePreview()` gives the panel: the provider's state, and actions
 * over it that stay the same functions (an effect that depends on one would re-run otherwise).
 *
 * @param provider - The live-preview provider.
 * @returns The state and actions.
 */
function previewOf(provider: PreviewProvider): PreviewPanelPreview {
  let actions = actionsOf.get(provider)
  if (!actions) {
    actions = {
      setDevice: (device) => provider.setDevice(device),
      recordNavigation: (url, isReplace) => provider.recordNavigation(url, isReplace),
      back: () => provider.back(),
      forward: () => provider.forward(),
    }
    actionsOf.set(provider, actions)
  }
  return { state: provider.getState(), ...actions }
}

/**
 * Mounts a session over a provider the way a framework view does: one provider subscription
 * passes each new state to `setPreview`.
 *
 * @param provider - The live-preview provider.
 * @param session - The session.
 * @returns Unmounts both.
 */
function mount(provider: PreviewProvider, session: PreviewPanelSession): () => void {
  const stop = provider.subscribe(() => session.setPreview(previewOf(provider)))
  const disconnect = session.connect()
  return () => {
    stop()
    disconnect()
  }
}

/** Lets pending promise continuations and the session's microtask renders run. */
const settle = async (ms = 0): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
}

/** Posts a message as if from `source`. */
const post = (data: unknown, source: Window | null): void => {
  window.dispatchEvent(new MessageEvent('message', { data, source }))
}

let fetchMock: ReturnType<typeof vi.fn>
let serverUp = false

beforeEach(() => {
  vi.useFakeTimers()
  serverUp = false
  fetchMock = vi.fn(async () => {
    if (!serverUp) throw new Error('connection refused')
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('createPreviewPanelSession', () => {
  it('polls a cold load target and mounts the iframe once the server answers', async () => {
    const provider = fakeProvider()
    const session = createPreviewPanelSession({
      preview: previewOf(provider),
      props: { isBuilding: false },
    })
    const disconnect = mount(provider, session)
    provider.setUrl(URL_A)
    await settle()
    expect(session.getState().iframeSrc).toBe('')
    expect(fetchMock).toHaveBeenCalled()

    serverUp = true
    await settle(2000)
    const state = session.getState()
    expect(state.iframeSrc).toBe(URL_A)
    expect(state.everLoaded).toBe(true)
    expect(state.iframeReady).toBe(false)
    disconnect()
  })

  it('reveals on the ready handshake from the iframe window only, and records navigations', async () => {
    serverUp = true
    const provider = fakeProvider()
    provider.setUrl(URL_A)
    const session = createPreviewPanelSession({ preview: previewOf(provider) })
    const disconnect = mount(provider, session)
    await settle(100)
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    session.getState().iframeRef.current = iframe

    post({ type: 'molecule:ready' }, window)
    await settle()
    expect(session.getState().confirmedContent).toBe(false)

    post({ type: 'molecule:ready' }, iframe.contentWindow)
    await settle()
    expect(session.getState()).toMatchObject({ iframeReady: true, confirmedContent: true })
    expect(session.getState().renderState).toBe('rendered')

    post({ type: 'molecule:navigate', url: `${URL_A}about`, isReplace: true }, iframe.contentWindow)
    await settle()
    expect(provider.navigations).toEqual([[`${URL_A}about`, true]])
    expect(session.getState().currentLocation).toBe(`${URL_A}about`)
    disconnect()
    iframe.remove()
  })

  it('reports the render verdict through the props passed to update', async () => {
    serverUp = true
    const provider = fakeProvider()
    provider.setUrl(URL_A)
    const session = createPreviewPanelSession({ preview: previewOf(provider) })
    const disconnect = mount(provider, session)
    const onRenderState = vi.fn()
    session.update({ onRenderState })
    await settle(100)
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    session.getState().iframeRef.current = iframe
    post({ type: 'molecule:ready' }, iframe.contentWindow)
    await settle()
    expect(onRenderState).toHaveBeenLastCalledWith('rendered', URL_A)
    disconnect()
    iframe.remove()
  })

  it('a handler applies its updates before it returns', async () => {
    serverUp = true
    const provider = fakeProvider()
    provider.setUrl(URL_A)
    const session = createPreviewPanelSession({ preview: previewOf(provider) })
    const disconnect = mount(provider, session)
    await settle(100)
    session.getState().setUrlDraft('https://typed.example.test/')
    expect(session.getState().urlDraft).toBe('https://typed.example.test/')
    session.getState().handleDeviceChange('mobile')
    expect(provider.getState().device).toBe('mobile')
    disconnect()
  })

  it('stops polling once unmounted', async () => {
    const provider = fakeProvider()
    const session = createPreviewPanelSession({ preview: previewOf(provider) })
    const disconnect = mount(provider, session)
    provider.setUrl(URL_A)
    await settle(1000)
    disconnect()
    const calls = fetchMock.mock.calls.length
    await settle(20_000)
    expect(fetchMock.mock.calls.length).toBe(calls)
  })
})
