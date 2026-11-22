// @vitest-environment jsdom

/**
 * The steady-state machinery around a REVEALED preview: the freeze watchdog
 * (visibility-aware — a hidden tab is throttled, not frozen), the once-per-
 * episode frozen report, the health check's down verdict and its
 * recovery-poll guard against a superseded target, the server-up probe's
 * external-abort path, and the render verdict the host forwards.
 *
 * A port of `@molecule/app-ide-react`'s `PreviewPanel.health.test.tsx` with the
 * same test names and the same behavioural assertions, driving a real jsdom
 * render of the Svelte `PreviewPanel` under fake timers.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewRenderState, PreviewStuckReport } from '@molecule/app-ide-panel-logic'

import type { PreviewPanelProps } from '../types.js'
import {
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
 * Advances the fake clock the way React's `act()` defers its renders: the session's
 * own renders (queued on `queueMicrotask` by the headless hooks runtime) are held for
 * the whole advance and released as ONE batch at the end, while the promises the
 * probes await still settle inside it. That single deferred batch is what React's
 * `act(async () => vi.advanceTimersByTimeAsync(ms))` produces, and the health check's
 * verdict-vs-recovery ordering depends on it: a recovery answer that lands inside the
 * advance is applied in the same batch as the verdict, and one that lands after the
 * advance (a held-open probe released later) still finds the chain torn down.
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

/** Mounts the panel over a fresh provider at the preview URL, tracking it for teardown. */
function mountTracked(
  props: PreviewPanelProps = {},
  provider: StubPreviewProvider = buildPreviewProvider({ currentUrl: PREVIEW_URL }),
): MountedPanel {
  const mounted = mountPanel(provider, props)
  panel = mounted
  return mounted
}

/**
 * Override jsdom's visibilityState and announce the change.
 *
 * @param state - The new visibility state.
 */
async function setVisibility(state: 'visible' | 'hidden'): Promise<void> {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
    writable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
  await advance(0)
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
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
    writable: true,
  })
  vi.useRealTimers()
  await panel?.dispose()
  panel = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Mount, reveal, and settle — the state every steady-state effect needs. */
async function mountRevealed(callbacks?: {
  onPreviewStuck?: (report?: PreviewStuckReport) => void
  onRenderState?: (state: PreviewRenderState, url?: string) => void
}): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const { container } = mountTracked({
    isBuilding: false,
    onPreviewStuck: callbacks?.onPreviewStuck,
    onRenderState: callbacks?.onRenderState,
  })
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  if (!iframe) throw new Error('the preview iframe never mounted')
  fireFrameLoad(iframe)
  postFromPreview({ type: 'molecule:ready' })
  await advance(700)
  return { container, iframe }
}

describe('PreviewPanel — freeze watchdog vs a backgrounded tab', () => {
  it('never accuses while the tab is hidden, and re-baselines on return (the hidden gap cannot count)', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const { container } = await mountRevealed({ onPreviewStuck })
    for (let i = 0; i < 3; i++) {
      postFromPreview({ type: 'molecule:heartbeat' })
      await advance(1_000)
    }
    // The tab goes to the background: BOTH sides throttle (heartbeats stop
    // being delivered, the check interval wakes once a minute) — that silence
    // is throttling, not a frozen app.
    await setVisibility('hidden')
    await advance(30_000)
    expect(q(container, 'preview-frozen-reload')).toBeNull()
    // A visibilitychange while still hidden changes nothing.
    document.dispatchEvent(new Event('visibilitychange'))
    await advance(0)
    // Back to the foreground: the accumulated gap is forgiven.
    await setVisibility('visible')
    await advance(6_000)
    expect(onPreviewStuck).not.toHaveBeenCalledWith(expect.objectContaining({ reason: 'frozen' }))
    expect(q(container, 'preview-frozen-reload')).toBeNull()
    // …and the watchdog is still live: a REAL post-return silence still fires.
    await advance(12_000)
    expect(onPreviewStuck).toHaveBeenCalledWith(expect.objectContaining({ reason: 'frozen' }))
  }, 30_000)
})

describe('PreviewPanel — frozen report discipline', () => {
  it('reports a freeze ONCE per episode and re-arms after heartbeats resume', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const { container } = await mountRevealed({ onPreviewStuck })
    for (let i = 0; i < 3; i++) {
      postFromPreview({ type: 'molecule:heartbeat' })
      await advance(1_000)
    }
    // The thread locks up: beats stop, every 2s tick re-derives "frozen", but
    // the report must fire exactly once for the episode.
    await advance(30_000)
    const frozenCalls = (): number =>
      onPreviewStuck.mock.calls.filter((c) => c[0]?.reason === 'frozen').length
    expect(frozenCalls()).toBe(1)
    expect(q(container, 'preview-frozen-reload')).not.toBeNull()
    // Beats resume (transient jank): the banner clears and the report re-arms.
    postFromPreview({ type: 'molecule:heartbeat' })
    await advance(4_000)
    expect(q(container, 'preview-frozen-reload')).toBeNull()
    // A second, later freeze is a NEW episode — reported again.
    await advance(30_000)
    expect(frozenCalls()).toBe(2)
  }, 30_000)

  it('a host re-render with a fresh callback mid-freeze does not re-report the same episode', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const mounted = mountTracked({ isBuilding: false, onPreviewStuck })
    const { container } = mounted
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)
    for (let i = 0; i < 3; i++) {
      postFromPreview({ type: 'molecule:heartbeat' })
      await advance(1_000)
    }
    await advance(30_000)
    const frozenCalls = (): number =>
      onPreviewStuck.mock.calls.filter((c) => c[0]?.reason === 'frozen').length
    expect(frozenCalls()).toBe(1)
    // The host re-renders with a FRESH callback identity while the SAME freeze
    // is still showing (a host that inlines the handler does this on every
    // render, which re-runs the report effect): the once-per-episode report
    // must not fire again.
    const onPreviewStuckFresh: NonNullable<PreviewPanelProps['onPreviewStuck']> = (report) => {
      onPreviewStuck(report)
    }
    mounted.setProps({ isBuilding: false, onPreviewStuck: onPreviewStuckFresh })
    await advance(6_000)
    expect(frozenCalls()).toBe(1)
  }, 30_000)
})

describe('PreviewPanel — pre-mount poll cadence', () => {
  it('backs off exponentially while the server never answers (no busy 500ms hammering)', async () => {
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(null, { status: 503 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = mountTracked()
    await advance(20_000)
    expect(container.querySelector('iframe')).toBeNull()
    // 500ms → 1s → 2s → 4s → 8s: under ten probes by 20s. A fixed 500ms
    // cadence (the backoff removed) would have fired ~40 by now.
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(8)
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(4)
  }, 30_000)
})

describe('PreviewPanel — health check down verdict and recovery', () => {
  it('recovers a real outage: the overlay returns on the down verdict and the frame cache-bust-reloads once the server answers', async () => {
    // The document must be quiet for the misses to count (the reveal's
    // heartbeat baseline vetoes them for FREEZE_THRESHOLD_MS), so the misses
    // land on the probes past ~8s; the server then answers UP on the recovery
    // probe that follows the verdict.
    const script = [true, true, true, false, false, true]
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      const up = script.shift() ?? true
      return new Response(null, { status: up ? 200 : 503 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = mountTracked()
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)
    const srcBefore = iframe.getAttribute('src') as string

    // Probes: up, then two misses (the verdict) — the overlay is back…
    await advance(15_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and the recovery probe finds the server up → one cache-busted reload.
    const reloaded = container.querySelector('iframe')
    if (!reloaded) throw new Error('the preview iframe went away')
    expect(reloaded.getAttribute('src')).not.toBe(srcBefore)
    expect(reloaded.getAttribute('src')).toContain('_r=')
  }, 30_000)

  it('discards a recovery-probe answer that lands after the verdict tore the chain down', async () => {
    // The down verdict re-covers the preview, which re-runs (and tears down)
    // the health effect WHILE the recovery probe is still awaiting: the late
    // answer must be dropped — the old target is never reloaded by a dead
    // chain.
    const script = [true, true, true, false, false]
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    let hung = false
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((_url) => {
      if (script.length) {
        const up = script.shift() as boolean
        return Promise.resolve(new Response(null, { status: up ? 200 : 503 }))
      }
      if (!hung) {
        // The recovery probe (the first call after the script empties): hang.
        hung = true
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve(new Response(null, { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = mountTracked()
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)
    const srcBefore = iframe.getAttribute('src') as string

    // The verdict lands while the recovery probe hangs…
    await advance(15_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and only NOW the probe answers UP: the cancelled chain must drop it.
    release.resolve?.(new Response(null, { status: 200 }))
    await advance(2_000)
    const after = container.querySelector('iframe')
    if (!after) throw new Error('the preview iframe went away')
    expect(after.getAttribute('src')).toBe(srcBefore)
  }, 30_000)

  it('a URL change supersedes the in-flight recovery poll (the old target is abandoned, the new one mounts)', async () => {
    let serving = true
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(null, { status: serving ? 200 : 503 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    const { container } = mountTracked({}, provider)
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)

    // The server dies; two quiet misses land the verdict and the overlay.
    serving = false
    await advance(14_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and while the recovery poll is asking the dead server, the host
    // retargets the preview (a wake's new port).
    const next = 'http://localhost:5174/'
    provider.setUrl(next)
    await advance(2_000)
    const after = container.querySelector('iframe')
    if (!after) throw new Error('the preview iframe went away')
    // The NEW target mounted (cache-busted); the OLD one's poll stopped —
    // no reload of the abandoned URL ever landed.
    expect(new URL(after.getAttribute('src') ?? '').host).toBe('localhost:5174')
    expect(after.getAttribute('src')).toContain('_r=')
  }, 30_000)

  it('aborts the in-flight status probe when its poll chain is superseded (no opaque fallback after the abort)', async () => {
    // A status probe that hangs until the panel moves on: the superseded
    // chain's AbortController must kill it, and the aborted probe must NOT
    // fall through to the opaque no-cors probe.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) => {
      if (
        String(url).endsWith('/__mol/preview-status') &&
        String(url).startsWith('http://localhost:5173')
      ) {
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve(new Response(null, { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    const { container } = mountTracked({ isBuilding: false }, provider)
    // The first poll is stuck on the hanging status probe (no iframe yet).
    await advance(600)
    expect(container.querySelector('iframe')).toBeNull()
    // The host retargets → clearPoll aborts the stuck chain…
    provider.setUrl('http://localhost:5174/')
    await advance(50)
    // …and ONLY NOW the hanging probe answers 404: the aborted controller must
    // return false instead of probing the document opaquely.
    release.resolve?.(new Response(null, { status: 404 }))
    await advance(600)
    const opaque = fetchSpy.mock.calls.some((call) => call[1]?.mode === 'no-cors')
    expect(opaque).toBe(false)
    // The new target, whose probe answers fine, mounted normally.
    expect(container.querySelector('iframe')).not.toBeNull()
  }, 30_000)

  it('cancels a health-check probe whose effect was torn down mid-flight', async () => {
    // A revealed preview whose status probe HANGS: the check is awaiting when
    // the host retargets — the cleanup flips `cancelled`, so the probe's
    // answer must be discarded instead of driving the old target.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    let hangStatus = false
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) => {
      if (hangStatus && String(url).endsWith('/__mol/preview-status')) {
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve(new Response(null, { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    const { container } = mountTracked({}, provider)
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)
    // The first steady-state check (t≈+3s) is now hanging on the probe…
    hangStatus = true
    await advance(3_200)
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
    // …when the target changes underneath it.
    provider.setUrl('http://localhost:5174/')
    // The probe finally answers DOWN: the cancelled chain must not act on it.
    release.resolve?.(new Response(null, { status: 503 }))
    await advance(100)
    const after = container.querySelector('iframe')
    if (!after) throw new Error('the preview iframe went away')
    expect(new URL(after.getAttribute('src') ?? '').host).toBe('localhost:5174')
    expect(after.getAttribute('src')).toContain('_r=')
  }, 30_000)

  it('clears its scheduled check on unmount (no probe after the panel is gone)', async () => {
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    const mounted = mountTracked({}, provider)
    const { container } = mounted
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)
    // One steady-state check ran and the next is scheduled (3s cadence):
    // unmounting now must clear it — no fetch escapes after the panel is gone.
    await advance(3_600)
    const callsAtUnmount = fetchSpy.mock.calls.length
    expect(callsAtUnmount).toBeGreaterThanOrEqual(2)
    await mounted.dispose()
    panel = null
    await advance(10_000)
    expect(fetchSpy.mock.calls.length).toBe(callsAtUnmount)
  }, 30_000)
})

describe('PreviewPanel — probe fallbacks and the never-loaded budget', () => {
  it('a host whose status path 404s AND whose document probe fails is down (no mount)', async () => {
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
      if (String(url).endsWith('/__mol/preview-status')) {
        return new Response(null, { status: 404 })
      }
      throw new TypeError('Failed to fetch') // the opaque HEAD probe dies too
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = mountTracked()
    await advance(50_000)
    // Both probe routes failed: the panel keeps polling but never mounts, and
    // past the deadline it surfaces the actionable notice instead.
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.textContent).toContain("Preview can't load here")
  }, 30_000)

  it('a file change never reloads a preview that has not even loaded once', async () => {
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      return new Response(null, { status: 503 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = buildPreviewProvider({ currentUrl: PREVIEW_URL })
    const mounted = mountTracked({ isBuilding: false, fileChangeTick: 0 }, provider)
    const { container } = mounted
    for (let i = 0; i < 8; i++) {
      await advance(500)
    }
    mounted.setProps({ isBuilding: false, fileChangeTick: 1 })
    await advance(3_000)
    // Nothing was ever loaded (the server never answered): edits must not
    // reload a preview that does not exist yet — and no crash escapes.
    expect(container.querySelector('iframe')).toBeNull()
  }, 30_000)
})

describe('PreviewPanel — render verdict (onRenderState)', () => {
  it('emits loading → rendered, and a blank report drops it back to loading until a fresh ready', async () => {
    const onRenderState = vi.fn<(state: PreviewRenderState, url?: string) => void>()
    const { container } = mountTracked({ isBuilding: false, onRenderState })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)
    const states = (): PreviewRenderState[] => onRenderState.mock.calls.map((c) => c[0])
    expect(states()).toEqual(['loading', 'rendered'])
    // A blank report un-confirms the render (the verdict is not 'blank' — that
    // verdict is reserved for the actionable notices; an unconfirmed preview
    // is honestly 'loading').
    postFromPreview({ type: 'molecule:blank' })
    await advance(100)
    expect(states()).toEqual(['loading', 'rendered', 'loading'])
    // A later render confirmation flips it back.
    postFromPreview({ type: 'molecule:ready' })
    await advance(100)
    expect(states()).toEqual(['loading', 'rendered', 'loading', 'rendered'])
  }, 30_000)

  it('emits the blank verdict when the panel gives up to the loop-breaker', async () => {
    const onRenderState = vi.fn<(state: PreviewRenderState, url?: string) => void>()
    const { container } = mountTracked({ isBuilding: false, onRenderState })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    // Nothing ever renders and the document never loads: the absolute ceiling
    // gives up to the loop-breaker — the verdict the server needs is 'blank'.
    await advance(31_000)
    const states = onRenderState.mock.calls.map((c) => c[0])
    expect(states).toContain('blank')
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  }, 30_000)
})
