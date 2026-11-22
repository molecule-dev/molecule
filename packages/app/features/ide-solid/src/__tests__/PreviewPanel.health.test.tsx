// @vitest-environment jsdom

/**
 * The steady-state machinery around a REVEALED preview: the freeze watchdog
 * (visibility-aware — a hidden tab is throttled, not frozen), the once-per-
 * episode frozen report, the health check's down verdict and its
 * recovery-poll guard against a superseded target, the server-up probe's
 * external-abort path, and the render verdict the host forwards.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.health.test.tsx`
 * with the same test names and the same assertions: the Solid panel is a view
 * over the same shared behaviour (`createPreviewPanelSession`), so a real jsdom
 * render of {@link PreviewPanel} driven by a real iframe preview provider must
 * reach the same decisions React's panel reaches. A microtask settle replaces
 * React's `act()`; a signal-backed prop stands in for React's `rerender`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewRenderState, PreviewStuckReport } from '@molecule/app-ide-panel-logic'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'

import { PreviewPanel } from '../components/PreviewPanel.jsx'

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

/** The roots this file mounted, disposed after each test. */
const mounted: { dispose: () => void }[] = []

/** The host-facing props a test replaces after mounting, as React's `rerender` does. */
interface PanelProps {
  /** The freeze-report handler. */
  onPreviewStuck?: (report?: PreviewStuckReport) => void
  /** The render-verdict handler. */
  onRenderState?: (state: PreviewRenderState, url?: string) => void
  /** The file-change tick. */
  fileChangeTick?: number
}

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

/**
 * Fires the iframe document's `load` event.
 *
 * @param iframe - The preview iframe.
 */
async function loadIframe(iframe: HTMLIFrameElement): Promise<void> {
  iframe.dispatchEvent(new Event('load'))
  await settle()
}

/**
 * The element carrying the given `data-mol-id`, or null.
 *
 * @param container - The mount container.
 * @param molId - The marker.
 * @returns The element, or null when none is rendered.
 */
const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

/** Override jsdom's visibilityState and announce the change. */
function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
    writable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

/** A mounted panel plus a setter that stands in for React's `rerender`. */
interface MountedPanel {
  /** The element the panel mounted into. */
  container: HTMLElement
  /** Replaces the panel props, as React's `rerender` does. */
  setProps: (next: PanelProps) => void
}

/**
 * Mounts the panel over a provider, with signals standing in for React's `rerender`.
 *
 * @param props - The initial host-facing props.
 * @returns The mount container and the props setter.
 */
function mountPanel(props: PanelProps = {}): MountedPanel {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [onPreviewStuck, setOnPreviewStuck] = createSignal<
    ((report?: PreviewStuckReport) => void) | undefined
  >(props.onPreviewStuck)
  const [onRenderState, setOnRenderState] = createSignal<
    ((state: PreviewRenderState, url?: string) => void) | undefined
  >(props.onRenderState)
  const [fileChangeTick, setFileChangeTick] = createSignal<number | undefined>(props.fileChangeTick)
  const dispose = render(
    () => (
      <PreviewContext.Provider value={providerAtUrl()}>
        <PreviewPanel
          isBuilding={false}
          onPreviewStuck={onPreviewStuck()}
          onRenderState={onRenderState()}
          fileChangeTick={fileChangeTick()}
        />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose })
  const setProps = (next: PanelProps): void => {
    if ('onPreviewStuck' in next) setOnPreviewStuck(() => next.onPreviewStuck)
    if ('onRenderState' in next) setOnRenderState(() => next.onRenderState)
    if ('fileChangeTick' in next) setFileChangeTick(next.fileChangeTick)
  }
  return { container, setProps }
}

/**
 * Mount, reveal, and settle — the state every steady-state effect needs.
 *
 * @param callbacks - The handlers to bind.
 * @returns The mount container, the iframe, and the props setter.
 */
async function mountRevealed(callbacks: PanelProps = {}): Promise<{
  container: HTMLElement
  iframe: HTMLIFrameElement
  setProps: (next: PanelProps) => void
}> {
  const { container, setProps } = mountPanel(callbacks)
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  await loadIframe(iframe)
  await postFromPreview(container, { type: 'molecule:ready' })
  await advance(700)
  return { container, iframe, setProps }
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => new Response(null, { status: 200 })),
  )
  vi.useFakeTimers()
})

afterEach(() => {
  setVisibility('visible')
  for (const mount of mounted.splice(0)) mount.dispose()
  document.body.innerHTML = ''
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
    setVisibility('hidden')
    await settle()
    await advance(30_000)
    expect(q(container, 'preview-frozen-reload')).toBeNull()
    // A visibilitychange while still hidden changes nothing.
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()
    // Back to the foreground: the accumulated gap is forgiven.
    setVisibility('visible')
    await settle()
    await advance(6_000)
    expect(onPreviewStuck).not.toHaveBeenCalledWith(expect.objectContaining({ reason: 'frozen' }))
    expect(q(container, 'preview-frozen-reload')).toBeNull()
    // …and the watchdog is still live: a REAL post-return silence still fires.
    await advance(12_000)
    expect(onPreviewStuck).toHaveBeenCalledWith(expect.objectContaining({ reason: 'frozen' }))
  })
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
  })

  it('a host re-render with a fresh callback mid-freeze does not re-report the same episode', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const { container, setProps } = await mountRevealed({ onPreviewStuck })
    for (let i = 0; i < 3; i++) {
      await postFromPreview(container, { type: 'molecule:heartbeat' })
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
    setProps({ onPreviewStuck: onPreviewStuckFresh })
    await settle()
    await advance(6_000)
    expect(frozenCalls()).toBe(1)
  })
})

describe('PreviewPanel — pre-mount poll cadence', () => {
  it('backs off exponentially while the server never answers (no busy 500ms hammering)', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }))
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = mountPanel()
    await advance(20_000)
    expect(container.querySelector('iframe')).toBeNull()
    // 500ms → 1s → 2s → 4s → 8s: under ten probes by 20s. A fixed 500ms
    // cadence (the backoff removed) would have fired ~40 by now.
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(8)
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(4)
  })
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
      return new Response(null, { status: up ? 200 : 503 })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = await mountRevealed()
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    const srcBefore = iframe.getAttribute('src') as string

    // Probes: up, then two misses (the verdict) — the overlay is back…
    await advance(15_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and the recovery probe finds the server up → one cache-busted reload.
    const reloaded = container.querySelector('iframe')
    expect(reloaded?.getAttribute('src')).not.toBe(srcBefore)
    expect(reloaded?.getAttribute('src')).toContain('_r=')
  })

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
    const { container } = await mountRevealed()
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    const srcBefore = iframe.getAttribute('src') as string

    // The verdict lands while the recovery probe hangs…
    await advance(15_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and only NOW the probe answers UP: the cancelled chain must drop it.
    release.resolve?.(new Response(null, { status: 200 }))
    await advance(2_000)
    const after = container.querySelector('iframe')
    expect(after?.getAttribute('src')).toBe(srcBefore)
  })

  it('a URL change supersedes the in-flight recovery poll (the old target is abandoned, the new one mounts)', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () =>
        Promise.resolve(new Response(null, { status: serving ? 200 : 503 })),
      ),
    )
    const provider = providerAtUrl()
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
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)

    // The server dies; two quiet misses land the verdict and the overlay.
    serving = false
    await advance(14_000)
    expect(q(container, 'preview-overlay')).not.toBeNull()
    // …and while the recovery poll is asking the dead server, the host
    // retargets the preview (a wake's new port).
    provider.setUrl('http://localhost:5174/')
    await settle()
    await advance(2_000)
    const after = container.querySelector('iframe')
    // The NEW target mounted (cache-busted); the OLD one's poll stopped —
    // no reload of the abandoned URL ever landed.
    expect(new URL(after?.getAttribute('src') ?? '').host).toBe('localhost:5174')
    expect(after?.getAttribute('src')).toContain('_r=')
  })

  it('aborts the in-flight status probe when its poll chain is superseded (no opaque fallback after the abort)', async () => {
    // A status probe that hangs until the panel moves on: the superseded
    // chain's AbortController must kill it, and the aborted probe must NOT
    // fall through to the opaque no-cors probe.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    const fetchSpy = vi.fn<typeof fetch>((input) => {
      if (
        String(input).endsWith('/__mol/preview-status') &&
        String(input).startsWith('http://localhost:5173')
      ) {
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve(new Response(null, { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = providerAtUrl()
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
    // The first poll is stuck on the hanging status probe (no iframe yet).
    await advance(600)
    expect(container.querySelector('iframe')).toBeNull()
    // The host retargets → clearPoll aborts the stuck chain…
    provider.setUrl('http://localhost:5174/')
    await settle()
    await advance(50)
    // …and ONLY NOW the hanging probe answers 404: the aborted controller must
    // return false instead of probing the document opaquely.
    release.resolve?.(new Response(null, { status: 404 }))
    await advance(600)
    const opaque = fetchSpy.mock.calls.some((call) => call[1]?.mode === 'no-cors')
    expect(opaque).toBe(false)
    // The new target, whose probe answers fine, mounted normally.
    expect(container.querySelector('iframe')).not.toBeNull()
  })

  it('cancels a health-check probe whose effect was torn down mid-flight', async () => {
    // A revealed preview whose status probe HANGS: the check is awaiting when
    // the host retargets — the cleanup flips `cancelled`, so the probe's
    // answer must be discarded instead of driving the old target.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    let hangStatus = false
    const fetchSpy = vi.fn<typeof fetch>((input) => {
      if (hangStatus && String(input).endsWith('/__mol/preview-status')) {
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve(new Response(null, { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchSpy)
    const provider = providerAtUrl()
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
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    await loadIframe(iframe)
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
    release.resolve?.(new Response(null, { status: 503 }))
    await advance(100)
    const after = container.querySelector('iframe')
    expect(new URL(after?.getAttribute('src') ?? '').host).toBe('localhost:5174')
    expect(after?.getAttribute('src')).toContain('_r=')
  })

  it('clears its scheduled check on unmount (no probe after the panel is gone)', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = await mountRevealed()
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    // One steady-state check ran and the next is scheduled (3s cadence):
    // unmounting now must clear it — no fetch escapes after the panel is gone.
    await advance(3_600)
    const callsAtUnmount = fetchSpy.mock.calls.length
    expect(callsAtUnmount).toBeGreaterThanOrEqual(2)
    for (const mount of mounted.splice(0)) mount.dispose()
    await advance(10_000)
    expect(fetchSpy.mock.calls.length).toBe(callsAtUnmount)
  })
})

describe('PreviewPanel — probe fallbacks and the never-loaded budget', () => {
  it('a host whose status path 404s AND whose document probe fails is down (no mount)', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async (input) => {
      if (String(input).endsWith('/__mol/preview-status')) {
        return new Response(null, { status: 404 })
      }
      throw new TypeError('Failed to fetch') // the opaque HEAD probe dies too
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = mountPanel()
    await advance(50_000)
    // Both probe routes failed: the panel keeps polling but never mounts, and
    // past the deadline it surfaces the actionable notice instead.
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.textContent).toContain("Preview can't load here")
  })

  it('a file change never reloads a preview that has not even loaded once', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }))
    vi.stubGlobal('fetch', fetchSpy)
    const { container, setProps } = mountPanel({ fileChangeTick: 0 })
    for (let i = 0; i < 8; i++) {
      await advance(500)
    }
    setProps({ fileChangeTick: 1 })
    await settle()
    await advance(3_000)
    // Nothing was ever loaded (the server never answered): edits must not
    // reload a preview that does not exist yet — and no crash escapes.
    expect(container.querySelector('iframe')).toBeNull()
  })
})

describe('PreviewPanel — render verdict (onRenderState)', () => {
  it('emits loading → rendered, and a blank report drops it back to loading until a fresh ready', async () => {
    const onRenderState = vi.fn<(state: PreviewRenderState, url?: string) => void>()
    const { container } = mountPanel({ onRenderState })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(700)
    const states = (): Array<PreviewRenderState | undefined> =>
      onRenderState.mock.calls.map((c) => c[0])
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
  })

  it('emits the blank verdict when the panel gives up to the loop-breaker', async () => {
    const onRenderState = vi.fn<(state: PreviewRenderState, url?: string) => void>()
    const { container } = mountPanel({ onRenderState })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    // Nothing ever renders and the document never loads: the absolute ceiling
    // gives up to the loop-breaker — the verdict the server needs is 'blank'.
    await advance(31_000)
    const states = onRenderState.mock.calls.map((c) => c[0])
    expect(states).toContain('blank')
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  })
})
