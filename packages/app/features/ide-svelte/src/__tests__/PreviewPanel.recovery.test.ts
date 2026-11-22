// @vitest-environment jsdom

/**
 * The recovery budgets: the stale-document auto-reload (loaded but never
 * rendered → reload, bounded by MAX_LOAD_RECOVERS), the dead-end probe that
 * keeps asking a down host while an actionable notice is up and runs the
 * manual-retry path itself once it answers (bounded by
 * MAX_DEAD_END_AUTO_RECOVERS, standing down while the app is still
 * heartbeating), and the backend-restart escalation's once-per-episode budget
 * and cooldown.
 *
 * A port of `@molecule/app-ide-react`'s `PreviewPanel.recovery.test.tsx` with
 * the same test names and the same behavioural assertions: a real jsdom render
 * of the Svelte `PreviewPanel` (through the shared
 * `createPreviewPanelSession`), driven by the package's recording live-preview
 * provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewProvider } from '@molecule/app-live-preview'

import type { PreviewPanelProps } from '../types.js'
import {
  advance,
  buildPreviewProvider,
  fireFrameLoad,
  frameSrc,
  installStubClassMap,
  type MountedPanel,
  mountWithIframe,
  postFromPreview,
  q,
} from './preview-panel-harness.js'

/** A fetch stub whose responses come from a mutable `serving` flag. */
function servingFetch(state: { serving: boolean }): ReturnType<typeof vi.fn> {
  return vi.fn(async () => new Response(null, { status: state.serving ? 200 : 503 }))
}

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

/**
 * Steps in half-second slices until the iframe's src changes (the dead-end
 * probe's auto-retry mounting a fresh, cache-busted document), or the budget
 * runs out. The session flushes its state on a microtask after each timer, so
 * a fixed multi-second jump can land between the probe's timer and its
 * continuation; stepping to the observable milestone is the Svelte-flush form
 * of React's `act`ed advance.
 *
 * @param container - The element the panel rendered into.
 * @param previous - The src before the wait.
 * @param budgetMs - How long to wait before giving up.
 * @returns The src the iframe carries when the wait ends.
 */
async function waitForReload(
  container: HTMLElement,
  previous: string,
  budgetMs = 15_000,
): Promise<string> {
  for (let waited = 0; waited < budgetMs; waited += 500) {
    await advance(500)
    const next = frameSrc(container)
    if (next !== previous) return next
  }
  return frameSrc(container)
}

/** Mount + drive the server-up poll so the iframe mounts. */
async function mountPanel(
  props: PreviewPanelProps = { isBuilding: false },
  provider: PreviewProvider = buildPreviewProvider(),
): Promise<MountedPanel & { iframe: HTMLIFrameElement; provider: PreviewProvider }> {
  const mounted = await mountWithIframe(provider, props)
  panel = mounted
  return { ...mounted, provider }
}

describe('PreviewPanel — stale-document auto-recovery budget', () => {
  it('reloads a loaded-but-unrendered document at most twice per load chain, then stops', async () => {
    const state = { serving: true }
    vi.stubGlobal('fetch', servingFetch(state))
    const { container, iframe } = await mountPanel()
    fireFrameLoad(iframe)
    const src0 = frameSrc(container)

    // Recovery 1 at LOAD_RECOVER_AFTER_MS: the server is up, the document is
    // loaded but dead (no heartbeat) → one cache-busted reload.
    await advance(12_500)
    const src1 = frameSrc(container)
    expect(src1).not.toBe(src0)
    expect(src1).toContain('_r=')
    const first = container.querySelector('iframe')
    if (!first) throw new Error('the preview iframe went away')
    fireFrameLoad(first)

    // Recovery 2 on the reloaded document…
    await advance(12_500)
    const src2 = frameSrc(container)
    expect(src2).not.toBe(src1)
    const second = container.querySelector('iframe')
    if (!second) throw new Error('the preview iframe went away')
    fireFrameLoad(second)

    // …and the budget is spent: with the server now DOWN (so the dead-end
    // probe cannot add its own reloads either), the src must never move again
    // — the third 12s window passes with no reload.
    state.serving = false
    await advance(15_000)
    const src3 = frameSrc(container)
    expect(src3).toBe(src2)
  }, 30_000)

  it('never interrupts a document whose bridge is still alive (liveness is the loading signal)', async () => {
    const { container, iframe } = await mountPanel()
    fireFrameLoad(iframe)
    // A big cold module graph: loaded, no ready yet, but the inline bridge
    // heartbeats throughout — recovery must stand down, however long it takes.
    const src0 = frameSrc(container)
    for (let t = 0; t < 6; t++) {
      postFromPreview({ type: 'molecule:heartbeat' })
      await advance(3_000)
    }
    await advance(3_000)
    expect(frameSrc(container)).toBe(src0)
    expect(frameSrc(container)).not.toContain('_r=')
  }, 30_000)

  it('a recovery probe against a server that just went down recovers nothing', async () => {
    const state = { serving: true }
    vi.stubGlobal('fetch', servingFetch(state))
    const { container, iframe } = await mountPanel()
    fireFrameLoad(iframe)
    // The document is stale and dead — but the server dropped too: the 12s
    // check runs, gets no answer, and leaves the frame alone (the dead-end
    // probe's own retry loop owns the down-server case).
    const src0 = frameSrc(container)
    state.serving = false
    await advance(13_000)
    expect(frameSrc(container)).toBe(src0)
    expect(frameSrc(container)).not.toContain('_r=')
  }, 30_000)
})

describe('PreviewPanel — dead-end auto-recovery budget', () => {
  it('auto-recovers from the blank notice while the budget lasts, then stands down at the cap', async () => {
    const { container, iframe } = await mountPanel()
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)

    // The budget counts notice EPISODES, and a confirmed render refunds it —
    // so the cap is reached through episodes that never reveal: the recovered
    // document loads, then breaks again at once (a crash inside the grace
    // window also suppresses the grace reveal), the blank notice returns, and
    // 3s later the probe sees the serving host and runs the manual-retry path
    // itself.
    const crash = (): void => {
      postFromPreview({ type: 'molecule:error', crash: true })
    }
    const reprime = (): void => {
      const current = container.querySelector('iframe')
      if (!current) throw new Error('the preview iframe went away')
      fireFrameLoad(current)
      crash()
    }

    // Episode 1 (from the revealed state): the crash re-covers, the notice
    // raises, and the probe's FIRST tick still sees the reveal's heartbeat
    // baseline as alive — it re-checks 3s later, then recovers.
    crash()
    await advance(400)
    await advance(2_600) // the notice is up
    // The probe's FIRST tick may still see the reveal's heartbeat baseline as
    // alive and re-check 3s later — step to the recovery either way.
    const src1 = await waitForReload(container, frameSrc(container))
    expect(src1).toContain('_r=')

    // Episodes 2 and 3: re-prime (load + immediate crash → no reveal, so the
    // budget is NOT refunded), notice returns, probe recovers.
    reprime()
    await advance(400) // the crash lands inside the grace window
    await advance(2_600) // the notice returns
    const src2 = await waitForReload(container, frameSrc(container))
    reprime()
    await advance(400)
    await advance(2_600)
    const src3 = await waitForReload(container, frameSrc(container))
    expect(src2).not.toBe(src1)
    expect(src3).not.toBe(src2)
    expect(src3).toContain('_r=')

    // The budget is spent: a FOURTH notice episode probes nothing — the cap
    // returns before any fetch — and never reloads.
    reprime()
    await advance(400)
    await advance(2_600)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    const calls = (): number => vi.mocked(fetch).mock.calls.length
    const fetchBefore = calls()
    const settled = frameSrc(container)
    await advance(8_000) // past two probe ticks
    expect(calls()).toBe(fetchBefore)
    expect(frameSrc(container)).toBe(settled)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — backend-restart escalation', () => {
  it('escalates once per episode and honors the cooldown before a SECOND episode may escalate', async () => {
    const restartSpy = vi.fn(async () => true)
    const { container } = await mountPanel({ isBuilding: false, onRestartBackend: restartSpy })

    // Episode 1: nothing ever renders. The absolute ceiling gives up (~30s),
    // the dead-end probe burns a reload against a serving host, and past the
    // 3-minute escalation clock the panel asks the host to restart the dev
    // server exactly once.
    await advance(40_000)
    expect(restartSpy).not.toHaveBeenCalled()
    await advance(145_000)
    expect(restartSpy).toHaveBeenCalledTimes(1)

    // Episode 2: the restarted app renders once (re-arming the episode
    // budget — and holding the reveal long enough that the watchdog's next
    // tick sees a CONFIRMED preview and stands down), then breaks again — a
    // crash re-covers it, a loaded-but-blank reload raises the notice and
    // burns a fresh dead-end reload.
    postFromPreview({ type: 'molecule:ready' })
    await advance(12_000)
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(1_000)
    const current = container.querySelector('iframe')
    if (!current) throw new Error('the preview iframe went away')
    fireFrameLoad(current)
    // Past the notice window the dead-end probe re-engages…
    await advance(10_000)
    // …but the COOLDOWN still blocks a second escalation for 10 minutes from
    // the first restart, even with every other gate satisfied.
    await advance(200_000)
    expect(restartSpy).toHaveBeenCalledTimes(1)

    // Past the cooldown (600s after the first restart at ~185s → ~785s), the
    // second episode may escalate. (~819s here, safely past the boundary.)
    await advance(420_000)
    expect(restartSpy).toHaveBeenCalledTimes(2)
    // …and the fresh episode budget is spent again: no third call.
    await advance(60_000)
    expect(restartSpy).toHaveBeenCalledTimes(2)
  }, 60_000)

  it('keeps re-probing a DOWN server behind the notice (no recovery, no crash), and unmounts cleanly mid-probe', async () => {
    const state = { serving: true }
    vi.stubGlobal('fetch', servingFetch(state))
    const { container, iframe } = await mountPanel()
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)

    // The app breaks; the notice raises; the server is DOWN: the probe must
    // keep asking every 3s (never recovering) while the notice stays up.
    state.serving = false
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(400)
    await advance(3_000)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    const src0 = frameSrc(container)
    const calls0 = vi.mocked(fetch).mock.calls.length
    await advance(10_000)
    const calls1 = vi.mocked(fetch).mock.calls.length
    expect(calls1).toBeGreaterThan(calls0)
    expect(frameSrc(container)).toBe(src0)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    // …and the panel unmounts cleanly with the probe still scheduled.
    await panel?.dispose()
    panel = null
    await advance(5_000)
    expect(vi.mocked(fetch).mock.calls.length).toBe(calls1)
  }, 30_000)

  it('skips ticks while a probe is in flight, and a DOWN probe answer escalates nothing', async () => {
    const restartSpy = vi.fn(async () => true)
    // Mount + the dead-end recover answer UP; the ESCALATION's own probe
    // (past the 3-minute clock, every other gate satisfied) hangs, then
    // answers DOWN forever — so no tick overlaps a probe and nothing ever
    // escalates against a host that cannot serve.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    let calls = 0
    let hung = false
    const fetchSpy = vi.fn(() => {
      calls += 1
      if (calls <= 2) return Promise.resolve(new Response(null, { status: 200 }))
      if (!hung) {
        hung = true
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve(new Response(null, { status: 503 }))
    })
    vi.stubGlobal('fetch', fetchSpy)
    await mountPanel({ isBuilding: false, onRestartBackend: restartSpy })
    // Nothing ever renders: the ceiling gives up (~30s), the dead-end probe
    // burns its one reload (deadEnd ≥ 1) — and from then on every server
    // answer is DOWN, so the escalation has nothing to escalate against.
    await advance(200_000)
    expect(restartSpy).not.toHaveBeenCalled()
  }, 30_000)

  it('a probe answer landing after the app re-confirmed burns nothing', async () => {
    const restartSpy = vi.fn(async () => true)
    // Same shape, but the hanging probe finally answers UP — after the app
    // confirmed a render while it was in flight: the post-await re-check must
    // decline the escalation.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    let calls = 0
    let hung = false
    const fetchSpy = vi.fn(() => {
      calls += 1
      if (calls <= 2) return Promise.resolve(new Response(null, { status: 200 }))
      if (!hung) {
        hung = true
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve(new Response(null, { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchSpy)
    await mountPanel({ isBuilding: false, onRestartBackend: restartSpy })
    // Nothing renders for the first ~3 minutes (the ceiling gives up, the
    // dead-end budget is spent)… at ~185s the escalation's probe is hanging.
    await advance(185_000)
    expect(restartSpy).not.toHaveBeenCalled()
    // …and while it hangs, the app finally confirms a render.
    postFromPreview({ type: 'molecule:ready' })
    await advance(2_000)
    release.resolve?.(new Response(null, { status: 200 }))
    await advance(30_000)
    expect(restartSpy).not.toHaveBeenCalled()
  }, 30_000)
})
