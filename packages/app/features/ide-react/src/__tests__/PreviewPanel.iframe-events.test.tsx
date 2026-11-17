// @vitest-environment jsdom

/**
 * The iframe's own load event — `handleIframeLoad`. It decides whether a
 * finished document load counts as content: a fresh `molecule:ready` keeps
 * the reveal, a stale one re-covers, a raw-document click intent IS content
 * (but only while fresh), and the onLoad grace reveals ONLY an app that
 * rendered before — and never masks a crash. (An iframe has no error event
 * to handle: browsers do not fire one for a failed load, and React 19 attaches
 * no error listener to iframes.) The reveal FADES out over ~500ms (the
 * overlay element lingers at opacity 0 until the fade timer), so "revealed"
 * assertions wait past OVERLAY_FADE_MS.
 *
 * @module
 */

import { act, cleanup, fireEvent, render } from '@testing-library/react'
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

/** Wrap children with the i18n + preview context PreviewPanel needs. */
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
  const source = document.querySelector('iframe')?.contentWindow ?? null
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
  })
}

const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

const overlay = (container: HTMLElement): Element | null => q(container, 'preview-overlay')

const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

/** Long enough for the reveal's fade timer (500ms + slack) to finish. */
const REVEALED_MS = 700

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true } as Response)),
  )
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Mount + drive the server-up poll so the iframe mounts; return handles. */
async function mountPanel(): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const { container } = render(
    <Wrap provider={providerAtUrl()}>
      <PreviewPanel isBuilding={false} />
    </Wrap>,
  )
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe') as HTMLIFrameElement
  expect(iframe).not.toBeNull()
  return { container, iframe }
}

/** Mount, load, confirm a render, and let the reveal fade finish. */
async function mountRendered(): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const handles = await mountPanel()
  await act(async () => {
    fireEvent.load(handles.iframe)
  })
  postFromPreview({ type: 'molecule:ready' })
  await advance(REVEALED_MS)
  expect(overlay(handles.container)).toBeNull()
  return handles
}

describe('PreviewPanel — handleIframeLoad', () => {
  it('keeps the overlay over a FIRST cold boot (the grace reveals only an app that rendered before)', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    // Past ONLOAD_GRACE_MS with no molecule:ready: a cold-booting app must NOT
    // be grace-revealed (a white, still-compiling iframe) — the honest status
    // stays, and no accusation has fired yet either.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-load-failed')).toBeNull()
  }, 30_000)

  it('treats a load right after a fresh ready as confirmed (no re-cover flash)', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // A working full-reload mounts React just BEFORE the load event: the ready
    // is fresh, confirmedContent is KEPT and the reload must not re-cover.
    await act(async () => {
      fireEvent.load(iframe)
    })
    await advance(100)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('does not re-reveal through the grace when the app already revealed (grace is a no-op then)', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // The ready is still fresh: the load keeps everything revealed, and the
    // grace timer that armed on this load exits immediately (already ready).
    await act(async () => {
      fireEvent.load(iframe)
    })
    await advance(3_200)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('a crash inside the grace window suppresses the grace reveal (a crashed load is not good)', async () => {
    const { container, iframe } = await mountRendered()
    // The app reloaded (fresh document, no ready yet) and then CRASHED.
    await advance(3_000) // past READY_FRESH_MS: the next load is a fresh document
    await act(async () => {
      fireEvent.load(iframe)
    })
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
    await act(async () => {
      fireEvent.load(iframe)
    })
    // No ready follows (the raw doc has no bridge — and the intent expired):
    // the load is unconfirmed content, so the overlay re-covers and the
    // already-rendered app's short blank window accuses it. Stepped advances:
    // the grace re-reveals the reload at 2.5s and its fade makes the evaluator
    // stand down for a beat; stepping gives each state change an act()
    // boundary to commit in, so the re-accusation at ~3.5s is observable.
    for (let i = 0; i < 8; i++) {
      await advance(1_000)
    }
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — stuck detector vs a revealed preview', () => {
  it('a ready that arrives before any load keeps the stuck detector stood down (no reload)', async () => {
    const { container } = await mountPanel()
    // No onLoad yet — but the app reports it rendered (an HMR-kept document).
    postFromPreview({ type: 'molecule:ready' })
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
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} wakeAt={Date.now()} />
      </Wrap>,
    )
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
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await act(async () => {
      fireEvent.load(iframe)
    })
    // A grace timer is now pending for THIS document (2.5s) when the host
    // retargets the preview: the per-load reset must clear it in the same
    // commit that changes the document — the stale grace may never act.
    await act(async () => {
      provider.setUrl('http://localhost:5173/next/')
    })
    const fresh = container.querySelector('iframe') as HTMLIFrameElement
    expect(fresh.getAttribute('src')).toContain('/next/')
    // Past the (cleared) grace deadline the fresh cold document stays covered.
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    expect(q(container, 'preview-blank-notice')).toBeNull()
  }, 30_000)

  it('a FRESH raw-document intent is content: its load cancels the pending grace and reveals', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    // The shell document's grace is pending when the user clicks a raw doc
    // link; the XML document loads with no bridge — it IS the content, and
    // the (now meaningless) grace must be cancelled, not applied later.
    postFromPreview({
      type: 'molecule:navigate',
      url: 'http://localhost:5173/blog/feed.xml',
      isIntent: true,
    })
    await act(async () => {
      fireEvent.load(iframe)
    })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  }, 30_000)
})

describe('PreviewPanel — overlay fade', () => {
  it('onTransitionEnd clears the fade immediately (the timer is only the fallback)', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(20)
    // Mid-fade: revealed but the overlay lingers at opacity 0 for the fade.
    expect(overlay(container)).not.toBeNull()
    fireEvent.transitionEnd(overlay(container) as Element)
    await advance(10)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('a transitionEnd on a SOLID overlay changes nothing (no fade in flight)', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    // Cold boot: the overlay is fully solid, nothing fading — a stray
    // transitionEnd must be a no-op, not a state change.
    const solid = overlay(container) as HTMLElement
    expect(solid.style.opacity).toBe('1')
    fireEvent.transitionEnd(solid)
    await advance(50)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)
})
