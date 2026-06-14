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
 * This is a real jsdom render of {@link PreviewPanel} driving a REAL
 * {@link IframePreviewProvider} seeded with navigation history. `fetch` is
 * stubbed so the server-up poll succeeds and the iframe actually mounts (its
 * `contentWindow` is the post target). The test would FAIL if anyone reverted
 * the host to a `loadNonce`-bumping reload (no `molecule:nav-command` is posted
 * and `loadNonce` changes) — exactly the regression it guards.
 *
 * @module
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { I18nProvider, PreviewProvider as PreviewContextProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { PreviewPanel } from '../components/PreviewPanel.js'

/**
 * Wrap children with the i18n + preview context PreviewPanel needs.
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @param props.provider - The live-preview provider to drive the panel.
 * @returns The wrapped tree.
 */
function Wrap({
  children,
  provider,
}: {
  children: ReactNode
  provider: PreviewProvider
}): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <PreviewContextProvider provider={provider}>{children}</PreviewContextProvider>
    </I18nProvider>
  )
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // Server-up poll resolves so PreviewPanel mounts the iframe (the post target).
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true } as Response)),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Builds a real provider already sitting at `/settings` with `/` behind it in
 * history (so Back is enabled and there is a concrete previous entry).
 * @returns The seeded iframe preview provider.
 */
function seededProvider(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: 'http://localhost:5173/' })
  provider.setUrl('http://localhost:5173/') // history: [/], idx 0, loadNonce 1
  provider.recordNavigation('http://localhost:5173/settings') // [/,/settings], idx 1
  return provider
}

describe('PreviewPanel Back/Forward (PV2/PV3 — client-side nav, not a reload)', () => {
  it('posts a molecule:nav-command to the iframe and does NOT cold-reload', async () => {
    const provider = seededProvider()
    expect(provider.getState().canGoBack).toBe(true)
    const loadNonceBefore = provider.getState().loadNonce

    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel />
      </Wrap>,
    )

    // The iframe mounts once the server-up poll resolves — it is the post target.
    await waitFor(() => {
      expect(container.querySelector('iframe')).not.toBeNull()
    })
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    const postSpy = vi
      .spyOn(iframe.contentWindow as Window, 'postMessage')
      .mockImplementation(() => {})

    const backButton = container.querySelector('[data-mol-id="preview-back"]') as HTMLButtonElement
    expect(backButton.disabled).toBe(false)
    fireEvent.click(backButton)

    // (1) The host posted a client-side Back command into the iframe — NOT a
    // host-side reload. The exact shape matches the scaffold receiver's contract.
    expect(postSpy).toHaveBeenCalledWith({ type: 'molecule:nav-command', action: 'back' }, '*')

    // (2) No cold reload: loadNonce is untouched (the iframe was never re-mounted).
    expect(provider.getState().loadNonce).toBe(loadNonceBefore)

    // (3) The URL bar followed the history cursor to the previous entry.
    expect(provider.getState().currentUrl).toBe('http://localhost:5173/')
    await waitFor(() => {
      const input = container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement
      expect(input.value).toBe('http://localhost:5173/')
    })
  })

  it('Forward posts a forward nav-command and re-enables after going Back', async () => {
    const provider = seededProvider()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel />
      </Wrap>,
    )
    await waitFor(() => {
      expect(container.querySelector('iframe')).not.toBeNull()
    })
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    const postSpy = vi
      .spyOn(iframe.contentWindow as Window, 'postMessage')
      .mockImplementation(() => {})

    // Go Back first so Forward becomes available.
    fireEvent.click(container.querySelector('[data-mol-id="preview-back"]') as HTMLButtonElement)
    const forwardButton = container.querySelector(
      '[data-mol-id="preview-forward"]',
    ) as HTMLButtonElement
    await waitFor(() => expect(forwardButton.disabled).toBe(false))

    const loadNonceBefore = provider.getState().loadNonce
    fireEvent.click(forwardButton)

    expect(postSpy).toHaveBeenLastCalledWith(
      { type: 'molecule:nav-command', action: 'forward' },
      '*',
    )
    expect(provider.getState().loadNonce).toBe(loadNonceBefore) // still no reload
    expect(provider.getState().currentUrl).toBe('http://localhost:5173/settings')
  })
})
