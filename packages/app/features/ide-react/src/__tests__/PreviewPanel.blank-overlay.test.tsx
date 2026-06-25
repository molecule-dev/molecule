// @vitest-environment jsdom

/**
 * The preview must NEVER leave the user staring at a bare white iframe with no feedback.
 *
 * The iframe "loading" (its document fired `onLoad`) does NOT mean the app rendered — a
 * never-mounting white app loads fine and reports nothing but heartbeats. So the overlay now
 * stays up until the app CONFIRMS it rendered content (`molecule:ready`), with honest copy:
 *  - while a build is in progress (`isBuilding`) → a reassuring "Building your app…" overlay,
 *    never a bare white screen and never an alarming "blank" accusation;
 *  - once a build has FINISHED but the app still rendered nothing (document loaded + bridge
 *    alive via heartbeats, yet no `molecule:ready`) → an ACTIONABLE "preview is blank — reload"
 *    notice, after a settle window so a merely-slow first render doesn't trip it;
 *  - a confirmed render (`molecule:ready`) clears both.
 *
 * This is a real jsdom render of {@link PreviewPanel} driving a real iframe preview provider.
 * `fetch` is stubbed so the server-up poll succeeds and the iframe mounts; inbound bridge
 * messages are dispatched as same-origin `MessageEvent`s (the panel verifies `event.origin`).
 * Real timers + `waitFor` (the blank settle is several seconds), so the asserts are robust to
 * React's async scheduler rather than racing a fake clock.
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

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

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

/** A real iframe preview provider already pointed at the preview URL. */
function providerAtUrl(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL })
  provider.setUrl(PREVIEW_URL)
  return provider
}

/** Simulate an inbound bridge message from the preview iframe (same-origin). */
function postFromPreview(data: Record<string, unknown>): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN }))
}

const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // Server-up poll resolves so PreviewPanel mounts the iframe.
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

/** Mount the panel + wait until its iframe is present, then return it. */
async function mountWithIframe(isBuilding: boolean): Promise<{
  container: HTMLElement
  iframe: HTMLIFrameElement
}> {
  const provider = providerAtUrl()
  const { container } = render(
    <Wrap provider={provider}>
      <PreviewPanel isBuilding={isBuilding} />
    </Wrap>,
  )
  const iframe = await waitFor(
    () => {
      const el = container.querySelector('iframe')
      expect(el).not.toBeNull()
      return el as HTMLIFrameElement
    },
    { timeout: 4000 },
  )
  return { container, iframe }
}

describe('PreviewPanel — no bare white screen (blank/building overlay)', () => {
  it('shows an actionable "preview is blank" notice when a finished build rendered nothing', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // The document loads, and the bridge is alive (heartbeats) — but the app NEVER confirms it
    // rendered (no molecule:ready). That's a genuinely blank app.
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:heartbeat' })

    // After the onLoad-grace reveal + the blank settle window, the actionable notice appears
    // instead of a bare white iframe — with reload + open-in-tab actions.
    await waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 12000,
    })
    expect(q(container, 'preview-blank-reload')).not.toBeNull()
    expect(q(container, 'preview-blank-open')).not.toBeNull()
  }, 15000)

  it('covers a broken page that never ran its bridge (no heartbeat at all) — the worst case', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // The document loads but the page is broken/blank and its bridge NEVER runs, so there is NO
    // molecule:ready AND NO molecule:heartbeat — the iframe just sits there (e.g. a broken-image
    // / error response). The overlay must STILL cover it and the blank notice must STILL appear.
    // (The earlier bridgeAlive gate required a heartbeat, which left exactly this case a bare,
    // feedback-less broken preview.)
    fireEvent.load(iframe)
    // Deliberately post NOTHING — no ready, no heartbeat.

    await waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 10000,
    })
    // …and the overlay covered the iframe the whole time (never a bare broken page).
    expect(q(container, 'preview-overlay')).not.toBeNull()
  }, 14000)

  it('never accuses the app of being blank while a build is still in progress', async () => {
    const { container, iframe } = await mountWithIframe(true)
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:heartbeat' })

    // Past the blank-settle window (onLoad-grace ~2.5s + settle ~6s), an ACTIVE build keeps the
    // reassuring status overlay up over the unconfirmed app — never the "preview is blank"
    // accusation, never bare white.
    await new Promise((r) => setTimeout(r, 9500))
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-overlay')).not.toBeNull()
  }, 14000)

  it('clears the blank notice once the app confirms it rendered (molecule:ready)', async () => {
    const { container, iframe } = await mountWithIframe(false)
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:heartbeat' })
    await waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 12000,
    })

    // A real render confirmation tears the notice down — the app is showing content now.
    postFromPreview({ type: 'molecule:ready' })
    await waitFor(() => expect(q(container, 'preview-blank-notice')).toBeNull(), { timeout: 4000 })
  }, 18000)

  it('re-covers the preview when an edit reloads a previously-working app to blank', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // The app loads and CONFIRMS it rendered → no blank accusation.
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:heartbeat' })
    // Wait past READY_FRESH_MS so the NEXT load is evaluated as a fresh document, not a
    // continuation of the just-confirmed one.
    await new Promise((r) => setTimeout(r, 2500))
    expect(q(container, 'preview-blank-notice')).toBeNull()

    // An edit triggers a Vite full-reload, but the app now renders nothing: a fresh onLoad
    // with NO molecule:ready (the reloaded document is white), bridge still alive.
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:heartbeat' })

    // confirmedContent must DROP — the stale "it rendered" state can't keep masking a now-blank
    // reload — so the actionable notice appears instead of a bare white screen. (Without the
    // onLoad reconfirm, confirmedContent stayed true and the user was left staring at white.)
    await waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 12000,
    })
  }, 18000)
})
