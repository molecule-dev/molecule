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
 * with the same test names and the same assertions: the Vue panel is a view over
 * the same shared behaviour (`createPreviewPanelSession`), so a real jsdom render
 * of {@link PreviewPanel} driven by a real iframe preview provider must reach the
 * same decisions React's panel reaches.
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
  type PanelProps,
  postFromPreview,
  providerAtUrl,
  q,
  responseOf,
  settle,
} from './preview-panel-harness.js'

/** How long the reveal fade takes, plus slack (ms). */
const REVEALED_MS = 700

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

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
  initial: PanelProps = { isBuilding: false },
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
 * The preview iframe currently in the container, or null.
 *
 * @param container - The mount container.
 * @returns The iframe.
 */
function iframeOf(container: HTMLElement): HTMLIFrameElement | null {
  const element = container.querySelector('iframe')
  return element instanceof HTMLIFrameElement ? element : null
}

/**
 * The overlay element, or null when the preview is revealed.
 *
 * @param container - The mount container.
 * @returns The overlay.
 */
function overlayOf(container: HTMLElement): HTMLElement | null {
  const element = q(container, 'preview-overlay')
  return element instanceof HTMLElement ? element : null
}

/** The preview iframe's `src` attribute, or the empty string when absent. */
const srcOf = (container: HTMLElement): string => iframeOf(container)?.getAttribute('src') ?? ''

/**
 * Mounts the panel, waits for the iframe, confirms a render, and lets the
 * reveal fade finish.
 *
 * @param provider - The live-preview provider (a fresh one when omitted).
 * @returns The mounted panel and its iframe.
 */
async function mountRendered(
  provider: ReturnType<typeof providerAtUrl> = providerAtUrl(),
): Promise<{ panel: MountedPanel; container: HTMLElement; iframe: HTMLIFrameElement }> {
  const panel = mount(provider)
  const { container } = panel
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = iframeOf(container)
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  await load(iframe)
  await postFromPreview(container, { type: 'molecule:ready' })
  await advance(REVEALED_MS)
  expect(overlayOf(container)).toBeNull()
  return { panel, container, iframe }
}

/** How many server probes have been issued through the stubbed `fetch`. */
const fetchCalls = (): number => vi.mocked(fetch).mock.calls.length

beforeEach(() => {
  setClassMap(classMap)
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => responseOf(true)),
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

describe('PreviewPanel — health check: one miss is noise, two are the verdict', () => {
  it('keeps a healthy preview up through a single failed probe, then tears it down on the confirmed outage', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => responseOf(serving)),
    )
    const { container } = await mountRendered()
    const healthySrc = srcOf(container)

    // The reveal baselines the heartbeat, so the first probes are excused as
    // "document alive" — walk past that 8s window on a healthy server first.
    await advance(6_000)

    // ONE failed probe (a slow edge hop, an aborted fetch on a tab switch) is
    // noise: no overlay, no reload.
    serving = false
    await advance(3_000)
    expect(overlayOf(container)).toBeNull()
    expect(srcOf(container)).toBe(healthySrc)

    // A SECOND consecutive miss over a quiet document is the down verdict: the
    // overlay returns and the stale frame is held until the server answers.
    await advance(3_000)
    expect(overlayOf(container)).not.toBeNull()
    expect(srcOf(container)).toBe(healthySrc)
  }, 30_000)

  it('cancels the recovering poll chain when the panel unmounts mid-outage (no fetch escapes)', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => responseOf(serving)),
    )
    const { panel, container } = await mountRendered()

    // Walk past the heartbeat excuse window, then let the outage be confirmed.
    await advance(6_000)
    serving = false
    await advance(6_500)
    expect(overlayOf(container)).not.toBeNull()

    // One recovery-poll cycle has completed and scheduled the next; the panel
    // goes away now.
    const atUnmount = fetchCalls()
    expect(atUnmount).toBeGreaterThan(0)
    panel.unmount()
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
        return Promise.resolve(responseOf(answer === 'up'))
      }),
    )
    const provider = providerAtUrl()
    const { container } = await mountRendered(provider)

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
    await advance(3_100)
    expect(held.length).toBeGreaterThan(0)
    provider.setUrl('http://localhost:5174/')
    await settle()

    // The abandoned probe finally answers UP: the dead chain must discard it
    // rather than reload the target it was asking about.
    const probes = held
    held = []
    for (const resolve of probes) resolve(responseOf(true))
    await settle()
    await advance(500)
    const after = iframeOf(container)
    expect(new URL(after?.getAttribute('src') ?? '').host).toBe('localhost:5174')
  }, 30_000)

  it('cancels the pending probe when the panel unmounts behind a notice', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => responseOf(serving)),
    )
    const { panel, container } = await mountRendered()

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
    panel.unmount()
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
    await load(iframe)
    expect(overlayOf(container)).not.toBeNull()

    // A second load 750ms later for the SAME element: it must retire the first
    // load's grace (which would fire 2500ms after the first load — 1750ms from
    // now — and reveal the preview early) and arm its own.
    await advance(750)
    await load(iframe)
    expect(overlayOf(container)).not.toBeNull()

    // 1900ms after the second load is 2650ms after the first — past the first
    // load's grace deadline. A retired timer means the overlay is STILL solid
    // (opacity 1); a live stale timer would have revealed the preview and be
    // mid-fade at opacity 0.
    await advance(1_900)
    expect(overlayOf(container)).not.toBeNull()
    expect(overlayOf(container)?.style.opacity).toBe('1')

    // The second load's own grace (2500ms after it) then reveals the
    // already-rendered app…
    await advance(700)
    expect(overlayOf(container)?.style.opacity).toBe('0')
    // …and a ready confirms it, clearing any blank re-cover from the reload.
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(REVEALED_MS)
    expect(overlayOf(container)).toBeNull()
  }, 30_000)
})
