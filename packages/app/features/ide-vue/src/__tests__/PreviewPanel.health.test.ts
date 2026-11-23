// @vitest-environment jsdom

/**
 * The steady-state machinery around a REVEALED preview: the freeze watchdog
 * (visibility-aware — a hidden tab is throttled, not frozen), the once-per-
 * episode frozen report, the health check's down verdict and its
 * recovery-poll guard against a superseded target, the server-up probe's
 * external-abort path, and the render verdict the host forwards.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.health.test.tsx`
 * with the same test names and the same assertions: the Vue panel is a view over
 * the same shared behaviour (`createPreviewPanelSession`), so a real jsdom render
 * of {@link PreviewPanel} driven by a real iframe preview provider must reach the
 * same decisions React's panel reaches. The harness's `setProps` stands in for
 * React's `rerender`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewRenderState, PreviewStuckReport } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  type MountedPanel,
  mountPanel,
  type PanelProps,
  postFromPreview,
  providerAtUrl,
  q,
  settle,
} from './preview-panel-harness.js'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * Mounts the panel over a provider and tracks it for teardown.
 *
 * @param initial - The host-facing props.
 * @param provider - The live-preview provider (a fresh one when omitted).
 * @returns The mounted panel.
 */
function mount(
  initial: PanelProps = {},
  provider: ReturnType<typeof providerAtUrl> = providerAtUrl(),
): MountedPanel {
  const panel = mountPanel(provider, initial)
  mounted.push(panel)
  return panel
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
    await settle()
  } finally {
    globalThis.queueMicrotask = realQueueMicrotask
  }
  for (const callback of held) callback()
  await settle()
}

/**
 * Overrides jsdom's visibilityState and announces the change.
 *
 * @param state - The new visibility state.
 * @returns Resolves once the view re-rendered.
 */
async function setVisibility(state: 'visible' | 'hidden'): Promise<void> {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
    writable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
  await settle()
}

/**
 * Mounts the panel and waits until its iframe appears.
 *
 * @param initial - The host-facing props.
 * @param provider - The live-preview provider (a fresh one when omitted).
 * @returns The mounted panel and its iframe.
 */
async function mountWithIframe(
  initial: PanelProps = {},
  provider: ReturnType<typeof providerAtUrl> = providerAtUrl(),
): Promise<{ panel: MountedPanel; container: HTMLElement; iframe: HTMLIFrameElement }> {
  const panel = mount(initial, provider)
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = panel.container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { panel, container: panel.container, iframe }
}

/**
 * Mounts, reveals, and settles — the state every steady-state effect needs.
 *
 * @param callbacks - The host callbacks the test observes.
 * @returns The mount container and its iframe.
 */
async function mountRevealed(
  callbacks: {
    onPreviewStuck?: (report?: PreviewStuckReport) => void
    onRenderState?: (state: PreviewRenderState, url?: string) => void
  } = {},
): Promise<{ panel: MountedPanel; container: HTMLElement; iframe: HTMLIFrameElement }> {
  const { panel, container, iframe } = await mountWithIframe({
    isBuilding: false,
    onPreviewStuck: callbacks.onPreviewStuck,
    onRenderState: callbacks.onRenderState,
  })
  iframe.dispatchEvent(new Event('load'))
  await settle()
  await postFromPreview(container, { type: 'molecule:ready' })
  await advance(700)
  return { panel, container, iframe }
}

beforeEach(() => {
  setClassMap(classMap)
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => ({ ok: true, status: 200 }) as Response),
  )
  vi.useFakeTimers()
})

afterEach(() => {
  for (const panel of mounted.splice(0)) panel.unmount()
  document.body.innerHTML = ''
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
    writable: true,
  })
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PreviewPanel — freeze watchdog vs a backgrounded tab', () => {
  it('never accuses while the tab is hidden, and re-baselines on return (the hidden gap cannot count)', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const { container } = await mountRevealed({ onPreviewStuck })
    for (let i = 0; i < 3; i++) {
      await postFromPreview(container, { type: 'molecule:heartbeat' })
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
    await settle()
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
      await postFromPreview(container, { type: 'molecule:heartbeat' })
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
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    await advance(4_000)
    expect(q(container, 'preview-frozen-reload')).toBeNull()
    // A second, later freeze is a NEW episode — reported again.
    await advance(30_000)
    expect(frozenCalls()).toBe(2)
  }, 30_000)

  it('a host re-render with a fresh callback mid-freeze does not re-report the same episode', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const provider = providerAtUrl()
    const panel = mount({ isBuilding: false, onPreviewStuck }, provider)
    for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = panel.container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(panel.container, { type: 'molecule:ready' })
    await advance(700)
    for (let i = 0; i < 3; i++) {
      await postFromPreview(panel.container, { type: 'molecule:heartbeat' })
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
    const onPreviewStuckFresh = (report?: PreviewStuckReport): void => {
      onPreviewStuck(report)
    }
    await panel.setProps({ onPreviewStuck: onPreviewStuckFresh })
    await advance(6_000)
    expect(frozenCalls()).toBe(1)
  }, 30_000)
})

describe('PreviewPanel — pre-mount poll cadence', () => {
  it('backs off exponentially while the server never answers (no busy 500ms hammering)', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => ({ ok: false, status: 503 }) as Response)
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = mount({ isBuilding: false })
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
    const fetchSpy = vi.fn<typeof fetch>(async () => {
      const up = script.shift() ?? true
      return { ok: up, status: up ? 200 : 503 } as Response
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container, iframe } = await mountWithIframe({ isBuilding: false })
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)
    const srcBefore = iframe.getAttribute('src')

    // Probes: up, then two misses (the verdict) — the overlay is back…
    await advance(15_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and the recovery probe finds the server up → one cache-busted reload.
    const reloaded = container.querySelector('iframe')
    expect(reloaded).not.toBeNull()
    expect(reloaded!.getAttribute('src')).not.toBe(srcBefore)
    expect(reloaded?.getAttribute('src')).toContain('_r=')
  }, 30_000)

  it('discards a recovery-probe answer that lands after the verdict tore the chain down', async () => {
    // The down verdict re-covers the preview, which re-runs (and tears down)
    // the health effect WHILE the recovery probe is still awaiting: the late
    // answer must be dropped — the old target is never reloaded by a dead
    // chain.
    const script = [true, true, true, false, false]
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    let hung = false
    const fetchSpy = vi.fn<typeof fetch>(() => {
      if (script.length) {
        const up = script.shift() as boolean
        return Promise.resolve({ ok: up, status: up ? 200 : 503 } as Response)
      }
      if (!hung) {
        // The recovery probe (the first call after the script empties): hang.
        hung = true
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve({ ok: true, status: 200 } as Response)
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container, iframe } = await mountWithIframe({ isBuilding: false })
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)
    const srcBefore = iframe.getAttribute('src')

    // The verdict lands while the recovery probe hangs…
    await advance(15_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and only NOW the probe answers UP: the cancelled chain must drop it.
    release.resolve?.({ ok: true, status: 200 } as Response)
    await advance(2_000)
    const after = container.querySelector('iframe')
    expect(after?.getAttribute('src')).toBe(srcBefore)
  }, 30_000)

  it('a URL change supersedes the in-flight recovery poll (the old target is abandoned, the new one mounts)', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => ({ ok: serving, status: serving ? 200 : 503 }) as Response),
    )
    const provider = providerAtUrl()
    const { container, iframe } = await mountWithIframe({ isBuilding: false }, provider)
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)

    // The server dies; two quiet misses land the verdict and the overlay.
    serving = false
    await advance(14_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and while the recovery poll is asking the dead server, the host
    // retargets the preview (a wake's new port).
    const next = 'http://localhost:5174/'
    provider.setUrl(next)
    await settle()
    await advance(2_000)
    const after = container.querySelector('iframe')
    // The NEW target mounted (cache-busted); the OLD one's poll stopped —
    // no reload of the abandoned URL ever landed.
    expect(new URL(after?.getAttribute('src') ?? '').host).toBe('localhost:5174')
    expect(after?.getAttribute('src')).toContain('_r=')
  }, 30_000)

  it('aborts the in-flight status probe when its poll chain is superseded (no opaque fallback after the abort)', async () => {
    // A status probe that hangs until the panel moves on: the superseded
    // chain's AbortController must kill it, and the aborted probe must NOT
    // fall through to the opaque no-cors probe.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    const fetchSpy = vi.fn<typeof fetch>((input: RequestInfo | URL) => {
      if (
        String(input).endsWith('/__mol/preview-status') &&
        String(input).startsWith('http://localhost:5173')
      ) {
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve({ ok: true, status: 200 } as Response)
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = providerAtUrl()
    const { container } = mount({ isBuilding: false }, provider)
    // The first poll is stuck on the hanging status probe (no iframe yet).
    await advance(600)
    expect(container.querySelector('iframe')).toBeNull()
    // The host retargets → clearPoll aborts the stuck chain…
    provider.setUrl('http://localhost:5174/')
    await settle()
    await advance(50)
    // …and ONLY NOW the hanging probe answers 404: the aborted controller must
    // return false instead of probing the document opaquely.
    release.resolve?.({ ok: false, status: 404 } as Response)
    await advance(600)
    const opaque = fetchSpy.mock.calls.some(
      (call) => (call[1] as RequestInit | undefined)?.mode === 'no-cors',
    )
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
    const fetchSpy = vi.fn<typeof fetch>((input: RequestInfo | URL) => {
      if (hangStatus && String(input).endsWith('/__mol/preview-status')) {
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve({ ok: true, status: 200 } as Response)
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = providerAtUrl()
    const { container, iframe } = await mountWithIframe({ isBuilding: false }, provider)
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)
    // The first steady-state check (t≈+3s) is now hanging on the probe…
    hangStatus = true
    await advance(3_200)
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
    // …when the target changes underneath it.
    provider.setUrl('http://localhost:5174/')
    await settle()
    // The probe finally answers DOWN: the cancelled chain must not act on it.
    release.resolve?.({ ok: false, status: 503 } as Response)
    await advance(100)
    const after = container.querySelector('iframe')
    expect(new URL(after?.getAttribute('src') ?? '').host).toBe('localhost:5174')
    expect(after?.getAttribute('src')).toContain('_r=')
  }, 30_000)

  it('clears its scheduled check on unmount (no probe after the panel is gone)', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => ({ ok: true, status: 200 }) as Response)
    vi.stubGlobal('fetch', fetchSpy)
    const { panel, container, iframe } = await mountWithIframe({ isBuilding: false })
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)
    // One steady-state check ran and the next is scheduled (3s cadence):
    // unmounting now must clear it — no fetch escapes after the panel is gone.
    await advance(3_600)
    const callsAtUnmount = fetchSpy.mock.calls.length
    expect(callsAtUnmount).toBeGreaterThanOrEqual(2)
    panel.unmount()
    await advance(10_000)
    expect(fetchSpy.mock.calls.length).toBe(callsAtUnmount)
  }, 30_000)
})

describe('PreviewPanel — probe fallbacks and the never-loaded budget', () => {
  it('a host whose status path 404s AND whose document probe fails is down (no mount)', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/__mol/preview-status')) {
        return { ok: false, status: 404 } as Response
      }
      throw new TypeError('Failed to fetch') // the opaque HEAD probe dies too
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = mount({ isBuilding: false })
    await advance(50_000)
    // Both probe routes failed: the panel keeps polling but never mounts, and
    // past the deadline it surfaces the actionable notice instead.
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.textContent).toContain("Preview can't load here")
  }, 30_000)

  it('a file change never reloads a preview that has not even loaded once', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => ({ ok: false, status: 503 }) as Response)
    vi.stubGlobal('fetch', fetchSpy)
    const provider = providerAtUrl()
    const panel = mount({ isBuilding: false, fileChangeTick: 0 }, provider)
    for (let i = 0; i < 8; i++) {
      await advance(500)
    }
    await panel.setProps({ fileChangeTick: 1 })
    await advance(3_000)
    // Nothing was ever loaded (the server never answered): edits must not
    // reload a preview that does not exist yet — and no crash escapes.
    expect(panel.container.querySelector('iframe')).toBeNull()
  }, 30_000)
})

describe('PreviewPanel — render verdict (onRenderState)', () => {
  it('emits loading → rendered, and a blank report drops it back to loading until a fresh ready', async () => {
    const onRenderState = vi.fn<(state: PreviewRenderState, url?: string) => void>()
    const { container } = mount({ isBuilding: false, onRenderState })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)
    const states = (): Array<string | undefined> => onRenderState.mock.calls.map((c) => c[0])
    expect(states()).toEqual(['loading', 'rendered'])
    // A blank report un-confirms the render (the verdict is not 'blank' — that
    // verdict is reserved for the actionable notices; an unconfirmed preview
    // is honestly 'loading').
    await postFromPreview(container, { type: 'molecule:blank' })
    await advance(100)
    expect(states()).toEqual(['loading', 'rendered', 'loading'])
    // A later render confirmation flips it back.
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(100)
    expect(states()).toEqual(['loading', 'rendered', 'loading', 'rendered'])
  }, 30_000)

  it('emits the blank verdict when the panel gives up to the loop-breaker', async () => {
    const onRenderState = vi.fn<(state: PreviewRenderState, url?: string) => void>()
    const { container } = mount({ isBuilding: false, onRenderState })
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
