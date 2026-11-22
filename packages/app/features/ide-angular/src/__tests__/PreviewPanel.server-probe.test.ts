// @vitest-environment jsdom

/**
 * "Is the app behind this preview actually serving?" — asked in a form the
 * browser can ANSWER.
 *
 * A cross-origin `no-cors` probe returns an opaque response, which resolves for
 * 200 and for an edge's "sandbox unavailable" error page alike. The panel read
 * that as ready and mounted the error page — a document with no bridge in it,
 * which can never self-heal, so recovery fell to the slow reload budget (a 2m21s
 * late paint was recorded live). The panel now asks the preview host's status
 * path first, whose CORS-readable answer is real, and only falls back to the
 * opaque probe on a host that does not serve it (a plain dev server).
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.server-probe.test.tsx`
 * with the same test names and the same assertions: the Angular panel is a view
 * over the same shared behaviour (`createPreviewPanelSession`), so the same
 * probes must produce the same mounts, notices and escalations. The
 * deferred-microtask advance below reproduces what React's `act(async …)`
 * batching produces, and Angular's change detection renders the held batch.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  forget,
  type MountedPanel,
  mountPanel,
  type PanelProps,
  postFromPreview,
  providerAtUrl,
  settle,
} from './preview-panel-harness.js'

const PREVIEW_URL = 'https://abc123.mlcl.dev/'
const STATUS_URL = 'https://abc123.mlcl.dev/__mol/preview-status'

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
 * @param initial - The host-facing props.
 * @returns The mounted panel.
 */
async function mount(initial: PanelProps = { isBuilding: false }): Promise<MountedPanel> {
  const panel = await mountPanel(providerAtUrl(PREVIEW_URL), initial)
  mounted.push(panel)
  return panel
}

/**
 * Mounts the panel and lets the server-up poll run for a while.
 *
 * @returns The mount container.
 */
async function mountAndPoll(): Promise<HTMLElement> {
  const { container } = await mount()
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  vi.useFakeTimers()
})

afterEach(() => {
  for (const panel of mounted.splice(0)) {
    panel.unmount()
    forget(panel)
  }
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PreviewPanel — the server-up probe', () => {
  it('asks the preview host for a readable status before mounting anything', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    await mountAndPoll()

    const [firstUrl, firstInit] = fetchSpy.mock.calls[0]
    expect(String(firstUrl)).toBe(STATUS_URL)
    expect(firstInit?.mode).toBe('cors')
  })

  it('does NOT mount the preview when the edge says the app is not serving', async () => {
    // The exact shape that used to pass: a 503/502 the browser can now read.
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }))
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()

    expect(container.querySelector('iframe')).toBeNull()
  })

  it('mounts once the edge reports the app is serving', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()

    expect(container.querySelector('iframe')).not.toBeNull()
  })

  it('falls back to the opaque probe on a host that serves no status path', async () => {
    // A plain dev server (local Docker preview): 404 for the status path, and a
    // reachable document. Reporting it down would be wrong.
    const fetchSpy = vi.fn<typeof fetch>(async (input: RequestInfo | URL) =>
      String(input).endsWith('/__mol/preview-status')
        ? new Response(null, { status: 404 })
        : new Response(null, { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()

    expect(container.querySelector('iframe')).not.toBeNull()
    expect(fetchSpy.mock.calls.some(([, init]) => init?.mode === 'no-cors')).toBe(true)
  })

  it('falls back when the status request is blocked outright (no CORS headers)', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/__mol/preview-status')) throw new TypeError('Failed to fetch')
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()

    expect(container.querySelector('iframe')).not.toBeNull()
  })

  it('surfaces the actionable notice when the first-mount poll never succeeds — and self-clears when the server appears', async () => {
    // The reported symptom: a fresh page load (viewer updating via the version
    // banner) against a preview host that never answers sat on "Loading
    // preview…" indefinitely — the pre-mount poll "never gives up" and showed
    // nothing actionable, and the one-shot ceiling could be swallowed by the
    // wake window. The poll must now surface Reload/Open-in-new-tab past its
    // deadline while continuing to poll, and mount + withdraw the notice by
    // itself when the server finally answers.
    let serving = false
    const fetchSpy = vi.fn<typeof fetch>(
      async () => new Response(null, { status: serving ? 200 : 503 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()
    expect(container.querySelector('iframe')).toBeNull()

    // Past the pre-mount deadline: actionable notice up, still no iframe.
    await advance(50_000)
    expect(container.textContent).toContain("Preview can't load here")

    // The server finally answers: the still-running poll mounts the preview and
    // withdraws the notice with no human click.
    serving = true
    await advance(10_000)
    expect(container.querySelector('iframe')).not.toBeNull()
    expect(container.textContent).not.toContain("Preview can't load here")
  })

  it('never reloads a HEARTBEATING document mid-load — slow module graphs finish uninterrupted', async () => {
    // The reload-murder loop: a large app's module graph takes ~30s (250 modules
    // behind a microVM edge), the stuck cycle fired a cache-busted reload at 15s
    // (pre-onLoad), aborting every in-flight module fetch; the next document
    // raced onto the aborted entries and memoized spurious failures — blank,
    // reload, repeat, forever, while a fresh tab loaded fine. The inline bridge
    // heartbeats from HTML-parse time, so liveness IS the loading signal: a
    // heartbeating doc must never be yanked.
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    expect(iframe).not.toBeNull()

    // The document heartbeats (bridge alive, graph still loading): dispatch a
    // beat every 3s while advancing past several stuck windows.
    for (let i = 0; i < 14; i++) {
      await postFromPreview(container, { type: 'molecule:heartbeat' })
      await advance(3_000)
    }
    // 42s of alive-but-loading: no recovery reload fired (src never cache-busted).
    const src = container.querySelector('iframe')?.getAttribute('src') ?? ''
    expect(src).not.toContain('_r=')

    // Heartbeats stop (the doc is genuinely dead) — recovery resumes.
    await advance(30_000)
    const deadSrc = container.querySelector('iframe')?.getAttribute('src') ?? ''
    expect(deadSrc).toContain('_r=')
  })

  it('escalates to ONE backend restart when reloads cannot produce a render against a serving host', async () => {
    // The poisoned-module-cache class: the server answers every probe, the
    // dead-end machinery reloads, and the app still never confirms a render —
    // document reloads reuse the dev server's immutable ?v= module URLs, so
    // only a server restart (new version hash) can recover. The panel must ask
    // the host exactly once per episode.
    const restartSpy = vi.fn<() => Promise<boolean>>(async () => true)
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = await mount({ isBuilding: false, onRestartBackend: restartSpy })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    expect(container.querySelector('iframe')).not.toBeNull()

    // No render ever confirms (jsdom loads nothing) → the absolute ceiling
    // gives up → the dead-end probe sees the server up and burns a reload.
    await advance(40_000)
    // Not yet: the escalation clock (3 min) has not elapsed.
    expect(restartSpy).not.toHaveBeenCalled()

    // Past the escalation window: reload was tried, server answers, still no
    // render — the watchdog escalates exactly once.
    await advance(160_000)
    expect(restartSpy).toHaveBeenCalledTimes(1)

    // And never again this episode, no matter how long it stays broken.
    await advance(120_000)
    expect(restartSpy).toHaveBeenCalledTimes(1)
  })

  it('a declined escalation burns nothing — the watchdog asks again later', async () => {
    // The host declines for transient reasons (hidden tab, sandbox not
    // running); the panel must keep the episode budget intact and retry.
    const restartSpy = vi.fn<() => Promise<boolean>>(async () => false)
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = await mount({ isBuilding: false, onRestartBackend: restartSpy })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }

    // Two-step advance (like the accepted-escalation test): the give-up state
    // update mid-advance only arms the dead-end effect at a flush boundary.
    await advance(40_000)
    await advance(160_000)
    const afterFirstWindow = restartSpy.mock.calls.length
    expect(afterFirstWindow).toBeGreaterThanOrEqual(1)
    await advance(30_000)
    // Declined attempts keep coming (nothing was burned) — unlike the accepted
    // escalation, which is once per episode.
    expect(restartSpy.mock.calls.length).toBeGreaterThan(afterFirstWindow)
  })

  it('auto-recovers from the give-up panel once the server answers again (slow wake)', async () => {
    // The motivating incident: a 24h-asleep E2B sandbox resumed slowly enough that
    // every retry budget expired against a not-yet-serving host, the loop-breaker
    // came up, and only a MANUAL "Reload preview" (clicked after the server was
    // finally serving) recovered. The panel must click that button itself.
    let serving = true
    const fetchSpy = vi.fn<typeof fetch>(
      async () => new Response(null, { status: serving ? 200 : 503 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()
    expect(container.querySelector('iframe')).not.toBeNull()

    // The server goes away (sandbox hibernated / resuming) and the app never
    // confirms a render — past the absolute ceiling the panel gives up.
    serving = false
    await advance(35_000)
    expect(container.textContent).toContain("Preview can't load here")

    // The server comes back (the wake finally finished): the dead-end probe sees
    // it and re-runs the manual-retry path — loop-breaker gone, fresh cache-busted
    // load mounted — with no human click.
    serving = true
    await advance(10_000)
    expect(container.textContent).not.toContain("Preview can't load here")
    expect(container.querySelector('iframe')?.getAttribute('src')).toContain('_r=')
  })
})
