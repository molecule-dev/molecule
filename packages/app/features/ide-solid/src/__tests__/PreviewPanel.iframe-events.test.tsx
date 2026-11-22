// @vitest-environment jsdom

/**
 * The iframe's own load event — `handleIframeLoad`. It decides whether a
 * finished document load counts as content: a fresh `molecule:ready` keeps
 * the reveal, a stale one re-covers, a raw-document click intent IS content
 * (but only while fresh), and the onLoad grace reveals ONLY an app that
 * rendered before — and never masks a crash. (An iframe has no error event
 * to handle: browsers do not fire one for a failed load.) The reveal FADES out
 * over ~500ms (the overlay element lingers at opacity 0 until the fade timer),
 * so "revealed" assertions wait past OVERLAY_FADE_MS.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.iframe-events.test.tsx`
 * with the same test names and the same assertions: the Solid panel is a view
 * over the same shared behaviour (`createPreviewPanelSession`), so a real jsdom
 * render of {@link PreviewPanel} driven by a real iframe preview provider must
 * reach the same DOM states React's panel reaches. A microtask settle replaces
 * React's `act()`; the URL field/iframe remount on a target change is the
 * keyed `Show` over `iframeMountKey` (React's `key`).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'

import { PreviewPanel, type PreviewPanelProps } from '../components/PreviewPanel.jsx'

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

/** The roots this file mounted, disposed after each test. */
const mounted: { dispose: () => void }[] = []

/** Lets the session's queued flush (and Solid's effects) settle on real microtasks. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

/**
 * Advances the fake clock, then settles the session's queued updates.
 *
 * @param ms - Fake-timer milliseconds to advance.
 */
async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

/** A real successful fetch response, as the panel's server-up probe reads it. */
const okResponse = (): Promise<Response> => Promise.resolve(new Response(null, { status: 200 }))

/** A real iframe preview provider already pointed at the preview URL. */
function providerAtUrl(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL })
  provider.setUrl(PREVIEW_URL)
  return provider
}

/**
 * Dispatches an inbound bridge message from the preview iframe (same-origin).
 *
 * @param container - The mount container.
 * @param data - The message payload.
 */
async function postFromPreview(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void> {
  const source = container.querySelector('iframe')?.contentWindow ?? null
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
  await settle()
}

/**
 * Fires the given iframe document's `load` event.
 *
 * @param iframe - The preview iframe.
 */
async function loadIframe(iframe: HTMLIFrameElement): Promise<void> {
  iframe.dispatchEvent(new Event('load'))
  await settle()
}

/**
 * The element carrying the given `data-mol-id`, or null.
 *
 * @param container - The mount container.
 * @param molId - The marker.
 * @returns The element, or null when none is rendered.
 */
const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

/**
 * The overlay element, or null when the preview is revealed.
 *
 * @param container - The mount container.
 * @returns The overlay, or null.
 */
const overlay = (container: HTMLElement): Element | null => q(container, 'preview-overlay')

/** Long enough for the reveal's fade timer (500ms + slack) to finish. */
const REVEALED_MS = 700

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(okResponse))
  vi.useFakeTimers()
})

afterEach(() => {
  for (const mount of mounted.splice(0)) mount.dispose()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Renders the panel over a provider.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @param props - The host-facing props.
 * @returns The mount container.
 */
function mountPanel(
  provider: ReturnType<typeof createProvider>,
  props: PreviewPanelProps = {},
): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <PreviewContext.Provider value={provider}>
        <PreviewPanel {...props} />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose })
  return container
}

/**
 * Mount + drive the server-up poll so the iframe mounts; return handles.
 *
 * @returns The mount container and the iframe.
 */
async function mountWithIframe(): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const container = mountPanel(providerAtUrl())
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { container, iframe }
}

/** Mount, load, confirm a render, and let the reveal fade finish. */
async function mountRendered(): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const handles = await mountWithIframe()
  await loadIframe(handles.iframe)
  await postFromPreview(handles.container, { type: 'molecule:ready' })
  await advance(REVEALED_MS)
  expect(overlay(handles.container)).toBeNull()
  return handles
}

describe('PreviewPanel — handleIframeLoad', () => {
  it('keeps the overlay over a FIRST cold boot (the grace reveals only an app that rendered before)', async () => {
    const { container, iframe } = await mountWithIframe()
    await loadIframe(iframe)
    // Past ONLOAD_GRACE_MS with no molecule:ready: a cold-booting app must NOT
    // be grace-revealed (a white, still-compiling iframe) — the honest status
    // stays, and no accusation has fired yet either.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-load-failed')).toBeNull()
  }, 30_000)

  it('treats a load right after a fresh ready as confirmed (no re-cover flash)', async () => {
    const { container, iframe } = await mountWithIframe()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // A working full-reload mounts the app just BEFORE the load event: the ready
    // is fresh, confirmedContent is KEPT and the reload must not re-cover.
    await loadIframe(iframe)
    await advance(100)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('does not re-reveal through the grace when the app already revealed (grace is a no-op then)', async () => {
    const { container, iframe } = await mountWithIframe()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // The ready is still fresh: the load keeps everything revealed, and the
    // grace timer that armed on this load exits immediately (already ready).
    await loadIframe(iframe)
    await advance(3_200)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('a crash inside the grace window suppresses the grace reveal (a crashed load is not good)', async () => {
    const { container, iframe } = await mountRendered()
    // The app reloaded (fresh document, no ready yet) and then CRASHED.
    await advance(3_000) // past READY_FRESH_MS: the next load is a fresh document
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    // The crash lands inside the debounce, then the grace fires while the
    // crash marker is fresh — the overlay must NOT lift over the crashed app.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)

  it('a raw-document click intent only certifies the load that follows promptly', async () => {
    const { container, iframe } = await mountRendered()
    // The user clicked a raw document link, then the navigation took longer
    // than RAW_DOC_INTENT_MS (a slow server, a detour): the intent is stale.
    await postFromPreview(container, {
      type: 'molecule:navigate',
      url: 'http://localhost:5173/blog/feed.xml',
      isIntent: true,
    })
    await advance(31_000)
    await loadIframe(iframe)
    // No ready follows (the raw doc has no bridge — and the intent expired):
    // the load is unconfirmed content, so the overlay re-covers and the
    // already-rendered app's short blank window accuses it. Stepped advances:
    // the grace re-reveals the reload at 2.5s and its fade makes the evaluator
    // stand down for a beat; stepping gives each state change its own commit
    // boundary, so the re-accusation at ~3.5s is observable.
    for (let i = 0; i < 8; i++) {
      await advance(1_000)
    }
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — stuck detector vs a revealed preview', () => {
  it('a ready that arrives before any load keeps the stuck detector stood down (no reload)', async () => {
    const { container } = await mountWithIframe()
    // No onLoad yet — but the app reports it rendered (an HMR-kept document).
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
    // Past every stuck window: a REVEALED preview is healthy, so the detector
    // must not touch it — the src stays clean (no cache-busted reload).
    await advance(15_000)
    expect(overlay(container)).toBeNull()
    const frame = container.querySelector('iframe')
    if (!frame) throw new Error('the preview iframe never mounted')
    expect(frame.getAttribute('src')).toBe(PREVIEW_URL)
  }, 30_000)
})

describe('PreviewPanel — the absolute ceiling inside a wake window', () => {
  it('re-checks instead of giving up while the woken server is still relaunching', async () => {
    const container = mountPanel(providerAtUrl(), { isBuilding: false, wakeAt: Date.now() })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    // Nothing ever renders and the document never loads — but the wake window
    // (90s) is open: the ceiling's 30s check must defer and keep re-checking
    // rather than surfacing the loop-breaker over a still-relaunching server.
    await advance(42_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
    // …while the honest overlay still covers the not-yet-rendered preview.
    expect(overlay(container)).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — per-load onLoad bookkeeping', () => {
  it('a pending grace timer is dropped the moment the load target changes (not after it fires)', async () => {
    const provider = providerAtUrl()
    const container = mountPanel(provider, { isBuilding: false })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    await loadIframe(iframe)
    // A grace timer is now pending for THIS document (2.5s) when the host
    // retargets the preview: the per-load reset must clear it in the same
    // commit that changes the document — the stale grace may never act.
    provider.setUrl('http://localhost:5173/next/')
    await settle()
    const fresh = container.querySelector('iframe')
    if (!fresh) throw new Error('the retargeted preview iframe never mounted')
    expect(fresh.getAttribute('src')).toContain('/next/')
    // Past the (cleared) grace deadline the fresh cold document stays covered.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).toBeNull()
  }, 30_000)

  it('a FRESH raw-document intent is content: its load cancels the pending grace and reveals', async () => {
    const { container, iframe } = await mountWithIframe()
    await loadIframe(iframe)
    // The shell document's grace is pending when the user clicks a raw doc
    // link; the XML document loads with no bridge — it IS the content, and
    // the (now meaningless) grace must be cancelled, not applied later.
    await postFromPreview(container, {
      type: 'molecule:navigate',
      url: 'http://localhost:5173/blog/feed.xml',
      isIntent: true,
    })
    await loadIframe(iframe)
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  }, 30_000)
})

describe('PreviewPanel — overlay fade', () => {
  it('onTransitionEnd clears the fade immediately (the timer is only the fallback)', async () => {
    const { container, iframe } = await mountWithIframe()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(20)
    // Mid-fade: revealed but the overlay lingers at opacity 0 for the fade.
    const fading = overlay(container)
    expect(fading).not.toBeNull()
    if (!fading) throw new Error('the overlay never rendered')
    fading.dispatchEvent(new Event('transitionend', { bubbles: true }))
    await settle()
    await advance(10)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('a transitionEnd on a SOLID overlay changes nothing (no fade in flight)', async () => {
    const { container, iframe } = await mountWithIframe()
    await loadIframe(iframe)
    // Cold boot: the overlay is fully solid, nothing fading — a stray
    // transitionEnd must be a no-op, not a state change.
    const solid = overlay(container)
    expect(solid).not.toBeNull()
    if (!(solid instanceof HTMLElement)) throw new Error('the overlay never rendered')
    expect(solid.style.opacity).toBe('1')
    solid.dispatchEvent(new Event('transitionend', { bubbles: true }))
    await settle()
    await advance(50)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)
})
