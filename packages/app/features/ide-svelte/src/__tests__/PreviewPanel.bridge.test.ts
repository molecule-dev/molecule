// @vitest-environment jsdom

/**
 * The `molecule:*` message bridge — the trust gate, crash/error forwarding, the
 * ready/error rate limits, cycle suppression, batch caps and the snapshot size
 * cap. Every inbound message the controller will own flows through this one
 * handler, so each rule here is pinned by driving the real handler with real
 * `MessageEvent`s whose `source` is the preview iframe's own window (the trust
 * gate) — or deliberately something else, for the gate itself.
 *
 * A port of `@molecule/app-ide-react`'s `PreviewPanel.bridge.test.tsx` with the
 * same test names and the same behavioural assertions. A real jsdom render of
 * the Svelte `PreviewPanel` (through the shared `createPreviewPanelSession`),
 * driven by the package's recording live-preview provider. The reveal FADES out
 * over ~500ms (the overlay element lingers at opacity 0 until the fade timer),
 * so "revealed" assertions wait past OVERLAY_FADE_MS rather than asserting the
 * instant the ready lands.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewErrorReport } from '@molecule/app-ide-panel-logic/panels'
import { isRawDocumentUrl } from '@molecule/app-ide-panel-logic/panels'

import type { PreviewPanelProps } from '../types.js'
import {
  advance,
  buildPreviewProvider,
  fireFrameLoad,
  installStubClassMap,
  type MountedPanel,
  mountPanel,
  postFromPreview,
  PREVIEW_URL,
  q,
  type StubPreviewProvider,
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

/** A message from a window that is NOT the preview iframe — must be ignored. */
function postFromForeignWindow(data: Record<string, unknown>): void {
  window.dispatchEvent(
    new MessageEvent('message', { data, origin: 'https://evil.example', source: window }),
  )
}

/** Mounts the panel and drives the server-up poll so the iframe mounts. */
async function mountBridge(
  props: PreviewPanelProps = {},
  provider: StubPreviewProvider = buildPreviewProvider(),
): Promise<MountedPanel & { iframe: HTMLIFrameElement; provider: StubPreviewProvider }> {
  const mounted = mountPanel(provider, props)
  panel = mounted
  for (let i = 0; i < 12 && !mounted.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = mounted.container.querySelector('iframe')
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { ...mounted, iframe, provider }
}

describe('PreviewPanel — bridge trust gate (source-window identity)', () => {
  it('ignores a molecule:ready from any window that is not the preview iframe', async () => {
    const { container, iframe } = await mountBridge()
    fireFrameLoad(iframe)
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
    const { container, iframe } = await mountBridge()
    fireFrameLoad(iframe)
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
    const { container, iframe } = await mountBridge()
    fireFrameLoad(iframe)
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
    const { container, iframe } = await mountBridge()
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' }) // accepted at t=0
    await advance(50)
    postFromPreview({ type: 'molecule:ready' }) // t=50: duplicate — dropped
    await advance(1_500)
    // A document reload at t=1550: the only ACCEPTED ready is 1550ms old, past
    // READY_FRESH_MS (1500), so the reload is unconfirmed and re-covered. (If
    // the duplicate had refreshed lastReadyAt to t=50, the load would read
    // exactly 1500ms — fresh — and keep the reveal.)
    fireFrameLoad(iframe)
    await advance(60)
    expect(overlay(container)).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — rapid ready/error cycle suppression', () => {
  it('suppresses the oscillation, drops later toggles, then recovers after the window', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, iframe } = await mountBridge()
    fireFrameLoad(iframe)
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
    const { container, iframe } = await mountBridge()
    fireFrameLoad(iframe)
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
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    await mountBridge({ onPreviewError })
    for (let i = 1; i <= 6; i++) {
      postFromPreview({ type: 'molecule:error', message: `failure ${i}` })
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
  }, 30_000)

  it('labels a pre-render error without a source and keeps distinct signatures in one batch', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    await mountBridge({ onPreviewError })
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
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    await mountBridge({ onPreviewError })
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
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    await mountBridge({ onPreviewError })
    postFromPreview({ type: 'molecule:runtime-error' })
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0][0]).toMatchObject({ message: 'Unknown error' })
  }, 30_000)

  it('ignores an error with neither crash nor message', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    await mountBridge({ onPreviewError })
    postFromPreview({ type: 'molecule:error' })
    await advance(2_500)
    expect(onPreviewError).not.toHaveBeenCalled()
  }, 30_000)

  it('queues errors safely with no onPreviewError callback bound', async () => {
    const { container } = await mountBridge()
    postFromPreview({ type: 'molecule:error', message: 'no host listening' })
    await advance(2_500)
    // The flush ran with no callback bound and no error escaped; the panel is
    // still mounted and reactive.
    expect(container.querySelector('iframe')).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — molecule:viewport (a spec-driven size request is clamped, not trusted)', () => {
  it('clamps into the panel bounds and a zero size hands the frame back', async () => {
    const { iframe } = await mountBridge()
    fireFrameLoad(iframe)
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
    const onUiResult = vi.fn<(id: string) => void>()
    await mountBridge({ onUiResult })
    postFromPreview({ type: 'molecule:ui-result', id: 42, ok: true })
    await advance(50)
    expect(onUiResult).not.toHaveBeenCalled()
  }, 30_000)

  it('ignores a navigate whose url is not a string', async () => {
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    await mountBridge({}, provider)
    const before = provider.getState().currentUrl
    postFromPreview({ type: 'molecule:navigate', url: 12345 })
    await advance(100)
    // A garbage url is not a navigation: the reported location never moved.
    expect(provider.getState().currentUrl).toBe(before)
  }, 30_000)

  it('unmounts cleanly with an error batch still debouncing', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const mounted = await mountBridge({ onPreviewError })
    // An error arrives and its 2s debounce timer is pending when the panel
    // goes away — the cleanup must clear it with no callback escaping.
    postFromPreview({ type: 'molecule:error', message: 'dying batch' })
    await mounted.dispose()
    panel = null
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

  /**
   * Types a value into the address input (React's `fireEvent.change`).
   *
   * @param input - The address input.
   * @param value - The draft to type.
   */
  async function typeUrl(input: HTMLInputElement, value: string): Promise<void> {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await advance(0)
  }

  /**
   * Presses a key in the address input.
   *
   * @param input - The address input.
   * @param key - The key.
   */
  async function pressKey(input: HTMLInputElement, key: string): Promise<void> {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    await advance(0)
  }

  it('an Enter on a whitespace-only draft navigates nowhere and blurring ends editing', async () => {
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    const { container } = await mountBridge({}, provider)
    const loadNonceBefore = provider.getState().loadNonce
    const input = urlInput(container)
    // Focus lights the ring (editing)…
    input.focus()
    await advance(0)
    expect(urlField(container).style.boxShadow).toContain('var(')
    // …a blank draft commits nothing…
    await typeUrl(input, '   ')
    await pressKey(input, 'Enter')
    expect(provider.getState().url).toBe(PREVIEW_URL)
    expect(provider.getState().loadNonce).toBe(loadNonceBefore)
    // …and blur closes editing (the ring goes away).
    input.blur()
    await advance(0)
    expect(urlField(container).style.boxShadow).not.toContain('var(')
  }, 30_000)

  it('Escape restores the live location instead of the draft', async () => {
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    const { container } = await mountBridge({}, provider)
    const input = urlInput(container)
    await typeUrl(input, 'http://typo.example/')
    await pressKey(input, 'Escape')
    await advance(50)
    // The draft is discarded in favor of the preview's real location.
    expect(urlInput(container).value).toBe(provider.getState().currentUrl)
  }, 30_000)
})

describe('PreviewPanel — molecule:snapshot size cap', () => {
  it('ignores an image snapshot beyond MAX_SNAPSHOT_DATA_URL_LENGTH', async () => {
    const { container, iframe } = await mountBridge()
    fireFrameLoad(iframe)
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
