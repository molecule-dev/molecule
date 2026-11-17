// @vitest-environment jsdom

/**
 * The `molecule:*` message bridge — the trust gate, crash/error forwarding, the
 * ready/error rate limits, cycle suppression, batch caps and the snapshot size
 * cap. Every inbound message the controller will own flows through this one
 * handler, so each rule here is pinned by driving the real handler with real
 * `MessageEvent`s whose `source` is the preview iframe's own window (the trust
 * gate) — or deliberately something else, for the gate itself.
 *
 * The reveal FADES out over ~500ms (the overlay element lingers at opacity 0
 * until the fade timer), so "revealed" assertions wait past OVERLAY_FADE_MS
 * rather than asserting the instant the ready lands.
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

import { isRawDocumentUrl, PreviewPanel } from '../components/PreviewPanel.js'

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

/**
 * Simulate an inbound bridge message from the preview iframe (same-origin).
 * `source` MUST be the iframe's own contentWindow — the panel's trust gate.
 */
function postFromPreview(data: Record<string, unknown>): void {
  const source = document.querySelector('iframe')?.contentWindow ?? null
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
  })
}

/** A message from a window that is NOT the preview iframe — must be ignored. */
function postFromForeignWindow(data: Record<string, unknown>): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', { data, origin: 'https://evil.example', source: window }),
    )
  })
}

const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

const overlay = (container: HTMLElement): Element | null => q(container, 'preview-overlay')

/** Advance fake timers inside act() so React commits before assertions. */
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

/** Mount + drive the server-up poll so the iframe mounts; return panel handles. */
async function mountPanel(props?: {
  onPreviewError?: (errors: Array<{ message: string }>) => void
}): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const { container } = render(
    <Wrap provider={providerAtUrl()}>
      <PreviewPanel isBuilding={false} onPreviewError={props?.onPreviewError} />
    </Wrap>,
  )
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe') as HTMLIFrameElement
  expect(iframe).not.toBeNull()
  return { container, iframe }
}

describe('PreviewPanel — bridge trust gate (source-window identity)', () => {
  it('ignores a molecule:ready from any window that is not the preview iframe', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    // A malicious sub-iframe (or another tab) posting the handshake must not
    // lift the overlay — only the preview iframe's OWN window may speak.
    postFromForeignWindow({ type: 'molecule:ready' })
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    // …while the genuine one still reveals.
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  }, 30_000)
})

describe('PreviewPanel — crash forwarding (molecule:error crash)', () => {
  it('re-covers the preview once the crash debounce lands', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
    // The crash debounces 300ms so HMR recovery can settle…
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(100)
    expect(overlay(container)).toBeNull()
    // …then the overlay comes back over the crashed app.
    await advance(400)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)

  it('cancels the crash entirely when a ready lands inside the debounce window', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // Crash, then HMR recovers within 300ms: the pending crash timer must be
    // cancelled by the ready — a working app is never re-covered.
    postFromPreview({ type: 'molecule:error', crash: true })
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)
    expect(overlay(container)).toBeNull()
  }, 30_000)
})

describe('PreviewPanel — ready rate limit', () => {
  it('drops a duplicate ready inside MSG_RATE_LIMIT_MS (a stale lastReadyAt must not certify a later load)', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' }) // accepted at t=0
    await advance(50)
    postFromPreview({ type: 'molecule:ready' }) // t=50: duplicate — dropped
    await advance(1_500)
    // A document reload at t=1550: the only ACCEPTED ready is 1550ms old, past
    // READY_FRESH_MS (1500), so the reload is unconfirmed and re-covered. (If
    // the duplicate had refreshed lastReadyAt to t=50, the load would read
    // exactly 1500ms — fresh — and keep the reveal.)
    await act(async () => {
      fireEvent.load(iframe)
    })
    await advance(60)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — rapid ready/error cycle suppression', () => {
  it('suppresses the oscillation, drops later toggles, then recovers after the window', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    // A render loop: 10 ready toggles inside the 5s window. The first is
    // accepted (reveals); the rate limit drops the middle ones; the 10th
    // transition engages suppression.
    for (let i = 0; i < 10; i++) {
      postFromPreview({ type: 'molecule:ready' })
    }
    await advance(50)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('Rapid ready/error cycle')
    // Suppressed: a crash inside the storm is dropped — no re-cover.
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(700)
    expect(overlay(container)).toBeNull()
    // …and so is a ready (the suppression gate in the ready handler): a blank
    // report re-covers the app, and the suppressed ready cannot lift it.
    postFromPreview({ type: 'molecule:blank' })
    await advance(100)
    expect(overlay(container)).not.toBeNull()
    postFromPreview({ type: 'molecule:ready' })
    await advance(100)
    expect(overlay(container)).not.toBeNull()
    // The suppression is a bounded window, not a kill switch: past it, a crash
    // is honored again (the auto-recover reset re-arms the bridge)…
    await advance(5_100)
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(700)
    expect(overlay(container)).not.toBeNull()
    // …and so is a ready.
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  }, 30_000)

  it('engages the SAME suppression when the oscillation is driven by crashes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // 8 more transitions (readies are rate-limited but still COUNT), then the
    // 10th transition arrives as a crash — the crash branch's own suppression
    // engages and the crash is dropped, so the reveal survives.
    for (let i = 0; i < 8; i++) {
      postFromPreview({ type: 'molecule:ready' })
    }
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(700)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(overlay(container)).toBeNull()
    // A second crash while suppressed is dropped too.
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(700)
    expect(overlay(container)).toBeNull()
    // After the window: crash #3 is accepted (debounced) and a rapid crash
    // #4 inside MSG_RATE_LIMIT_MS is rate-limited away — the app still
    // re-covers exactly once.
    await advance(5_100)
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(100)
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(700)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — pre-render error batching (molecule:error / runtime-error)', () => {
  it('caps one batch at five errors and forwards it once', async () => {
    const onPreviewError = vi.fn()
    await mountPanel({ onPreviewError })
    for (let i = 1; i <= 6; i++) {
      postFromPreview({ type: 'molecule:error', message: `failure ${i}` })
    }
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0]).toHaveLength(5)
    expect(onPreviewError.mock.calls[0][0].map((e: { message: string }) => e.message)).toEqual([
      'failure 1',
      'failure 2',
      'failure 3',
      'failure 4',
      'failure 5',
    ])
  }, 30_000)

  it('labels a pre-render error without a source and keeps distinct signatures in one batch', async () => {
    const onPreviewError = vi.fn()
    await mountPanel({ onPreviewError })
    postFromPreview({ type: 'molecule:error', message: 'missing export' })
    postFromPreview({ type: 'molecule:runtime-error', message: 'x is not defined' })
    postFromPreview({ type: 'molecule:runtime-error', message: 'y is not a function' })
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    const batch = onPreviewError.mock.calls[0][0]
    expect(batch).toHaveLength(3)
    expect(batch[0]).toMatchObject({ message: 'missing export', source: 'pre-render' })
    expect(batch[1]).toMatchObject({ message: 'x is not defined' })
  }, 30_000)

  it('forwards the same signature again once the dedup window has passed', async () => {
    const onPreviewError = vi.fn()
    await mountPanel({ onPreviewError })
    const err = { type: 'molecule:runtime-error' as const, message: 'same fault' }
    postFromPreview(err)
    await advance(2_100) // first flush
    postFromPreview(err) // still inside the dedup window — dropped
    await advance(2_100)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    await advance(2_100) // now past ERROR_DEDUP_WINDOW_MS since the first sighting
    postFromPreview(err)
    await advance(2_100)
    expect(onPreviewError).toHaveBeenCalledTimes(2)
    // The ledger is BOUNDED: a distinct error ages out of the window, so the
    // re-forward also prunes it (a long session of distinct faults cannot grow
    // the ledger forever).
    const other = { type: 'molecule:runtime-error' as const, message: 'unrelated fault' }
    await advance(4_200)
    postFromPreview(other)
    await advance(2_100)
    expect(onPreviewError).toHaveBeenCalledTimes(3)
    expect(onPreviewError.mock.calls[2][0]).toHaveLength(1)
  }, 30_000)

  it('labels a runtime error with no message as unknown', async () => {
    const onPreviewError = vi.fn()
    await mountPanel({ onPreviewError })
    postFromPreview({ type: 'molecule:runtime-error' })
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0][0]).toMatchObject({ message: 'Unknown error' })
  }, 30_000)

  it('ignores an error with neither crash nor message', async () => {
    const onPreviewError = vi.fn()
    await mountPanel({ onPreviewError })
    postFromPreview({ type: 'molecule:error' })
    await advance(2_500)
    expect(onPreviewError).not.toHaveBeenCalled()
  }, 30_000)

  it('queues errors safely with no onPreviewError callback bound', async () => {
    const { container } = await mountPanel()
    postFromPreview({ type: 'molecule:error', message: 'no host listening' })
    await advance(2_500)
    // The flush ran with no callback bound and no error escaped; the panel is
    // still mounted and reactive.
    expect(container.querySelector('iframe')).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — molecule:viewport (a spec-driven size request is clamped, not trusted)', () => {
  it('clamps into the panel bounds and a zero size hands the frame back', async () => {
    const { iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)
    // Far too small: clamped UP to the usable floor…
    postFromPreview({ type: 'molecule:viewport', width: 1, height: 1 })
    await advance(50)
    expect(iframe.style.width).toBe('120px')
    expect(iframe.style.height).toBe('120px')
    // …far too large: clamped DOWN to the panel bound.
    postFromPreview({ type: 'molecule:viewport', width: 99_999, height: 99_999 })
    await advance(50)
    expect(iframe.style.width).toBe('4000px')
    expect(iframe.style.height).toBe('4000px')
    // A zero/NaN size means "stop overriding" — the frame returns to the
    // selected device (the fluid default fills the area).
    postFromPreview({ type: 'molecule:viewport', width: 0, height: 0 })
    await advance(50)
    expect(iframe.style.width).toBe('100%')
    postFromPreview({ type: 'molecule:viewport', width: 'NaN', height: 'NaN' })
    await advance(50)
    expect(iframe.style.width).toBe('100%')
  }, 30_000)
})

describe('PreviewPanel — ui-result and navigate payload validation', () => {
  it('ignores a ui-result whose id is not a string', async () => {
    const onUiResult = vi.fn()
    const provider = providerAtUrl()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} onUiResult={onUiResult} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    postFromPreview({ type: 'molecule:ui-result', id: 42, ok: true })
    await advance(50)
    expect(onUiResult).not.toHaveBeenCalled()
  }, 30_000)

  it('ignores a navigate whose url is not a string', async () => {
    const provider = providerAtUrl()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const before = provider.getState().currentUrl
    postFromPreview({ type: 'molecule:navigate', url: 12345 })
    await advance(100)
    // A garbage url is not a navigation: the reported location never moved.
    expect(provider.getState().currentUrl).toBe(before)
  }, 30_000)

  it('unmounts cleanly with an error batch still debouncing', async () => {
    const onPreviewError = vi.fn()
    const view = render(
      <Wrap provider={providerAtUrl()}>
        <PreviewPanel isBuilding={false} onPreviewError={onPreviewError} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !view.container.querySelector('iframe'); i++) {
      await advance(50)
    }
    // An error arrives and its 2s debounce timer is pending when the panel
    // goes away — the cleanup must clear it with no callback escaping.
    postFromPreview({ type: 'molecule:error', message: 'dying batch' })
    view.unmount()
    await advance(3_000)
    expect(onPreviewError).not.toHaveBeenCalled()
  }, 30_000)
})

describe('PreviewPanel — URL bar commit edges', () => {
  /** The address input. */
  const urlInput = (container: HTMLElement): HTMLInputElement =>
    container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement

  /** The wrapping address field carries the focus ring. */
  const urlField = (container: HTMLElement): HTMLElement =>
    container.querySelector('[data-mol-id="preview-url-field"]') as HTMLElement

  it('an Enter on a whitespace-only draft navigates nowhere and blurring ends editing', async () => {
    const provider = providerAtUrl()
    const loadNonceBefore = provider.getState().loadNonce
    const view = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !view.container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const input = urlInput(view.container)
    // Focus lights the ring (editing)…
    fireEvent.focus(input)
    expect(urlField(view.container).style.boxShadow).toContain('var(')
    // …a blank draft commits nothing…
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(provider.getState().url).toBe(PREVIEW_URL)
    expect(provider.getState().loadNonce).toBe(loadNonceBefore)
    // …and blur closes editing (the ring goes away).
    fireEvent.blur(input)
    expect(urlField(view.container).style.boxShadow).not.toContain('var(')
  }, 30_000)

  it('Escape restores the live location instead of the draft', async () => {
    const provider = providerAtUrl()
    const view = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !view.container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const input = urlInput(view.container)
    fireEvent.change(input, { target: { value: 'http://typo.example/' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    await advance(50)
    // The draft is discarded in favor of the preview's real location.
    expect(urlInput(view.container).value).toBe(provider.getState().currentUrl)
  }, 30_000)
})

describe('PreviewPanel — molecule:snapshot size cap', () => {
  it('ignores an image snapshot beyond MAX_SNAPSHOT_DATA_URL_LENGTH', async () => {
    const { container, iframe } = await mountPanel()
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    const huge = `data:image/png;base64,${'A'.repeat(4_000_001)}`
    postFromPreview({ type: 'molecule:snapshot', dataUrl: huge })
    postFromPreview({ type: 'molecule:blank' })
    await advance(100)
    // The oversized frame is refused at the trust boundary…
    expect(q(container, 'preview-last-frame')).toBeNull()
    // …while a valid small frame stands in behind the overlay.
    postFromPreview({ type: 'molecule:snapshot', dataUrl: 'data:image/png;base64,AAAA' })
    postFromPreview({ type: 'molecule:blank' })
    await advance(100)
    expect(q(container, 'preview-last-frame')).not.toBeNull()
  }, 30_000)
})

describe('isRawDocumentUrl', () => {
  it('classifies raw documents by path extension', () => {
    expect(isRawDocumentUrl('https://example.com/feed.xml')).toBe(true)
    expect(isRawDocumentUrl('https://example.com/a/b/provenance.JSON')).toBe(true)
    expect(isRawDocumentUrl('https://example.com/llms.txt?cache=1')).toBe(true)
    expect(isRawDocumentUrl('https://example.com/blog/')).toBe(false)
    expect(isRawDocumentUrl('https://example.com/app.vite/page')).toBe(false)
    expect(isRawDocumentUrl('https://example.com/.hidden')).toBe(false)
    expect(isRawDocumentUrl('definitely not a url')).toBe(false)
  })
})
