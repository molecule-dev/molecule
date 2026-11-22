// @vitest-environment jsdom

/**
 * The backend-restart escalation watchdog — the LAST recovery the panel may
 * attempt when document reloads provably cannot help (a dev server holding
 * poisoned module state). It runs on its own 10s interval against live refs,
 * so its guards are what keep it from asking a host to restart a serving,
 * building or already-restarted app:
 *
 * - a tick that lands while its own probe is still in flight does nothing,
 * - a server that does not answer RIGHT NOW gets no restart (the dead-end probe
 *   owns a down server), and
 * - an answer that arrives after the app confirmed a render is discarded.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.backend-restart.test.tsx`
 * with the same test names and the same assertions: the Vue panel is a view over the
 * same shared behaviour (`createPreviewPanelSession`), so a real jsdom render of
 * {@link PreviewPanel} driven by a real iframe preview provider must reach the same
 * decisions React's panel reaches. Fake timers drive the 3-minute escalation clock; the
 * session's microtask flush plus Vue's next-tick render replace React's `act()`.
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
  providerAtUrl,
  q,
  responseOf,
  settle,
} from './preview-panel-harness.js'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * The preview iframe's `src` attribute (empty when no iframe is rendered).
 *
 * @param container - The mount container.
 * @returns The `src` attribute.
 */
const src = (container: HTMLElement): string =>
  container.querySelector('iframe')?.getAttribute('src') ?? ''

/**
 * Advances the fake clock, then flushes the microtasks the session's updates queue.
 *
 * The clock is advanced SYNCHRONOUSLY (`vi.advanceTimersByTime`) and the queued updates
 * are flushed once afterwards. React's reference test wraps `vi.advanceTimersByTimeAsync`
 * in `act()`, which likewise defers every render the interval and timer callbacks cause
 * until the advance ends; the session applies its updates on a microtask and Vue renders
 * on its next-tick flush, so the settle after the advance is what reproduces that single
 * batch. (Advancing asynchronously instead would re-render — and so re-run the panel's
 * effects — between two fake ticks, which React's `act()` never does.)
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once the queued updates rendered.
 */
const advance = async (ms: number): Promise<void> => {
  vi.advanceTimersByTime(ms)
  await settle()
}

/** What the preview host answers: serving, down, or "still thinking". */
type Answer = 'up' | 'down' | 'hang'

/** The answer the stubbed `fetch` gives next. */
let answer: Answer = 'up'
/** The resolvers of the probes held open by the `hang` answer. */
let pending: Array<(response: Response) => void> = []

/**
 * Installs a scriptable server-up probe, so the escalation's own probe can be held open.
 */
function installFetch(): void {
  answer = 'up'
  pending = []
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() => {
      if (answer === 'hang') {
        return new Promise<Response>((resolve) => {
          pending.push(resolve)
        })
      }
      return Promise.resolve(responseOf(answer === 'up'))
    }),
  )
}

/**
 * Answers the held-open probe(s) and lets the awaiting chain settle.
 *
 * @param response - What the probe answers.
 * @returns Resolves once the chain settled.
 */
async function settleProbe(response: Response): Promise<void> {
  // A tick may have opened its own probe while the escalation's was held: answer
  // every held probe so the escalation's continuation always runs.
  const held = pending
  pending = []
  for (const resolve of held) resolve(response)
  await settle()
}

beforeEach(() => {
  setClassMap(classMap)
  installFetch()
  vi.useFakeTimers()
})

afterEach(() => {
  for (const panel of mounted.splice(0)) panel.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Mounts the panel and drives the server-up poll so the iframe mounts.
 *
 * @param restart - The host's backend-restart handler.
 * @returns The mounted panel and the provider.
 */
async function mountWithRestart(
  restart: () => Promise<boolean>,
): Promise<{ container: HTMLElement; provider: ReturnType<typeof providerAtUrl> }> {
  const provider = providerAtUrl()
  const panel = mountPanel(provider, { isBuilding: false, onRestartBackend: restart })
  mounted.push(panel)
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  expect(panel.container.querySelector('iframe')).not.toBeNull()
  return { container: panel.container, provider }
}

/**
 * Drives the panel to the state the watchdog escalates from: a spent loop breaker
 * plus one auto-reload.
 *
 * @param container - The mount container.
 * @returns Resolves once the dead-end reload ran.
 */
async function burnDeadEndBudget(container: HTMLElement): Promise<void> {
  // Nothing ever renders and the document never loads: the absolute ceiling
  // gives up to the loop breaker…
  await advance(31_000)
  expect(q(container, 'preview-load-failed')).not.toBeNull()
  // …and the dead-end probe sees the serving host and runs the retry itself,
  // which clears the notice and cache-busts the document.
  await advance(3_200)
  expect(q(container, 'preview-load-failed')).toBeNull()
  expect(src(container)).toContain('_r=')
}

describe('PreviewPanel — backend-restart escalation guards', () => {
  it('a tick that overlaps the in-flight probe neither stacks a probe nor loses the verdict (one restart)', async () => {
    const restart = vi.fn<() => Promise<boolean>>(async () => true)
    const { container } = await mountWithRestart(restart)
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
    await settleProbe(responseOf(true))
    await advance(100)
    expect(restart).toHaveBeenCalledTimes(1)

    // …and the episode is spent: later ticks do not ask again.
    await advance(30_000)
    expect(restart).toHaveBeenCalledTimes(1)
  }, 60_000)

  it('a DOWN answer to that probe escalates nothing (a down host needs waking, not a restart)', async () => {
    const restart = vi.fn<() => Promise<boolean>>(async () => true)
    const { container } = await mountWithRestart(restart)
    await burnDeadEndBudget(container)

    answer = 'hang'
    await advance(150_000)
    // The probe's answer is DOWN — the dead-end machinery owns a down server.
    answer = 'down'
    await settleProbe(responseOf(false))
    await advance(30_000)
    expect(restart).not.toHaveBeenCalled()
    // The panel keeps its honest notice up rather than restarting anything.
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  }, 60_000)

  it('discards a probe answer that arrives after the app confirmed a render (no restart burned)', async () => {
    const restart = vi.fn<() => Promise<boolean>>(async () => true)
    const { container } = await mountWithRestart(restart)
    await burnDeadEndBudget(container)

    // The escalation probe is open when the app finally renders.
    answer = 'hang'
    await advance(150_000)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(1_000)

    // Its UP answer lands after the confirmation: the post-await re-check must
    // decline the escalation.
    await settleProbe(responseOf(true))
    await advance(30_000)
    expect(restart).not.toHaveBeenCalled()
  }, 60_000)

  it('never asks twice in one broken stretch, even after a fresh give-up and auto-reload', async () => {
    const restart = vi.fn<() => Promise<boolean>>(async () => true)
    const { container, provider } = await mountWithRestart(restart)
    await burnDeadEndBudget(container)

    // The episode's ONE restart: past the clock, the probe answers UP.
    answer = 'hang'
    await advance(150_000)
    answer = 'up'
    await settleProbe(responseOf(true))
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
