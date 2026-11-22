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
 * with the same test names and the same assertions: the Solid panel is a view
 * over the same shared behaviour (`createPreviewPanelSession`), driving a REAL
 * {@link IframePreviewProvider} seeded with navigation history. `fetch` is
 * stubbed so the server-up poll succeeds and the iframe actually mounts (its
 * `contentWindow` is the post target). A polling `waitFor` replaces React
 * Testing Library's; the panel runs on real timers like React's test.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'

import { PreviewPanel } from '../components/PreviewPanel.jsx'

/** The roots this file mounted, disposed after each test. */
const mounted: { dispose: () => void }[] = []

/** Waits for a real-time delay. */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Polls until `check` answers true.
 *
 * @param check - The condition.
 * @param what - What is awaited, for the failure message.
 * @param timeout - How long to wait (ms).
 * @returns Resolves once the condition holds.
 */
async function waitFor(check: () => boolean, what: string, timeout = 4000): Promise<void> {
  const deadline = Date.now() + timeout
  for (;;) {
    if (check()) return
    if (Date.now() > deadline) throw new Error(`timed out after ${timeout}ms waiting for ${what}`)
    await delay(20)
  }
}

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

beforeEach(() => {
  // Server-up poll resolves so PreviewPanel mounts the iframe (the post target).
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 }))),
  )
})

afterEach(() => {
  for (const mount of mounted.splice(0)) mount.dispose()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Mounts the panel over a provider and waits for the iframe to mount.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @returns The mount container and the iframe.
 */
async function mountPanel(provider: ReturnType<typeof createProvider>): Promise<{
  container: HTMLElement
  iframe: HTMLIFrameElement
}> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <PreviewContext.Provider value={provider}>
        <PreviewPanel />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose })
  await waitFor(() => container.querySelector('iframe') !== null, 'the preview iframe to mount')
  const iframe = container.querySelector('iframe')
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { container, iframe }
}

describe('PreviewPanel Back/Forward (PV2/PV3 — client-side nav, not a reload)', () => {
  it('posts a molecule:nav-command to the iframe and does NOT cold-reload', async () => {
    const provider = seededProvider()
    expect(provider.getState().canGoBack).toBe(true)
    const loadNonceBefore = provider.getState().loadNonce

    const { container, iframe } = await mountPanel(provider)
    const postSpy = vi
      .spyOn(iframe.contentWindow as Window, 'postMessage')
      .mockImplementation(() => {})

    const backButton = container.querySelector('[data-mol-id="preview-back"]') as HTMLButtonElement
    expect(backButton.disabled).toBe(false)
    backButton.click()

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
      'the URL bar to follow the history cursor',
    )
  })

  it('Forward posts a forward nav-command and re-enables after going Back', async () => {
    const provider = seededProvider()
    const { container, iframe } = await mountPanel(provider)
    const postSpy = vi
      .spyOn(iframe.contentWindow as Window, 'postMessage')
      .mockImplementation(() => {})

    // Go Back first so Forward becomes available.
    ;(container.querySelector('[data-mol-id="preview-back"]') as HTMLButtonElement).click()
    const forwardButton = container.querySelector(
      '[data-mol-id="preview-forward"]',
    ) as HTMLButtonElement
    await waitFor(() => !forwardButton.disabled, 'Forward to re-enable after going Back')

    const loadNonceBefore = provider.getState().loadNonce
    forwardButton.click()

    expect(postSpy).toHaveBeenLastCalledWith(
      { type: 'molecule:nav-command', action: 'forward' },
      'http://localhost:5173',
    )
    expect(provider.getState().loadNonce).toBe(loadNonceBefore) // still no reload
    expect(provider.getState().currentUrl).toBe('http://localhost:5173/settings')
  })
})
