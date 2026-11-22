// @vitest-environment jsdom

/**
 * The steady-state probes that only run while a preview is being WATCHED, and
 * the timers they own.
 *
 * - The health check treats ONE failed probe as noise and two consecutive
 *   misses (over a document that is no longer heartbeating) as the down
 *   verdict — a single miss must never tear the preview down.
 * - The recovery poll that follows the verdict, and the dead-end probe that
 *   waits behind an actionable notice, are both self-scheduled chains: a
 *   panel that goes away must cancel whatever is still pending, so no fetch
 *   escapes after unmount.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.steady-state.test.tsx`
 * with the same test names and the same assertions: the Solid panel is a view over
 * the same shared behaviour (`createPreviewPanelSession`), so a real jsdom render
 * driven by a real iframe preview provider must reach the same decisions React's
 * panel reaches. A microtask settle replaces React's `act()`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'

import { PreviewPanel } from '../components/PreviewPanel.jsx'

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

/** The roots this file mounted, disposed after each test. */
const mounted: { dispose?: () => void }[] = []

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
 * Simulate an inbound bridge message from the preview iframe (same-origin).
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

const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

const overlay = (container: HTMLElement): HTMLElement | null =>
  q(container, 'preview-overlay') as HTMLElement | null

const src = (container: HTMLElement): string =>
  container.querySelector('iframe')?.getAttribute('src') ?? ''

/**
 * Advances the fake clock, then settles the session's queued updates.
 *
 * @param ms - Fake-timer milliseconds to advance.
 */
const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

/**
 * Mounts the panel over a provider.
 *
 * @param provider - The live preview provider the panel reads.
 * @returns The container the panel rendered into.
 */
function mount(provider: PreviewProvider): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <PreviewContext.Provider value={provider}>
        <PreviewPanel isBuilding={false} />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose })
  return container
}

/** Long enough for the reveal's fade timer (500ms + slack) to finish. */
const REVEALED_MS = 700

/**
 * Mount, load, confirm a render, and let the reveal fade finish.
 *
 * @param provider - The live preview provider the panel reads.
 * @returns The container and its iframe.
 */
async function mountRendered(
  provider: PreviewProvider = providerAtUrl(),
): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const container = mount(provider)
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe') as HTMLIFrameElement
  expect(iframe).not.toBeNull()
  iframe.dispatchEvent(new Event('load'))
  await settle()
  await postFromPreview(container, { type: 'molecule:ready' })
  await advance(REVEALED_MS)
  expect(overlay(container)).toBeNull()
  return { container, iframe }
}

/** How many server probes have been issued through the stubbed `fetch`. */
const fetchCalls = (): number => vi.mocked(fetch).mock.calls.length

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const entry of mounted.splice(0)) entry.dispose?.()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PreviewPanel — health check: one miss is noise, two are the verdict', () => {
  it('keeps a healthy preview up through a single failed probe, then tears it down on the confirmed outage', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: serving ? 200 : 503 })),
    )
    const { container } = await mountRendered()
    const healthySrc = src(container)

    // The reveal baselines the heartbeat, so the first probes are excused as
    // "document alive" — walk past that 8s window on a healthy server first.
    await advance(6_000)

    // ONE failed probe (a slow edge hop, an aborted fetch on a tab switch) is
    // noise: no overlay, no reload.
    serving = false
    await advance(3_000)
    expect(overlay(container)).toBeNull()
    expect(src(container)).toBe(healthySrc)

    // A SECOND consecutive miss over a quiet document is the down verdict: the
    // overlay returns and the stale frame is held until the server answers.
    await advance(3_000)
    expect(overlay(container)).not.toBeNull()
    expect(src(container)).toBe(healthySrc)
  }, 30_000)

  it('cancels the recovering poll chain when the panel unmounts mid-outage (no fetch escapes)', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: serving ? 200 : 503 })),
    )
    const container = mount(providerAtUrl())
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)

    // Walk past the heartbeat excuse window, then let the outage be confirmed.
    await advance(6_000)
    serving = false
    await advance(6_500)
    expect(overlay(container)).not.toBeNull()

    // One recovery-poll cycle has completed and scheduled the next; the panel
    // goes away now.
    const atUnmount = fetchCalls()
    expect(atUnmount).toBeGreaterThan(0)
    mounted.splice(0).forEach((entry) => entry.dispose?.())
    await advance(20_000)
    expect(fetchCalls()).toBe(atUnmount)
  }, 30_000)
})

describe('PreviewPanel — dead-end probe timers', () => {
  it('discards a probe answer that lands after the host retargeted the preview', async () => {
    type ProbeAnswer = 'up' | 'down' | 'hang'
    let answer: ProbeAnswer = 'up'
    let held: Array<(response: Response) => void> = []
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => {
        if (answer === 'hang') {
          return new Promise<Response>((resolve) => {
            held.push(resolve)
          })
        }
        return Promise.resolve(new Response(null, { status: answer === 'up' ? 200 : 503 }))
      }),
    )
    const provider = providerAtUrl()
    const container = mount(provider)
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)

    // The app breaks behind a DOWN host: the blank notice raises and the
    // dead-end probe keeps asking every 3s.
    answer = 'down'
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(400)
    await advance(3_000)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()

    // One more tick completes, then the NEXT probe is still in flight when the
    // host retargets the preview (a wake's new port) — tearing the chain down.
    await advance(3_100)
    answer = 'hang'
    // The session flushes a timer's update on the next microtask, so the probe
    // chain can start up to a tick later than React's synchronous flush: walk
    // the clock until a probe is genuinely in flight (bounded, ~3 ticks).
    for (let i = 0; i < 9 && held.length === 0; i++) {
      await advance(1_000)
    }
    expect(held.length).toBeGreaterThan(0)
    provider.setUrl('http://localhost:5174/')
    await settle()

    // The abandoned probe finally answers UP: the dead chain must discard it
    // rather than reload the target it was asking about.
    const probes = held
    held = []
    for (const resolve of probes) resolve(new Response(null, { status: 200 }))
    await settle()
    await advance(500)
    const after = container.querySelector('iframe') as HTMLIFrameElement
    expect(new URL(after.getAttribute('src') ?? '').host).toBe('localhost:5174')
  }, 30_000)

  it('cancels the pending probe when the panel unmounts behind a notice', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: serving ? 200 : 503 })),
    )
    const container = mount(providerAtUrl())
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)

    // The app breaks (crash → re-cover) and the DOWN host raises the blank
    // notice; the dead-end probe keeps asking every 3s.
    serving = false
    await postFromPreview(container, { type: 'molecule:error', crash: true })
    await advance(400)
    await advance(3_000)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    await advance(4_000) // one probe tick completes, the next is scheduled
    const atUnmount = fetchCalls()

    // Unmount with the probe still scheduled: it must never fire.
    mounted.splice(0).forEach((entry) => entry.dispose?.())
    await advance(20_000)
    expect(fetchCalls()).toBe(atUnmount)
  }, 30_000)
})

describe('PreviewPanel — repeated onLoad for one element', () => {
  it('retires the previous load’s grace timer (a second load is revealed on ITS OWN clock)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: 200 })),
    )
    const { container, iframe } = await mountRendered()

    // Past READY_FRESH_MS the next document load counts as unconfirmed, so the
    // panel re-covers and arms the onLoad-grace fallback for it.
    await advance(2_000)
    iframe.dispatchEvent(new Event('load'))
    await settle()
    expect(overlay(container)).not.toBeNull()

    // A second load 750ms later for the SAME element: it must retire the first
    // load's grace (which would fire 2500ms after the first load — 1750ms from
    // now — and reveal the preview early) and arm its own.
    await advance(750)
    iframe.dispatchEvent(new Event('load'))
    await settle()
    expect(overlay(container)).not.toBeNull()

    // 1900ms after the second load is 2650ms after the first — past the first
    // load's grace deadline. A retired timer means the overlay is STILL solid
    // (opacity 1); a live stale timer would have revealed the preview and be
    // mid-fade at opacity 0.
    await advance(1_900)
    expect(overlay(container)).not.toBeNull()
    expect(overlay(container)?.style.opacity).toBe('1')

    // The second load's own grace (2500ms after it) then reveals the
    // already-rendered app…
    await advance(700)
    expect(overlay(container)?.style.opacity).toBe('0')
    // …and a ready confirms it, clearing any blank re-cover from the reload.
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  }, 30_000)
})
