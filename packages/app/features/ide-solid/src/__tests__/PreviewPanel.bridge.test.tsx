// @vitest-environment jsdom

/**
 * The `molecule:*` message bridge — the trust gate, crash/error forwarding, the
 * ready/error rate limits, cycle suppression, batch caps and the snapshot size
 * cap. Every inbound message the controller will own flows through this one
 * handler, so each rule here is pinned by driving the real handler with real
 * `MessageEvent`s whose `source` is the preview iframe's own window (the trust
 * gate) — or deliberately something else, for the gate itself.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.bridge.test.tsx`
 * with the same test names and the same assertions: the Solid panel is a view
 * over the same shared behaviour (`createPreviewPanelSession`), so a real jsdom
 * render of {@link PreviewPanel} driven by a real iframe preview provider must
 * reach the same DOM states React's panel reaches. A microtask settle replaces
 * React's `act()`; inbound bridge messages are dispatched as same-origin
 * `MessageEvent`s (the panel verifies the source window).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewUiResult } from '@molecule/app-ide-panel-logic'
import type { PreviewErrorReport } from '@molecule/app-ide-panel-logic/panels'
import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'

import {
  isRawDocumentUrl,
  PreviewPanel,
  type PreviewPanelProps,
} from '../components/PreviewPanel.jsx'

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

/** The roots this file mounted, disposed after each test. */
const mounted: { dispose: () => void }[] = []

/** A real iframe preview provider already pointed at the preview URL. */
function providerAtUrl(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL })
  provider.setUrl(PREVIEW_URL)
  return provider
}

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

/**
 * Simulate an inbound bridge message from the preview iframe (same-origin).
 * `source` MUST be the iframe's own contentWindow — the panel's trust gate.
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
 * A message from a window that is NOT the preview iframe — must be ignored.
 *
 * @param data - The message payload.
 */
async function postFromForeignWindow(data: Record<string, unknown>): Promise<void> {
  window.dispatchEvent(
    new MessageEvent('message', { data, origin: 'https://evil.example', source: window }),
  )
  await settle()
}

/**
 * Fires the iframe document's `load` event.
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

/** A real successful fetch response, as the panel's server-up probe reads it. */
const okResponse = (): Promise<Response> => Promise.resolve(new Response(null, { status: 200 }))

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
 * Mounts the panel over a provider and drives the server-up poll so the iframe mounts.
 *
 * @param props - The host-facing props.
 * @param provider - The live-preview provider to drive the panel.
 * @returns The container and the mounted iframe.
 */
async function mountPanel(
  props: PreviewPanelProps = {},
  provider: PreviewProvider = providerAtUrl(),
): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
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
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { container, iframe }
}

describe('PreviewPanel — bridge trust gate (source-window identity)', () => {
  it('ignores a molecule:ready from any window that is not the preview iframe', async () => {
    const { container, iframe } = await mountPanel()
    await loadIframe(iframe)
    // A malicious sub-iframe (or another tab) posting the handshake must not
    // lift the overlay — only the preview iframe's OWN window may speak.
    await postFromForeignWindow({ type: 'molecule:ready' })
    await advance(3_200)
    expect(overlay(container)).not.toBeNull()
    // …while the genuine one still reveals.
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  })
})

describe('PreviewPanel — crash forwarding (molecule:error crash)', () => {
  it('re-covers the preview once the crash debounce lands', async () => {
    const { container, iframe } = await mountPanel()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
    // The crash debounces 300ms so HMR recovery can settle…
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(100)
    expect(overlay(container)).toBeNull()
    // …then the overlay comes back over the crashed app.
    await advance(400)
    expect(overlay(container)).not.toBeNull()
  })

  it('cancels the crash entirely when a ready lands inside the debounce window', async () => {
    const { container, iframe } = await mountPanel()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // Crash, then HMR recovers within 300ms: the pending crash timer must be
    // cancelled by the ready — a working app is never re-covered.
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)
    expect(overlay(container)).toBeNull()
  })
})

describe('PreviewPanel — ready rate limit', () => {
  it('drops a duplicate ready inside MSG_RATE_LIMIT_MS (a stale lastReadyAt must not certify a later load)', async () => {
    const { container, iframe } = await mountPanel()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' }) // accepted at t=0
    await advance(50)
    await postFromPreview(container, { type: 'molecule:ready' }) // t=50: duplicate — dropped
    await advance(1_500)
    // A document reload at t=1550: the only ACCEPTED ready is 1550ms old, past
    // READY_FRESH_MS (1500), so the reload is unconfirmed and re-covered. (If
    // the duplicate had refreshed lastReadyAt to t=50, the load would read
    // exactly 1500ms — fresh — and keep the reveal.)
    await loadIframe(iframe)
    await advance(60)
    expect(overlay(container)).not.toBeNull()
  })
})

describe('PreviewPanel — rapid ready/error cycle suppression', () => {
  it('suppresses the oscillation, drops later toggles, then recovers after the window', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, iframe } = await mountPanel()
    await loadIframe(iframe)
    // A render loop: 10 ready toggles inside the 5s window. The first is
    // accepted (reveals); the rate limit drops the middle ones; the 10th
    // transition engages suppression.
    for (let i = 0; i < 10; i++) {
      await postFromPreview(container, { type: 'molecule:ready' })
    }
    await advance(50)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('Rapid ready/error cycle')
    // Suppressed: a crash inside the storm is dropped — no re-cover.
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(700)
    expect(overlay(container)).toBeNull()
    // …and so is a ready (the suppression gate in the ready handler): a blank
    // report re-covers the app, and the suppressed ready cannot lift it.
    await postFromPreview(container, { type: 'molecule:blank' })
    await advance(100)
    expect(overlay(container)).not.toBeNull()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(100)
    expect(overlay(container)).not.toBeNull()
    // The suppression is a bounded window, not a kill switch: past it, a crash
    // is honored again (the auto-recover reset re-arms the bridge)…
    await advance(5_100)
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(700)
    expect(overlay(container)).not.toBeNull()
    // …and so is a ready.
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  })

  it('engages the SAME suppression when the oscillation is driven by crashes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, iframe } = await mountPanel()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    // 8 more transitions (readies are rate-limited but still COUNT), then the
    // 10th transition arrives as a crash — the crash branch's own suppression
    // engages and the crash is dropped, so the reveal survives.
    for (let i = 0; i < 8; i++) {
      await postFromPreview(container, { type: 'molecule:ready' })
    }
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(700)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(overlay(container)).toBeNull()
    // A second crash while suppressed is dropped too.
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(700)
    expect(overlay(container)).toBeNull()
    // After the window: crash #3 is accepted (debounced) and a rapid crash
    // #4 inside MSG_RATE_LIMIT_MS is rate-limited away — the app still
    // re-covers exactly once.
    await advance(5_100)
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(100)
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(700)
    expect(overlay(container)).not.toBeNull()
  })
})

describe('PreviewPanel — pre-render error batching (molecule:error / runtime-error)', () => {
  it('caps one batch at five errors and forwards it once', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const { container } = await mountPanel({ onPreviewError })
    for (let i = 1; i <= 6; i++) {
      await postFromPreview(container, { type: 'molecule:error', message: `failure ${i}` })
    }
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0]).toHaveLength(5)
    expect(onPreviewError.mock.calls[0][0].map((e) => e.message)).toEqual([
      'failure 1',
      'failure 2',
      'failure 3',
      'failure 4',
      'failure 5',
    ])
  })

  it('labels a pre-render error without a source and keeps distinct signatures in one batch', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const { container } = await mountPanel({ onPreviewError })
    await postFromPreview(container, { type: 'molecule:error', message: 'missing export' })
    await postFromPreview(container, {
      type: 'molecule:runtime-error',
      message: 'x is not defined',
    })
    await postFromPreview(container, {
      type: 'molecule:runtime-error',
      message: 'y is not a function',
    })
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    const batch = onPreviewError.mock.calls[0][0]
    expect(batch).toHaveLength(3)
    expect(batch[0]).toMatchObject({ message: 'missing export', source: 'pre-render' })
    expect(batch[1]).toMatchObject({ message: 'x is not defined' })
  })

  it('forwards the same signature again once the dedup window has passed', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const { container } = await mountPanel({ onPreviewError })
    const err = { type: 'molecule:runtime-error' as const, message: 'same fault' }
    await postFromPreview(container, err)
    await advance(2_100) // first flush
    await postFromPreview(container, err) // still inside the dedup window — dropped
    await advance(2_100)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    await advance(2_100) // now past ERROR_DEDUP_WINDOW_MS since the first sighting
    await postFromPreview(container, err)
    await advance(2_100)
    expect(onPreviewError).toHaveBeenCalledTimes(2)
    // The ledger is BOUNDED: a distinct error ages out of the window, so the
    // re-forward also prunes it (a long session of distinct faults cannot grow
    // the ledger forever).
    const other = { type: 'molecule:runtime-error' as const, message: 'unrelated fault' }
    await advance(4_200)
    await postFromPreview(container, other)
    await advance(2_100)
    expect(onPreviewError).toHaveBeenCalledTimes(3)
    expect(onPreviewError.mock.calls[2][0]).toHaveLength(1)
  })

  it('labels a runtime error with no message as unknown', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const { container } = await mountPanel({ onPreviewError })
    await postFromPreview(container, { type: 'molecule:runtime-error' })
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0][0]).toMatchObject({ message: 'Unknown error' })
  })

  it('ignores an error with neither crash nor message', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const { container } = await mountPanel({ onPreviewError })
    await postFromPreview(container, { type: 'molecule:error' })
    await advance(2_500)
    expect(onPreviewError).not.toHaveBeenCalled()
  })

  it('queues errors safely with no onPreviewError callback bound', async () => {
    const { container } = await mountPanel()
    await postFromPreview(container, { type: 'molecule:error', message: 'no host listening' })
    await advance(2_500)
    // The flush ran with no callback bound and no error escaped; the panel is
    // still mounted and reactive.
    expect(container.querySelector('iframe')).not.toBeNull()
  })
})

describe('PreviewPanel — molecule:viewport (a spec-driven size request is clamped, not trusted)', () => {
  it('clamps into the panel bounds and a zero size hands the frame back', async () => {
    const { container, iframe } = await mountPanel()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)
    // Far too small: clamped UP to the usable floor…
    await postFromPreview(container, { type: 'molecule:viewport', width: 1, height: 1 })
    await advance(50)
    expect(iframe.style.width).toBe('120px')
    expect(iframe.style.height).toBe('120px')
    // …far too large: clamped DOWN to the panel bound.
    await postFromPreview(container, {
      type: 'molecule:viewport',
      width: 99_999,
      height: 99_999,
    })
    await advance(50)
    expect(iframe.style.width).toBe('4000px')
    expect(iframe.style.height).toBe('4000px')
    // A zero/NaN size means "stop overriding" — the frame returns to the
    // selected device (the fluid default fills the area).
    await postFromPreview(container, { type: 'molecule:viewport', width: 0, height: 0 })
    await advance(50)
    expect(iframe.style.width).toBe('100%')
    await postFromPreview(container, {
      type: 'molecule:viewport',
      width: 'NaN',
      height: 'NaN',
    })
    await advance(50)
    expect(iframe.style.width).toBe('100%')
  })
})

describe('PreviewPanel — ui-result and navigate payload validation', () => {
  it('ignores a ui-result whose id is not a string', async () => {
    const onUiResult = vi.fn<(id: string, result: PreviewUiResult) => void>()
    const { container } = await mountPanel({ onUiResult })
    await postFromPreview(container, { type: 'molecule:ui-result', id: 42, ok: true })
    await advance(50)
    expect(onUiResult).not.toHaveBeenCalled()
  })

  it('ignores a navigate whose url is not a string', async () => {
    const provider = providerAtUrl()
    const { container } = await mountPanel({}, provider)
    const before = provider.getState().currentUrl
    await postFromPreview(container, { type: 'molecule:navigate', url: 12345 })
    await advance(100)
    // A garbage url is not a navigation: the reported location never moved.
    expect(provider.getState().currentUrl).toBe(before)
  })

  it('unmounts cleanly with an error batch still debouncing', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const { container } = await mountPanel({ onPreviewError })
    // An error arrives and its 2s debounce timer is pending when the panel
    // goes away — the cleanup must clear it with no callback escaping.
    await postFromPreview(container, { type: 'molecule:error', message: 'dying batch' })
    const mount = mounted.pop()
    mount?.dispose()
    await advance(3_000)
    expect(onPreviewError).not.toHaveBeenCalled()
  })
})

describe('PreviewPanel — URL bar commit edges', () => {
  /**
   * The address input.
   *
   * @param container - The mount container.
   * @returns The input.
   */
  const urlInput = (container: HTMLElement): HTMLInputElement =>
    container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement

  /**
   * The wrapping address field carries the focus ring.
   *
   * @param container - The mount container.
   * @returns The field.
   */
  const urlField = (container: HTMLElement): HTMLElement =>
    container.querySelector('[data-mol-id="preview-url-field"]') as HTMLElement

  /**
   * Types a draft into the address input, as a user's keystrokes do.
   *
   * @param input - The address input.
   * @param value - The draft.
   */
  async function typeDraft(input: HTMLInputElement, value: string): Promise<void> {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
  }

  it('an Enter on a whitespace-only draft navigates nowhere and blurring ends editing', async () => {
    const provider = providerAtUrl()
    const loadNonceBefore = provider.getState().loadNonce
    const { container } = await mountPanel({}, provider)
    const input = urlInput(container)
    // Focus lights the ring (editing)…
    input.focus()
    await settle()
    expect(urlField(container).style.boxShadow).toContain('var(')
    // …a blank draft commits nothing…
    await typeDraft(input, '   ')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await settle()
    expect(provider.getState().url).toBe(PREVIEW_URL)
    expect(provider.getState().loadNonce).toBe(loadNonceBefore)
    // …and blur closes editing (the ring goes away).
    input.blur()
    await settle()
    expect(urlField(container).style.boxShadow).not.toContain('var(')
  })

  it('Escape restores the live location instead of the draft', async () => {
    const provider = providerAtUrl()
    const { container } = await mountPanel({}, provider)
    const input = urlInput(container)
    await typeDraft(input, 'http://typo.example/')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await advance(50)
    // The draft is discarded in favor of the preview's real location.
    expect(urlInput(container).value).toBe(provider.getState().currentUrl)
  })
})

describe('PreviewPanel — molecule:snapshot size cap', () => {
  it('ignores an image snapshot beyond MAX_SNAPSHOT_DATA_URL_LENGTH', async () => {
    const { container, iframe } = await mountPanel()
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    const huge = `data:image/png;base64,${'A'.repeat(4_000_001)}`
    await postFromPreview(container, { type: 'molecule:snapshot', dataUrl: huge })
    await postFromPreview(container, { type: 'molecule:blank' })
    await advance(100)
    // The oversized frame is refused at the trust boundary…
    expect(q(container, 'preview-last-frame')).toBeNull()
    // …while a valid small frame stands in behind the overlay.
    await postFromPreview(container, {
      type: 'molecule:snapshot',
      dataUrl: 'data:image/png;base64,AAAA',
    })
    await postFromPreview(container, { type: 'molecule:blank' })
    await advance(100)
    expect(q(container, 'preview-last-frame')).not.toBeNull()
  })
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
