// @vitest-environment jsdom

/**
 * The preview must NEVER leave the user staring at a bare white iframe with no feedback — AND it
 * must never FALSELY accuse a still-starting app of being "blank"/"unable to load".
 *
 * The iframe "loading" (its document fired `onLoad`) does NOT mean the app rendered — a fresh
 * project's COLD Vite server can take many seconds to compile the app before React mounts, during
 * which the inline bridge heartbeats (alive) but posts no `molecule:ready` yet. So the overlay
 * stays up until the app CONFIRMS it rendered content (`molecule:ready`), and the actionable
 * "preview is blank — reload / open in new tab" notice is raised ONLY on a real signal — never on
 * a naive "hasn't rendered in N seconds" timer that false-fired over a cold boot. Honest copy:
 *  - while a build is in progress (`isBuilding`) → a reassuring "Building your app…" overlay;
 *  - a first cold boot that is ALIVE (heartbeating) but hasn't confirmed a render → keep the
 *    honest "Starting…" status; do NOT accuse it of being blank (that was the fresh-project bug);
 *  - a document that never even ran its inline bridge (NO heartbeat at all ⇒ broken/error page),
 *    an app that RENDERED-then-reloaded-blank, or an explicit `molecule:blank` → the ACTIONABLE
 *    notice, after a short settle;
 *  - a confirmed render (`molecule:ready`) clears everything.
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
  // The panel's trust gate accepts molecule:* ONLY from the preview iframe's own window
  // (event.source === iframe.contentWindow), so simulate a genuine message from it. The panel
  // renders exactly one iframe; its contentWindow is a real (jsdom) Window once mounted.
  const source = document.querySelector('iframe')?.contentWindow ?? null
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
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
  it('does NOT falsely accuse a still-starting (alive, cold-booting) app of being blank', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // A fresh project's COLD Vite dev server legitimately takes many seconds to pre-bundle deps +
    // compile the just-written app before React mounts. Throughout, the scaffold's INLINE bridge
    // heartbeats (the app is alive) but posts no molecule:ready yet. This must NOT be accused of
    // being "blank" — that false accusation (with its "Open in new tab" button) is the whole
    // "fresh project preview won't load until I open a new tab and refresh the IDE" bug. The
    // honest status overlay stays up; the actionable blank notice must NOT appear.
    fireEvent.load(iframe)
    const beat = setInterval(() => postFromPreview({ type: 'molecule:heartbeat' }), 1000)
    try {
      await new Promise((r) => setTimeout(r, 8000))
      expect(q(container, 'preview-blank-notice')).toBeNull()
      // …and the overlay (honest "starting" status) still covers the not-yet-rendered app, so the
      // user always has feedback — never a bare white iframe AND never a false failure.
      expect(q(container, 'preview-overlay')).not.toBeNull()
    } finally {
      clearInterval(beat)
    }
  }, 14000)

  it('fresh project: AI stops building while cold Vite is still compiling → honest status, never a false blank, then reveals on ready', async () => {
    // The exact reported bug. A brand-new project: the AI writes files (isBuilding true), then
    // FINISHES (isBuilding flips false) while the cold Vite dev server is still pre-bundling/
    // compiling the just-written app. The iframe's shell HTML fires onLoad early; the inline bridge
    // heartbeats (alive) but React has not mounted yet (no molecule:ready for several seconds).
    // The panel MUST keep an honest "Starting…" status — never the false "preview is blank / open
    // in new tab" (or "can't load here") that forced the user to open a new tab + refresh — and
    // then reveal the app the instant the cold compile finishes and molecule:ready arrives.
    const provider = providerAtUrl()
    const { container, rerender } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={true} />
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
    fireEvent.load(iframe) // shell HTML loaded; modules still compiling
    const beat = setInterval(() => postFromPreview({ type: 'molecule:heartbeat' }), 800)
    try {
      // AI finishes — isBuilding flips false while the app has NOT rendered yet.
      rerender(
        <Wrap provider={provider}>
          <PreviewPanel isBuilding={false} />
        </Wrap>,
      )
      // For several seconds the app is alive (heartbeats) but unmounted: honest overlay, and
      // NEITHER the false "blank" notice NOR the "can't load here" give-up panel.
      await new Promise((r) => setTimeout(r, 6000))
      expect(q(container, 'preview-blank-notice')).toBeNull()
      expect(q(container, 'preview-load-failed')).toBeNull()
      expect(q(container, 'preview-overlay')).not.toBeNull()
      // Cold compile finishes, React mounts → molecule:ready → the overlay reveals the app.
      postFromPreview({ type: 'molecule:ready' })
      await waitFor(() => expect(q(container, 'preview-overlay')).toBeNull(), { timeout: 4000 })
    } finally {
      clearInterval(beat)
    }
  }, 18000)

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
    // Drive the genuine-failure path: the document loads but its inline bridge NEVER runs (no
    // heartbeat at all ⇒ a broken/error page), so the actionable notice appears.
    fireEvent.load(iframe)
    await waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 9000,
    })

    // A real render confirmation tears the notice down — the app is showing content now.
    postFromPreview({ type: 'molecule:ready' })
    await waitFor(() => expect(q(container, 'preview-blank-notice')).toBeNull(), { timeout: 4000 })
  }, 16000)

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

  it('the overlay carries NO backdrop-filter (sampling the cross-origin OOPIF backdrop deadlocks the host renderer under software compositing — the whole-tab freeze)', async () => {
    // Reproduce the exact state the freeze needed: the status overlay shown over a once-loaded
    // preview (everLoaded true → the old code set `backdrop-filter: blur(2px)` HERE). The overlay
    // sits directly on top of the live cross-origin preview <iframe> (an out-of-process iframe);
    // a backdrop-filter must read that OOPIF's compositor surface across processes every frame,
    // which deadlocks the host main thread under GPU-less software compositing. isBuilding keeps
    // the overlay up over the unconfirmed app so we can inspect it after onLoad flips everLoaded.
    const { container, iframe } = await mountWithIframe(true)
    fireEvent.load(iframe) // onLoad grace flips everLoaded → the state that used to add the blur
    await new Promise((r) => setTimeout(r, 3200)) // past ONLOAD_GRACE_MS
    const overlay = q(container, 'preview-overlay') as HTMLElement | null
    expect(overlay).not.toBeNull()
    const style = (overlay?.getAttribute('style') ?? '').toLowerCase()
    expect(style).not.toContain('backdrop-filter')
    expect(style).not.toContain('backdropfilter')
    expect(overlay?.style.backdropFilter ?? '').toBe('')
  }, 8000)
})
