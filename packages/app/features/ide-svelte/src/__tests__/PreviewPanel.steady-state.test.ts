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
 * A port of `@molecule/app-ide-react`'s `PreviewPanel.steady-state.test.tsx`
 * with the same test names and the same behavioural assertions: a real jsdom
 * render of the Svelte `PreviewPanel` (through the shared
 * `createPreviewPanelSession`), driven by the package's recording live-preview
 * provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewPanelProps } from '../types.js'
import {
  advance as stepTimers,
  buildPreviewProvider,
  fireFrameLoad,
  frameSrc,
  installStubClassMap,
  type MountedPanel,
  mountWithIframe,
  postFromPreview,
  PREVIEW_URL,
  q,
  type StubPreviewProvider,
} from './preview-panel-harness.js'

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

/**
 * Drains the session's queued microtask flush and Svelte's own scheduled
 * render (the harness's `settle`, run repeatedly).
 */
async function drain(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await vi.advanceTimersByTimeAsync(0)
    flushSync()
  }
}

/**
 * Advances the fake clock the way React's `act()` defers its renders: the
 * session's own renders (queued on `queueMicrotask` by the headless hooks
 * runtime) are held for the whole advance and released as ONE batch at the
 * end, while the promises the probes await still settle inside it. That single
 * deferred batch is what React's `act(async () => vi.advanceTimersByTimeAsync(ms))`
 * produces, and the health check's verdict-vs-recovery ordering depends on it.
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
    // Let the native promise continuations (the probe answers) run before the
    // deferred renders, as React's act scope does.
    await drain()
  } finally {
    globalThis.queueMicrotask = realQueueMicrotask
  }
  for (const callback of held) callback()
  await drain()
}

/** The overlay over the preview. */
function overlay(container: HTMLElement): HTMLElement | null {
  return q(container, 'preview-overlay') as HTMLElement | null
}

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

/** Mount, load, confirm a render, and let the reveal fade finish. */
async function mountRendered(
  provider: StubPreviewProvider = buildPreviewProvider({ currentUrl: PREVIEW_URL }),
  props: PreviewPanelProps = { isBuilding: false },
): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const mounted = await mountWithIframe(provider, props)
  panel = mounted
  fireFrameLoad(mounted.iframe)
  postFromPreview({ type: 'molecule:ready' })
  await advance(REVEALED_MS)
  expect(overlay(mounted.container)).toBeNull()
  return mounted
}

/** Long enough for the reveal's fade timer (500ms + slack) to finish. */
const REVEALED_MS = 700

/** How many server probes have been issued through the stubbed `fetch`. */
const fetchCalls = (): number => vi.mocked(fetch).mock.calls.length

describe('PreviewPanel — health check: one miss is noise, two are the verdict', () => {
  it('keeps a healthy preview up through a single failed probe, then tears it down on the confirmed outage', async () => {
    const state = { serving: true }
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(null, { status: state.serving ? 200 : 503 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = await mountRendered()
    const healthySrc = frameSrc(container)

    // The reveal baselines the heartbeat, so the first probes are excused as
    // "document alive" — walk past that 8s window on a healthy server first.
    await advance(6_000)

    // ONE failed probe (a slow edge hop, an aborted fetch on a tab switch) is
    // noise: no overlay, no reload.
    state.serving = false
    await advance(3_000)
    expect(overlay(container)).toBeNull()
    expect(frameSrc(container)).toBe(healthySrc)

    // A SECOND consecutive miss over a quiet document is the down verdict: the
    // overlay returns and the stale frame is held until the server answers.
    await advance(3_000)
    expect(overlay(container)).not.toBeNull()
    expect(frameSrc(container)).toBe(healthySrc)
  }, 30_000)

  it('cancels the recovering poll chain when the panel unmounts mid-outage (no fetch escapes)', async () => {
    const state = { serving: true }
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(null, { status: state.serving ? 200 : 503 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const mounted = await mountWithIframe(buildPreviewProvider({ currentUrl: PREVIEW_URL }), {
      isBuilding: false,
    })
    panel = mounted
    const { container } = mounted
    fireFrameLoad(mounted.iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)

    // Walk past the heartbeat excuse window, then let the outage be confirmed.
    await advance(6_000)
    state.serving = false
    await advance(6_500)
    expect(overlay(container)).not.toBeNull()

    // One recovery-poll cycle has completed and scheduled the next; the panel
    // goes away now.
    const atUnmount = fetchCalls()
    expect(atUnmount).toBeGreaterThan(0)
    await mounted.dispose()
    await advance(20_000)
    expect(fetchCalls()).toBe(atUnmount)
  }, 30_000)
})

describe('PreviewPanel — dead-end probe timers', () => {
  it('discards a probe answer that lands after the host retargeted the preview', async () => {
    type ProbeAnswer = 'up' | 'down' | 'hang'
    let answer: ProbeAnswer = 'up'
    let held: Array<(response: Response) => void> = []
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => {
      if (answer === 'hang') {
        return new Promise<Response>((resolve) => {
          held.push(resolve)
        })
      }
      return Promise.resolve(new Response(null, { status: answer === 'up' ? 200 : 503 }))
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    const mounted = await mountWithIframe(provider, { isBuilding: false })
    panel = mounted
    const { container } = mounted
    fireFrameLoad(mounted.iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)

    // The app breaks behind a DOWN host: the blank notice raises and the
    // dead-end probe keeps asking every 3s.
    answer = 'down'
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(400)
    await advance(3_000)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()

    // One more tick completes, then the NEXT probe is still in flight when the
    // host retargets the preview (a wake's new port) — tearing the chain down.
    await advance(3_100)
    answer = 'hang'
    await advance(3_100)
    expect(held.length).toBeGreaterThan(0)
    provider.setUrl('http://localhost:5174/')
    await stepTimers(50)

    // The abandoned probe finally answers UP: the dead chain must discard it
    // rather than reload the target it was asking about.
    const probes = held
    held = []
    for (const resolve of probes) resolve(new Response(null, { status: 200 }))
    await advance(500)
    const after = container.querySelector('iframe')
    if (!after) throw new Error('the preview iframe went away')
    expect(new URL(after.getAttribute('src') ?? '').host).toBe('localhost:5174')
  }, 30_000)

  it('cancels the pending probe when the panel unmounts behind a notice', async () => {
    const state = { serving: true }
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(null, { status: state.serving ? 200 : 503 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const mounted = await mountWithIframe(buildPreviewProvider({ currentUrl: PREVIEW_URL }), {
      isBuilding: false,
    })
    const { container } = mounted
    fireFrameLoad(mounted.iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)

    // The app breaks (crash → re-cover) and the DOWN host raises the blank
    // notice; the dead-end probe keeps asking every 3s.
    state.serving = false
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(400)
    await advance(3_000)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    await advance(4_000) // one probe tick completes, the next is scheduled
    const atUnmount = fetchCalls()

    // Unmount with the probe still scheduled: it must never fire.
    await mounted.dispose()
    await advance(20_000)
    expect(fetchCalls()).toBe(atUnmount)
  }, 30_000)
})

describe('PreviewPanel — repeated onLoad for one element', () => {
  it('retires the previous load’s grace timer (a second load is revealed on ITS OWN clock)', async () => {
    const { container, iframe } = await mountRendered()

    // Past READY_FRESH_MS the next document load counts as unconfirmed, so the
    // panel re-covers and arms the onLoad-grace fallback for it.
    await advance(2_000)
    fireFrameLoad(iframe)
    await advance(0)
    expect(overlay(container)).not.toBeNull()

    // A second load 750ms later for the SAME element: it must retire the first
    // load's grace (which would fire 2500ms after the first load — 1750ms from
    // now — and reveal the preview early) and arm its own.
    await advance(750)
    fireFrameLoad(iframe)
    await advance(0)
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
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlay(container)).toBeNull()
  }, 30_000)
})
