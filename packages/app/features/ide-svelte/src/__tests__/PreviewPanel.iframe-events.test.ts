// @vitest-environment jsdom

/**
 * The iframe's own load event — `handleIframeLoad`. It decides whether a
 * finished document load counts as content: a fresh `molecule:ready` keeps
 * the reveal, a stale one re-covers, a raw-document click intent IS content
 * (but only while fresh), and the onLoad grace reveals ONLY an app that
 * rendered before — and never masks a crash.
 *
 * A port of `@molecule/app-ide-react`'s `PreviewPanel.iframe-events.test.tsx`
 * with the same test names and the same behavioural assertions. A real jsdom
 * render of the Svelte `PreviewPanel` (through the shared
 * `createPreviewPanelSession`), driven by the package's recording live-preview
 * provider. The reveal FADES out over ~500ms (the overlay element lingers at
 * opacity 0 until the fade timer), so "revealed" assertions wait past
 * OVERLAY_FADE_MS.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewProvider } from '@molecule/app-live-preview'

import type { PreviewPanelProps } from '../types.js'
import {
  advance,
  buildPreviewProvider,
  fireFrameLoad,
  installStubClassMap,
  type MountedPanel,
  mountWithIframe,
  postFromPreview,
  PREVIEW_URL,
  q,
} from './preview-panel-harness.js'

/** Long enough for the reveal's fade timer (500ms + slack) to finish. */
const REVEALED_MS = 700

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

beforeEach(() => {
  installStubClassMap()
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

/** The overlay over the preview. */
function overlay(container: HTMLElement): Element | null {
  return q(container, 'preview-overlay')
}

/** Mounts the panel and drives the server-up poll so the iframe mounts. */
async function mountIframe(
  provider: PreviewProvider = buildPreviewProvider(),
  props: PreviewPanelProps = { isBuilding: false },
): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const mounted = await mountWithIframe(provider, props)
  panel = mounted
  return mounted
}

/** Mount, load, confirm a render, and let the reveal fade finish. */
async function mountRendered(): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const handles = await mountIframe()
  fireFrameLoad(handles.iframe)
  postFromPreview({ type: 'molecule:ready' })
  await advance(REVEALED_MS)
  expect(overlay(handles.container)).toBeNull()
  return handles
}

describe('PreviewPanel — handleIframeLoad', () => {
  it('keeps the overlay over a FIRST cold boot (the grace reveals only an app that rendered before)', async () => {
    const { container, iframe } = await mountIframe()
    fireFrameLoad(iframe)
    // Past ONLOAD_GRACE_MS with no molecule:ready: a cold-booting app must NOT
    // be grace-revealed (a white, still-compiling iframe) — the honest status
    // stays, and no accusation has fired yet either.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-load-failed')).toBeNull()
  }, 30_000)

  it('treats a load right after a fresh ready as confirmed (no re-cover flash)', async () => {
    const { container, iframe } = await mountIframe()
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // A working full-reload mounts the app just BEFORE the load event: the ready
    // is fresh, confirmedContent is KEPT and the reload must not re-cover.
    fireFrameLoad(iframe)
    await advance(100)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('does not re-reveal through the grace when the app already revealed (grace is a no-op then)', async () => {
    const { container, iframe } = await mountIframe()
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // The ready is still fresh: the load keeps everything revealed, and the
    // grace timer that armed on this load exits immediately (already ready).
    fireFrameLoad(iframe)
    await advance(3_200)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('a crash inside the grace window suppresses the grace reveal (a crashed load is not good)', async () => {
    const { container, iframe } = await mountRendered()
    // The app reloaded (fresh document, no ready yet) and then CRASHED.
    await advance(3_000) // past READY_FRESH_MS: the next load is a fresh document
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:error', crash: true })
    // The crash lands inside the debounce, then the grace fires while the
    // crash marker is fresh — the overlay must NOT lift over the crashed app.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)

  it('a raw-document click intent only certifies the load that follows promptly', async () => {
    const { container, iframe } = await mountRendered()
    // The user clicked a raw document link, then the navigation took longer
    // than RAW_DOC_INTENT_MS (a slow server, a detour): the intent is stale.
    postFromPreview({
      type: 'molecule:navigate',
      url: 'http://localhost:5173/blog/feed.xml',
      isIntent: true,
    })
    await advance(31_000)
    fireFrameLoad(iframe)
    // No ready follows (the raw doc has no bridge — and the intent expired):
    // the load is unconfirmed content, so the overlay re-covers and the
    // already-rendered app's short blank window accuses it. Stepped advances:
    // the grace re-reveals the reload at 2.5s and its fade makes the evaluator
    // stand down for a beat; stepping gives each state change a flush boundary
    // to commit in, so the re-accusation at ~3.5s is observable.
    for (let i = 0; i < 8; i++) {
      await advance(1_000)
    }
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — stuck detector vs a revealed preview', () => {
  it('a ready that arrives before any load keeps the stuck detector stood down (no reload)', async () => {
    const { container } = await mountIframe()
    // No onLoad yet — but the app reports it rendered (an HMR-kept document).
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
    // Past every stuck window: a REVEALED preview is healthy, so the detector
    // must not touch it — the src stays clean (no cache-busted reload).
    await advance(15_000)
    expect(overlay(container)).toBeNull()
    const frame = container.querySelector('iframe')
    expect(frame?.getAttribute('src')).toBe(PREVIEW_URL)
  }, 30_000)
})

describe('PreviewPanel — the absolute ceiling inside a wake window', () => {
  it('re-checks instead of giving up while the woken server is still relaunching', async () => {
    const mounted = await mountIframe(buildPreviewProvider(), {
      isBuilding: false,
      wakeAt: Date.now(),
    })
    // Nothing ever renders and the document never loads — but the wake window
    // (90s) is open: the ceiling's 30s check must defer and keep re-checking
    // rather than surfacing the loop-breaker over a still-relaunching server.
    await advance(42_000)
    expect(q(mounted.container, 'preview-load-failed')).toBeNull()
    // …while the honest overlay still covers the not-yet-rendered preview.
    expect(overlay(mounted.container)).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — per-load onLoad bookkeeping', () => {
  it('a pending grace timer is dropped the moment the load target changes (not after it fires)', async () => {
    const provider = buildPreviewProvider()
    const { container, iframe } = await mountIframe(provider)
    fireFrameLoad(iframe)
    // A grace timer is now pending for THIS document (2.5s) when the host
    // retargets the preview: the per-load reset must clear it in the same
    // commit that changes the document — the stale grace may never act.
    provider.setUrl('http://localhost:5173/next/')
    await advance(10)
    const fresh = container.querySelector('iframe')
    expect(fresh?.getAttribute('src')).toContain('/next/')
    // Past the (cleared) grace deadline the fresh cold document stays covered.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).toBeNull()
  }, 30_000)

  it('a FRESH raw-document intent is content: its load cancels the pending grace and reveals', async () => {
    const { container, iframe } = await mountIframe()
    fireFrameLoad(iframe)
    // The shell document's grace is pending when the user clicks a raw doc
    // link; the XML document loads with no bridge — it IS the content, and
    // the (now meaningless) grace must be cancelled, not applied later.
    postFromPreview({
      type: 'molecule:navigate',
      url: 'http://localhost:5173/blog/feed.xml',
      isIntent: true,
    })
    fireFrameLoad(iframe)
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  }, 30_000)
})

describe('PreviewPanel — overlay fade', () => {
  it('onTransitionEnd clears the fade immediately (the timer is only the fallback)', async () => {
    const { container, iframe } = await mountIframe()
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(20)
    // Mid-fade: revealed but the overlay lingers at opacity 0 for the fade.
    const fading = overlay(container)
    expect(fading).not.toBeNull()
    fading?.dispatchEvent(new Event('transitionend'))
    await advance(10)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('a transitionEnd on a SOLID overlay changes nothing (no fade in flight)', async () => {
    const { container, iframe } = await mountIframe()
    fireFrameLoad(iframe)
    // Cold boot: the overlay is fully solid, nothing fading — a stray
    // transitionEnd must be a no-op, not a state change.
    const solid = overlay(container)
    if (!(solid instanceof HTMLElement)) throw new Error('the preview overlay is not an element')
    expect(solid.style.opacity).toBe('1')
    solid.dispatchEvent(new Event('transitionend'))
    await advance(50)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)
})
