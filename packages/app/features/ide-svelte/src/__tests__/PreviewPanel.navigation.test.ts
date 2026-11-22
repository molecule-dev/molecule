// @vitest-environment jsdom

/**
 * PV2/PV3 (host half) — Back/Forward must be a CLIENT-SIDE history move, not a
 * cold reload.
 *
 * Clicking Back/Forward (1) moves the host's history cursor via the provider
 * WITHOUT bumping `loadNonce` (so the iframe is never re-mounted) and (2) posts
 * a `{ type: 'molecule:nav-command', action }` message to the iframe, whose
 * scaffold-injected receiver runs `history.back()`/`forward()` inside the
 * preview (preserving scroll + SPA state).
 *
 * A port of `@molecule/app-ide-react`'s `PreviewPanel.navigation.test.tsx`
 * with the same test names and the same behavioural assertions: a real jsdom
 * render of the Svelte `PreviewPanel` driving the REAL iframe preview
 * provider seeded with navigation history. `fetch` is stubbed so the server-up
 * poll succeeds and the iframe actually mounts (its `contentWindow` is the
 * post target).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-live-preview-iframe'

import type { MountedPanel } from './preview-panel-harness.js'
import { advance, installStubClassMap, mountPanel } from './preview-panel-harness.js'

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

beforeEach(() => {
  installStubClassMap()
  // Server-up poll resolves so PreviewPanel mounts the iframe (the post target).
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 200 }))),
  )
  vi.useFakeTimers()
})

afterEach(async () => {
  vi.useRealTimers()
  await panel?.dispose()
  panel = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Builds a real provider already sitting at `/settings` with `/` behind it in
 * history (so Back is enabled and there is a concrete previous entry).
 *
 * @returns The seeded iframe preview provider.
 */
function seededProvider(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: 'http://localhost:5173/' })
  provider.setUrl('http://localhost:5173/') // history: [/], idx 0, loadNonce 1
  provider.recordNavigation('http://localhost:5173/settings') // [/,/settings], idx 1
  return provider
}

/** Mounts the panel and drives the server-up poll so the iframe mounts. */
async function mountSeeded(): Promise<
  MountedPanel & {
    iframe: HTMLIFrameElement
    provider: ReturnType<typeof createProvider>
    postSpy: ReturnType<typeof vi.spyOn>
  }
> {
  const provider = seededProvider()
  expect(provider.getState().canGoBack).toBe(true)
  const mounted = mountPanel(provider)
  panel = mounted
  for (let i = 0; i < 12 && !mounted.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = mounted.container.querySelector('iframe')
  if (!iframe) throw new Error('the preview iframe never mounted')
  const previewWindow = iframe.contentWindow
  if (!previewWindow) throw new Error('the preview iframe has no content window')
  // The post target: the iframe's own window.
  const postSpy = vi.spyOn(previewWindow, 'postMessage').mockImplementation(() => {})
  return { ...mounted, iframe, provider, postSpy }
}

describe('PreviewPanel Back/Forward (PV2/PV3 — client-side nav, not a reload)', () => {
  it('posts a molecule:nav-command to the iframe and does NOT cold-reload', async () => {
    const { container, provider, postSpy } = await mountSeeded()
    const loadNonceBefore = provider.getState().loadNonce

    const backButton = container.querySelector('[data-mol-id="preview-back"]')
    if (!(backButton instanceof HTMLButtonElement)) throw new Error('the Back button is missing')
    expect(backButton.disabled).toBe(false)
    backButton.click()
    await advance(0)

    // (1) The host posted a client-side Back command into the iframe — NOT a
    // host-side reload. The exact shape matches the scaffold receiver's
    // contract, targeted at the iframe src's ORIGIN (no wildcard).
    expect(postSpy).toHaveBeenCalledWith(
      { type: 'molecule:nav-command', action: 'back' },
      'http://localhost:5173',
    )

    // (2) No cold reload: loadNonce is untouched (the iframe was never re-mounted).
    expect(provider.getState().loadNonce).toBe(loadNonceBefore)

    // (3) The URL bar followed the history cursor to the previous entry.
    expect(provider.getState().currentUrl).toBe('http://localhost:5173/')
    await advance(0)
    const input = container.querySelector('[data-mol-id="preview-url"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('the URL input is missing')
    expect(input.value).toBe('http://localhost:5173/')
  }, 30_000)

  it('Forward posts a forward nav-command and re-enables after going Back', async () => {
    const { container, provider, postSpy } = await mountSeeded()

    // Go Back first so Forward becomes available.
    const backButton = container.querySelector('[data-mol-id="preview-back"]')
    if (!(backButton instanceof HTMLButtonElement)) throw new Error('the Back button is missing')
    backButton.click()
    await advance(0)
    const forwardButton = container.querySelector('[data-mol-id="preview-forward"]')
    if (!(forwardButton instanceof HTMLButtonElement)) {
      throw new Error('the Forward button is missing')
    }
    expect(forwardButton.disabled).toBe(false)

    const loadNonceBefore = provider.getState().loadNonce
    forwardButton.click()
    await advance(0)

    expect(postSpy).toHaveBeenLastCalledWith(
      { type: 'molecule:nav-command', action: 'forward' },
      'http://localhost:5173',
    )
    expect(provider.getState().loadNonce).toBe(loadNonceBefore) // still no reload
    expect(provider.getState().currentUrl).toBe('http://localhost:5173/settings')
  }, 30_000)
})
