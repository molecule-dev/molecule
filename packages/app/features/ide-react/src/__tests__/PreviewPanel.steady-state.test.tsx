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

const overlay = (container: HTMLElement): HTMLElement | null =>
  q(container, 'preview-overlay') as HTMLElement | null

const src = (container: HTMLElement): string =>
  (container.querySelector('iframe') as HTMLIFrameElement | null)?.getAttribute('src') ?? ''

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

/** Mount, load, confirm a render, and let the reveal fade finish. */
async function mountRendered(): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
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
  await act(async () => {
    fireEvent.load(iframe)
  })
  postFromPreview({ type: 'molecule:ready' })
  await advance(REVEALED_MS)
  expect(overlay(container)).toBeNull()
  return { container, iframe }
}

/** How many server probes have been issued through the stubbed `fetch`. */
const fetchCalls = (): number => vi.mocked(fetch).mock.calls.length

describe('PreviewPanel — health check: one miss is noise, two are the verdict', () => {
  it('keeps a healthy preview up through a single failed probe, then tears it down on the confirmed outage', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: serving, status: serving ? 200 : 503 }) as Response),
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
      vi.fn(async () => ({ ok: serving, status: serving ? 200 : 503 }) as Response),
    )
    const view = render(
      <Wrap provider={providerAtUrl()}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !view.container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = view.container.querySelector('iframe') as HTMLIFrameElement
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)

    // Walk past the heartbeat excuse window, then let the outage be confirmed.
    await advance(6_000)
    serving = false
    await advance(6_500)
    expect(overlay(view.container)).not.toBeNull()

    // One recovery-poll cycle has completed and scheduled the next; the panel
    // goes away now.
    const atUnmount = fetchCalls()
    expect(atUnmount).toBeGreaterThan(0)
    view.unmount()
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
      vi.fn(() => {
        if (answer === 'hang') {
          return new Promise<Response>((resolve) => {
            held.push(resolve)
          })
        }
        return Promise.resolve({
          ok: answer === 'up',
          status: answer === 'up' ? 200 : 503,
        } as Response)
      }),
    )
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
    await act(async () => {
      provider.setUrl('http://localhost:5174/')
    })

    // The abandoned probe finally answers UP: the dead chain must discard it
    // rather than reload the target it was asking about.
    await act(async () => {
      const probes = held
      held = []
      for (const resolve of probes) resolve({ ok: true, status: 200 } as Response)
      await Promise.resolve()
    })
    await advance(500)
    const after = container.querySelector('iframe') as HTMLIFrameElement
    expect(after.getAttribute('src')).toContain('5174')
    expect(after.getAttribute('src')).not.toContain('5173')
  }, 30_000)

  it('cancels the pending probe when the panel unmounts behind a notice', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: serving, status: serving ? 200 : 503 }) as Response),
    )
    const view = render(
      <Wrap provider={providerAtUrl()}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    const container = view.container
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(REVEALED_MS)

    // The app breaks (crash → re-cover) and the DOWN host raises the blank
    // notice; the dead-end probe keeps asking every 3s.
    serving = false
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(400)
    await advance(3_000)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    await advance(4_000) // one probe tick completes, the next is scheduled
    const atUnmount = fetchCalls()

    // Unmount with the probe still scheduled: it must never fire.
    view.unmount()
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
    await act(async () => {
      fireEvent.load(iframe)
    })
    expect(overlay(container)).not.toBeNull()

    // A second load 750ms later for the SAME element: it must retire the first
    // load's grace (which would fire 2500ms after the first load — 1750ms from
    // now — and reveal the preview early) and arm its own.
    await advance(750)
    await act(async () => {
      fireEvent.load(iframe)
    })
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
