// @vitest-environment jsdom

/**
 * The backend-restart escalation watchdog — the LAST recovery the panel may
 * attempt when document reloads provably cannot help (a dev server holding
 * poisoned module state). It runs on its own interval against live refs, so
 * its guards are what keep it from asking a host to restart a serving,
 * building or already-restarted app:
 *
 * - a tick that lands while its own probe is still in flight does nothing,
 * - a server that does not answer RIGHT NOW gets no restart (the dead-end probe
 *   owns a down server), and
 * - an answer that arrives after the app confirmed a render is discarded.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewProvider } from '@molecule/app-live-preview'

import {
  buildPreviewProvider,
  currentIframe,
  frameSrc,
  installStubClassMap,
  type MountedPanel,
  mountWithIframe,
  postFromPreview,
  q,
  settle,
} from './preview-panel-harness.js'

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

/**
 * Advances fake timers the way React's `act` hands the React panel a window of
 * timer callbacks: the window's timers run against the state they started from
 * (React commits the state updates they produce when the act scope ends) and
 * the panel renders once afterwards. The headless session behind the Svelte
 * panel commits on microtasks instead, so stepping it timer by timer would let
 * the stuck detector's per-load cycle counter reset between recovery reloads —
 * a sequence the React panel never observes.
 *
 * @param ms - Fake-timer milliseconds to advance.
 */
const advance = async (ms: number): Promise<void> => {
  vi.advanceTimersByTime(ms)
  await vi.advanceTimersByTimeAsync(0)
  flushSync()
}

/** What the preview host answers: serving, down, or "still thinking". */
type Answer = 'up' | 'down' | 'hang'

let answer: Answer = 'up'
let pending: Array<(response: Response) => void> = []

/** Installs the scriptable server-up probe, so the escalation's own probe can be held open. */
function installFetch(): void {
  answer = 'up'
  pending = []
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      if (answer === 'hang') {
        return new Promise<Response>((resolve) => {
          pending.push(resolve)
        })
      }
      return Promise.resolve(new Response(null, { status: answer === 'up' ? 200 : 503 }))
    }),
  )
}

/** Answer the held-open probe and let the awaiting chain settle. */
async function settleProbe(response: Response): Promise<void> {
  // A tick may have opened its own probe while the escalation's was held: answer
  // every held probe so the escalation's continuation always runs.
  const held = pending
  pending = []
  for (const resolve of held) resolve(response)
  // Drain the awaiting chains' microtasks, then let Svelte render the result.
  await vi.advanceTimersByTimeAsync(0)
  flushSync()
}

beforeEach(() => {
  installStubClassMap()
  installFetch()
  vi.useFakeTimers()
})

afterEach(async () => {
  vi.useRealTimers()
  await panel?.dispose()
  panel = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Mounts the panel and drives the server-up poll so the iframe mounts. */
async function mountPanelWithIframe(
  restart: () => Promise<boolean>,
): Promise<MountedPanel & { provider: PreviewProvider }> {
  const provider = buildPreviewProvider()
  const mounted = await mountWithIframe(provider, { isBuilding: false, onRestartBackend: restart })
  panel = mounted
  return { ...mounted, provider }
}

/** Drive the panel to the state the watchdog escalates from: a spent loop breaker + one auto-reload. */
async function burnDeadEndBudget(container: HTMLElement): Promise<void> {
  // Nothing ever renders and the document never loads: the absolute ceiling
  // gives up to the loop breaker…
  await advance(31_000)
  expect(q(container, 'preview-load-failed')).not.toBeNull()
  // …and the dead-end probe sees the serving host and runs the retry itself,
  // which clears the notice and cache-busts the document.
  await advance(3_200)
  expect(q(container, 'preview-load-failed')).toBeNull()
  expect(frameSrc(container)).toContain('_r=')
}

describe('PreviewPanel — backend-restart escalation guards', () => {
  it('a tick that overlaps the in-flight probe neither stacks a probe nor loses the verdict (one restart)', async () => {
    const restart = vi.fn<() => Promise<boolean>>(async () => true)
    const { container } = await mountPanelWithIframe(restart)
    await burnDeadEndBudget(container)

    // Past the 3-minute clock the watchdog opens its own probe; hold it open so
    // the next 10s tick lands while it is in flight.
    answer = 'hang'
    await advance(150_000)
    expect(restart).not.toHaveBeenCalled()
    await advance(10_000)
    expect(restart).not.toHaveBeenCalled()

    // The single held-open probe then answers UP: the escalation runs exactly
    // once (the overlapping tick neither duplicated nor dropped it)…
    await settleProbe(new Response(null, { status: 200 }))
    await advance(100)
    expect(restart).toHaveBeenCalledTimes(1)

    // …and the episode is spent: later ticks do not ask again.
    await advance(30_000)
    expect(restart).toHaveBeenCalledTimes(1)
    expect(currentIframe(container)).not.toBeNull()
  }, 60_000)

  it('a DOWN answer to that probe escalates nothing (a down host needs waking, not a restart)', async () => {
    const restart = vi.fn<() => Promise<boolean>>(async () => true)
    const { container } = await mountPanelWithIframe(restart)
    await burnDeadEndBudget(container)

    answer = 'hang'
    await advance(150_000)
    // The probe's answer is DOWN — the dead-end machinery owns a down server.
    answer = 'down'
    await settleProbe(new Response(null, { status: 503 }))
    await advance(30_000)
    expect(restart).not.toHaveBeenCalled()
    // The panel keeps its honest notice up rather than restarting anything.
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  }, 60_000)

  it('discards a probe answer that arrives after the app confirmed a render (no restart burned)', async () => {
    const restart = vi.fn<() => Promise<boolean>>(async () => true)
    const { container } = await mountPanelWithIframe(restart)
    await burnDeadEndBudget(container)

    // The escalation probe is open when the app finally renders.
    answer = 'hang'
    await advance(150_000)
    postFromPreview({ type: 'molecule:ready' })
    await advance(1_000)

    // Its UP answer lands after the confirmation: the post-await re-check must
    // decline the escalation.
    await settleProbe(new Response(null, { status: 200 }))
    await advance(30_000)
    expect(restart).not.toHaveBeenCalled()
  }, 60_000)

  it('never asks twice in one broken stretch, even after a fresh give-up and auto-reload', async () => {
    const restart = vi.fn<() => Promise<boolean>>(async () => true)
    const { container, provider } = await mountPanelWithIframe(restart)
    await burnDeadEndBudget(container)

    // The episode's ONE restart: past the clock, the probe answers UP.
    answer = 'hang'
    await advance(150_000)
    answer = 'up'
    await settleProbe(new Response(null, { status: 200 }))
    await advance(100)
    expect(restart).toHaveBeenCalledTimes(1)

    // The app is STILL broken (no render ever confirmed). A refresh re-arms the
    // ceiling, which gives up again and burns another dead-end reload — the
    // watchdog's next tick must see the already-used restart and stand down.
    provider.refresh()
    await settle()
    await advance(31_000)
    expect(q(container, 'preview-load-failed')).not.toBeNull()
    await advance(3_200)
    // The dead-end probe recovered the notice (a serving host) — so every gate
    // but "already restarted this episode" is satisfied now.
    expect(q(container, 'preview-load-failed')).toBeNull()
    await advance(10_000)
    expect(restart).toHaveBeenCalledTimes(1)
  }, 60_000)
})
