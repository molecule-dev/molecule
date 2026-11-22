// @vitest-environment jsdom

/**
 * PV2/PV3 (host half) — Back/Forward must be a CLIENT-SIDE history move, not a
 * cold reload.
 *
 * The MVP intent re-read flagged that the preview's Back/Forward cold-reloaded
 * the whole iframe (`loadNonce` bump → spinner → app re-mounts, scroll + SPA
 * state lost) — the opposite of how a browser behaves. The fix: clicking
 * Back/Forward (1) moves the host's history cursor via the provider WITHOUT
 * bumping `loadNonce` (so the iframe is never re-mounted) and (2) posts a
 * `{ type: 'molecule:nav-command', action }` message to the iframe, whose
 * scaffold-injected receiver runs `history.back()`/`forward()` inside the
 * preview (preserving scroll + SPA state).
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.navigation.test.tsx`
 * with the same test names and the same assertions: a real jsdom render of the
 * Angular {@link PreviewPanel} driving a REAL {@link IframePreviewProvider} seeded
 * with navigation history. `fetch` is stubbed so the server-up poll succeeds and
 * the iframe actually mounts (its `contentWindow` is the post target).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  type MountedPanel,
  mountPanel,
  providerAtUrl,
  settle,
  waitFor,
} from './preview-panel-harness.js'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

beforeEach(() => {
  setClassMap(classMap)
  // Server-up poll resolves so PreviewPanel mounts the iframe (the post target).
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => new Response(null, { status: 200 })),
  )
})

afterEach(() => {
  for (const panel of mounted.splice(0)) panel.unmount()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Builds a real provider already sitting at `/settings` with `/` behind it in
 * history (so Back is enabled and there is a concrete previous entry).
 *
 * @returns The seeded iframe preview provider.
 */
function seededProvider(): ReturnType<typeof providerAtUrl> {
  const provider = providerAtUrl()
  provider.setUrl('http://localhost:5173/') // history: [/], idx 0, loadNonce 1
  provider.recordNavigation('http://localhost:5173/settings') // [/,/settings], idx 1
  return provider
}

/**
 * Mounts the panel over a provider and tracks it for teardown.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @returns The mounted panel.
 */
async function mount(provider: ReturnType<typeof providerAtUrl>): Promise<MountedPanel> {
  const panel = await mountPanel(provider, {})
  mounted.push(panel)
  return panel
}

describe('PreviewPanel Back/Forward (PV2/PV3 — client-side nav, not a reload)', () => {
  it('posts a molecule:nav-command to the iframe and does NOT cold-reload', async () => {
    const provider = seededProvider()
    expect(provider.getState().canGoBack).toBe(true)
    const loadNonceBefore = provider.getState().loadNonce

    const { container } = await mount(provider)

    // The iframe mounts once the server-up poll resolves — it is the post target.
    await waitFor(() => container.querySelector('iframe') !== null, 5_000, 'the preview iframe')
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    const postSpy = vi
      .spyOn(iframe.contentWindow as Window, 'postMessage')
      .mockImplementation(() => {})

    const backButton = container.querySelector('[data-mol-id="preview-back"]') as HTMLButtonElement
    expect(backButton.disabled).toBe(false)
    backButton.click()
    await settle()

    // (1) The host posted a client-side Back command into the iframe — NOT a
    // host-side reload. The exact shape matches the scaffold receiver's contract.
    // Targeted at the iframe src's ORIGIN (no wildcard), per the outbound
    // postMessage trust boundary.
    expect(postSpy).toHaveBeenCalledWith(
      { type: 'molecule:nav-command', action: 'back' },
      'http://localhost:5173',
    )

    // (2) No cold reload: loadNonce is untouched (the iframe was never re-mounted).
    expect(provider.getState().loadNonce).toBe(loadNonceBefore)

    // (3) The URL bar followed the history cursor to the previous entry.
    expect(provider.getState().currentUrl).toBe('http://localhost:5173/')
    await waitFor(
      () =>
        (container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement).value ===
        'http://localhost:5173/',
      5_000,
      'the URL bar to follow the history cursor',
    )
  })

  it('Forward posts a forward nav-command and re-enables after going Back', async () => {
    const provider = seededProvider()
    const { container } = await mount(provider)
    await waitFor(() => container.querySelector('iframe') !== null, 5_000, 'the preview iframe')
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    const postSpy = vi
      .spyOn(iframe.contentWindow as Window, 'postMessage')
      .mockImplementation(() => {})

    // Go Back first so Forward becomes available.
    ;(container.querySelector('[data-mol-id="preview-back"]') as HTMLButtonElement).click()
    await settle()
    const forwardButton = container.querySelector(
      '[data-mol-id="preview-forward"]',
    ) as HTMLButtonElement
    await waitFor(() => !forwardButton.disabled, 5_000, 'Forward to re-enable')

    const loadNonceBefore = provider.getState().loadNonce
    forwardButton.click()
    await settle()

    expect(postSpy).toHaveBeenLastCalledWith(
      { type: 'molecule:nav-command', action: 'forward' },
      'http://localhost:5173',
    )
    expect(provider.getState().loadNonce).toBe(loadNonceBefore) // still no reload
    expect(provider.getState().currentUrl).toBe('http://localhost:5173/settings')
  })
})
