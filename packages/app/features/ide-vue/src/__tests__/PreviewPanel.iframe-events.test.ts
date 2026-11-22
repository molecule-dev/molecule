// @vitest-environment jsdom

/**
 * The iframe's own load event — `handleIframeLoad`. It decides whether a
 * finished document load counts as content: a fresh `molecule:ready` keeps
 * the reveal, a stale one re-covers, a raw-document click intent IS content
 * (but only while fresh), and the onLoad grace reveals ONLY an app that
 * rendered before — and never masks a crash. The reveal FADES out over ~500ms
 * (the overlay element lingers at opacity 0 until the fade timer), so
 * "revealed" assertions wait past OVERLAY_FADE_MS.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.iframe-events.test.tsx`
 * with the same test names and the same assertions: the Vue panel is a view over
 * the same shared behaviour (`createPreviewPanelSession`), so the same inputs
 * must reach the same DOM states React's panel reaches. The deferred-microtask
 * advance below reproduces what React's `act(async …)` batching produces.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  type MountedPanel,
  mountPanel,
  postFromPreview,
  PREVIEW_URL,
  providerAtUrl,
  q,
  settle,
} from './preview-panel-harness.js'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/** Long enough for the reveal's fade timer (500ms + slack) to finish. */
const REVEALED_MS = 700

/**
 * Advances the fake clock the way React's `act()` defers its renders: the
 * session's own renders (queued on `queueMicrotask`) are held for the whole
 * advance and released as ONE batch at the end, while the promises the probes
 * await still settle inside it.
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once the held batch rendered.
 */
async function advance(ms: number): Promise<void> {
  const held: Array<() => void> = []
  const realQueueMicrotask = globalThis.queueMicrotask
  globalThis.queueMicrotask = (callback: VoidFunction): void => {
    held.push(callback)
  }
  try {
    await vi.advanceTimersByTimeAsync(ms)
    await settle()
  } finally {
    globalThis.queueMicrotask = realQueueMicrotask
  }
  for (const callback of held) callback()
  await settle()
}

/**
 * Mounts the panel over a provider and tracks it for teardown.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @param initial - The host-facing props.
 * @returns The mounted panel.
 */
function mount(
  provider: ReturnType<typeof providerAtUrl>,
  initial: Parameters<typeof mountPanel>[1] = { isBuilding: false },
): MountedPanel {
  const panel = mountPanel(provider, initial)
  mounted.push(panel)
  return panel
}

/**
 * Fires the iframe document's `load` event.
 *
 * @param iframe - The preview iframe.
 * @returns Resolves once the view re-rendered.
 */
async function load(iframe: HTMLIFrameElement): Promise<void> {
  iframe.dispatchEvent(new Event('load'))
  await settle()
}

/**
 * Mount + drive the server-up poll so the iframe mounts; return the panel.
 *
 * @param initial - The host-facing props.
 * @param provider - The live-preview provider.
 * @returns The mounted panel.
 */
async function mountPanelWithIframe(
  initial: Parameters<typeof mountPanel>[1] = { isBuilding: false },
  provider: ReturnType<typeof providerAtUrl> = providerAtUrl(),
): Promise<MountedPanel> {
  const panel = mount(provider, initial)
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  expect(panel.container.querySelector('iframe')).not.toBeNull()
  return panel
}

/**
 * Mount, load, confirm a render, and let the reveal fade finish.
 *
 * @returns The mounted panel and its iframe.
 */
async function mountRendered(): Promise<{
  panel: MountedPanel
  container: HTMLElement
  iframe: HTMLIFrameElement
}> {
  const panel = await mountPanelWithIframe()
  const iframe = panel.container.querySelector('iframe') as HTMLIFrameElement
  await load(iframe)
  await postFromPreview(panel.container, { type: 'molecule:ready' })
  await advance(REVEALED_MS)
  expect(q(panel.container, 'preview-overlay')).toBeNull()
  return { panel, container: panel.container, iframe }
}

/** The overlay element, or null when the preview is revealed. */
const overlay = (container: HTMLElement): Element | null => q(container, 'preview-overlay')

beforeEach(() => {
  setClassMap(classMap)
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => ({ ok: true, status: 200 }) as Response),
  )
  vi.useFakeTimers()
})

afterEach(() => {
  for (const panel of mounted.splice(0)) panel.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PreviewPanel — handleIframeLoad', () => {
  it('keeps the overlay over a FIRST cold boot (the grace reveals only an app that rendered before)', async () => {
    const { container } = await mountPanelWithIframe()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await load(iframe)
    // Past the onLoad grace with no molecule:ready: a cold-booting app must NOT
    // be grace-revealed (a white, still-compiling iframe) — the honest status
    // stays, and no accusation has fired yet either.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-load-failed')).toBeNull()
  }, 30_000)

  it('treats a load right after a fresh ready as confirmed (no re-cover flash)', async () => {
    const { container } = await mountPanelWithIframe()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await load(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // A working full-reload mounts the app just BEFORE the load event: the ready
    // is fresh, confirmedContent is KEPT and the reload must not re-cover.
    await load(iframe)
    await advance(100)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('does not re-reveal through the grace when the app already revealed (grace is a no-op then)', async () => {
    const { container } = await mountPanelWithIframe()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await load(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // The ready is still fresh: the load keeps everything revealed, and the
    // grace timer that armed on this load exits immediately (already ready).
    await load(iframe)
    await advance(3_200)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('a crash inside the grace window suppresses the grace reveal (a crashed load is not good)', async () => {
    const { container } = await mountRendered()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    // The app reloaded (fresh document, no ready yet) and then CRASHED.
    await advance(3_000) // past the ready-fresh window: the next load is a fresh document
    await load(iframe)
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    // The crash lands inside the debounce, then the grace fires while the
    // crash marker is fresh — the overlay must NOT lift over the crashed app.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)

  it('a raw-document click intent only certifies the load that follows promptly', async () => {
    const { container } = await mountRendered()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    // The user clicked a raw document link, then the navigation took longer
    // than the raw-document intent window (a slow server, a detour): the
    // intent is stale.
    await postFromPreview(container, {
      type: 'molecule:navigate',
      url: 'http://localhost:5173/blog/feed.xml',
      isIntent: true,
    })
    await advance(31_000)
    await load(iframe)
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
    const { container } = await mountPanelWithIframe()
    // No onLoad yet — but the app reports it rendered (an HMR-kept document).
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
    // Past every stuck window: a REVEALED preview is healthy, so the detector
    // must not touch it — the src stays clean (no cache-busted reload).
    await advance(15_000)
    expect(overlay(container)).toBeNull()
    const src = (container.querySelector('iframe') as HTMLIFrameElement).getAttribute('src')
    expect(src).toBe(PREVIEW_URL)
  }, 30_000)
})

describe('PreviewPanel — the absolute ceiling inside a wake window', () => {
  it('re-checks instead of giving up while the woken server is still relaunching', async () => {
    const provider = providerAtUrl()
    const { container } = await mountPanelWithIframe(
      { isBuilding: false, wakeAt: Date.now() },
      provider,
    )
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
    const { container } = await mountPanelWithIframe({ isBuilding: false }, provider)
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await load(iframe)
    // A grace timer is now pending for THIS document (2.5s) when the host
    // retargets the preview: the per-load reset must clear it in the same
    // commit that changes the document — the stale grace may never act.
    provider.setUrl('http://localhost:5173/next/')
    await settle()
    const fresh = container.querySelector('iframe') as HTMLIFrameElement
    expect(fresh.getAttribute('src')).toContain('/next/')
    // Past the (cleared) grace deadline the fresh cold document stays covered.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).toBeNull()
  }, 30_000)

  it('a FRESH raw-document intent is content: its load cancels the pending grace and reveals', async () => {
    const { container } = await mountPanelWithIframe()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await load(iframe)
    // The shell document's grace is pending when the user clicks a raw doc
    // link; the XML document loads with no bridge — it IS the content, and
    // the (now meaningless) grace must be cancelled, not applied later.
    await postFromPreview(container, {
      type: 'molecule:navigate',
      url: 'http://localhost:5173/blog/feed.xml',
      isIntent: true,
    })
    await load(iframe)
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  }, 30_000)
})

describe('PreviewPanel — overlay fade', () => {
  it('onTransitionEnd clears the fade immediately (the timer is only the fallback)', async () => {
    const { container } = await mountPanelWithIframe()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await load(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(20)
    // Mid-fade: revealed but the overlay lingers at opacity 0 for the fade.
    expect(overlay(container)).not.toBeNull()
    ;(overlay(container) as Element).dispatchEvent(new Event('transitionend'))
    await advance(10)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('a transitionEnd on a SOLID overlay changes nothing (no fade in flight)', async () => {
    const { container } = await mountPanelWithIframe()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await load(iframe)
    // Cold boot: the overlay is fully solid, nothing fading — a stray
    // transitionEnd must be a no-op, not a state change.
    const solid = overlay(container) as HTMLElement
    expect(solid.style.opacity).toBe('1')
    solid.dispatchEvent(new Event('transitionend'))
    await advance(50)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)
})
