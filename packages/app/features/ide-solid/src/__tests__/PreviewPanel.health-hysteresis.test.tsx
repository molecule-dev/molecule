// @vitest-environment jsdom

/**
 * The steady-state health check must not reload a healthy preview on ONE
 * missed probe.
 *
 * Behind a preview edge a probe is browser → edge → proxy → token resolve → a
 * HEAD at the sandbox upstream — hundreds of milliseconds from a healthy app.
 * The check used to abort at 500ms and treat a single miss as "down", and the
 * recovery poll then cache-bust-reloaded the iframe the moment the next probe
 * answered: a preview that reloaded every few seconds with nobody touching it
 * (observed live 2026-08-18). A miss is now a strike; only HEALTH_DOWN_CONFIRM
 * consecutive misses are a verdict, and a real outage still recovers.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.health-hysteresis.test.tsx`
 * with the same test names and the same assertions: the Solid panel is a view over
 * the same shared behaviour (`createPreviewPanelSession`), so a real jsdom render of
 * {@link PreviewPanel} driven by a real iframe preview provider must reach the same
 * decisions React's panel reaches. A microtask settle replaces React's `act()`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewStuckReport } from '@molecule/app-ide-panel-logic'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'

import { PreviewPanel } from '../components/PreviewPanel.jsx'

const PREVIEW_ORIGIN = 'https://abc123.mlcl.dev'
const PREVIEW_URL = `${PREVIEW_ORIGIN}/`
const STATUS_URL = `${PREVIEW_ORIGIN}/__mol/preview-status`

/** The roots this file mounted, disposed after each test. */
const mounted: { dispose: () => void }[] = []

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
 * Advances the fake clock, then settles the session's queued updates.
 *
 * @param ms - Fake-timer milliseconds to advance.
 */
async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
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
 * A scripted status endpoint: each entry is what the next status probe answers
 * (`true` = serving, `false` = not). Once the script runs out it keeps answering
 * the last entry. Non-status fetches (never expected here) answer ok.
 *
 * @param script - The answers, in order.
 * @returns The fetch stub and a probe counter.
 */
function scriptedStatus(script: boolean[]): {
  fetch: ReturnType<typeof vi.fn<typeof fetch>>
  probes: () => number
} {
  let i = 0
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    if (!String(input).startsWith(STATUS_URL)) return new Response(null, { status: 200 })
    const up = script[Math.min(i, script.length - 1)] ?? true
    i += 1
    return new Response(null, { status: up ? 200 : 503 })
  })
  return { fetch: fetchMock, probes: () => i }
}

/**
 * Mounts the panel over a provider and returns its container.
 *
 * @param props - The host-facing props.
 * @returns The mount container.
 */
function mount(
  props: { onPreviewStuck?: (report?: PreviewStuckReport) => void } = {},
): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <PreviewContext.Provider value={providerAtUrl()}>
        <PreviewPanel isBuilding={false} onPreviewStuck={props.onPreviewStuck} />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose })
  return container
}

/** The preview iframe in the container, or null. */
const iframeOf = (container: HTMLElement): HTMLIFrameElement | null =>
  container.querySelector('iframe')

/**
 * Mount, wait for the iframe, and confirm a render so the health check arms.
 *
 * @returns The container and the iframe.
 */
async function mountRendered(): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const container = mount()
  for (let i = 0; i < 12 && !iframeOf(container); i++) {
    await advance(50)
  }
  const iframe = iframeOf(container)
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  await postFromPreview(container, { type: 'molecule:ready' })
  // Let the reveal fade settle so the steady-state health check is armed.
  await advance(1_500)
  return { container, iframe }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const mount of mounted.splice(0)) mount.dispose()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PreviewPanel — steady-state health check hysteresis', () => {
  it('does NOT reload the preview on a single missed probe', async () => {
    // Boot probes answer up; then one steady-state miss; then up again.
    const status = scriptedStatus([true, true, false, true])
    vi.stubGlobal('fetch', status.fetch)

    const { iframe } = await mountRendered()
    const srcBefore = iframe.getAttribute('src')

    // Several health cycles: the miss lands, then the app answers again.
    await advance(15_000)

    expect(status.probes()).toBeGreaterThanOrEqual(4)
    expect(iframe.getAttribute('src')).toBe(srcBefore)
    expect(iframe.getAttribute('src')).not.toContain('_r=')
  })

  it('still recovers a real outage: the document goes quiet, consecutive misses, then a reload when it answers', async () => {
    // A real outage: the server stops answering AND the document's heartbeat stops
    // (its bridge is gone with the server). Misses that land while the document is
    // still within its heartbeat window are not strikes; the strikes start once it
    // has gone quiet, and two of them are the verdict.
    const status = scriptedStatus([true, true, false, false, false, false, false, true])
    vi.stubGlobal('fetch', status.fetch)
    const { iframe } = await mountRendered()
    const srcBefore = iframe.getAttribute('src')
    await advance(30_000)
    expect(iframe.getAttribute('src')).not.toBe(srcBefore)
    expect(iframe.getAttribute('src')).toContain('_r=')
  })

  // X0 R78/R79 (2026-09-14): a sandbox busy with a build answered the status probe
  // late for minutes while the page in the frame ran on — every pair of late
  // answers reloaded the frame ("[vite] connecting… connected." every 3–15 s), and
  // the stuck-preview detector fired on the churn. A heartbeating document is
  // alive whatever the probe says.
  it('never reloads a document that keeps heartbeating, however many probes miss', async () => {
    const status = scriptedStatus([true, true, false])
    vi.stubGlobal('fetch', status.fetch)
    const { container, iframe } = await mountRendered()
    const srcBefore = iframe.getAttribute('src')
    for (let i = 0; i < 12; i++) {
      await advance(3_000)
      await postFromPreview(container, { type: 'molecule:heartbeat' })
    }
    expect(status.probes()).toBeGreaterThanOrEqual(8)
    expect(iframe.getAttribute('src')).toBe(srcBefore)
    expect(iframe.getAttribute('src')).not.toContain('_r=')
  })
})

describe('PreviewPanel — freeze watchdog and a document that has just reloaded', () => {
  /** Mount with a stuck-report spy, confirm a render, and let the reveal settle. */
  async function mountWithSpy(): Promise<{
    container: HTMLElement
    iframe: HTMLIFrameElement
    onPreviewStuck: ReturnType<typeof vi.fn<(report?: PreviewStuckReport) => void>>
  }> {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const container = mount({ onPreviewStuck })
    for (let i = 0; i < 12 && !iframeOf(container); i++) {
      await advance(50)
    }
    const iframe = iframeOf(container)
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(1_500)
    return { container, iframe, onPreviewStuck }
  }

  // X0 R78/R79 (2026-09-14): the "frozen" report fired within two minutes of a
  // handoff, while the harness's post-turn verification loaded the sandbox and the
  // preview had just been reloaded. A reloaded document beats only once it is up;
  // until then a heartbeat gap is a load in progress, not a blocked thread.
  it('does not report a freeze for a reloaded document that has not beaten yet', async () => {
    vi.stubGlobal('fetch', scriptedStatus([true]).fetch)
    const { container, iframe, onPreviewStuck } = await mountWithSpy()
    for (let i = 0; i < 3; i++) {
      await advance(3_000)
      await postFromPreview(container, { type: 'molecule:heartbeat' })
    }
    // A reload: the new document loads but is slow to beat (busy sandbox). Ten
    // seconds of silence is past the freeze window and short of the never-displayed
    // escalation — a freeze verdict here would be the false one.
    await loadIframe(iframe)
    await advance(10_000)
    expect(onPreviewStuck).not.toHaveBeenCalled()
  })

  it('still reports a real freeze: a document that rendered and beat, then went silent', async () => {
    vi.stubGlobal('fetch', scriptedStatus([true]).fetch)
    const { container, onPreviewStuck } = await mountWithSpy()
    for (let i = 0; i < 3; i++) {
      await advance(3_000)
      await postFromPreview(container, { type: 'molecule:heartbeat' })
    }
    await advance(20_000)
    expect(onPreviewStuck).toHaveBeenCalledWith(expect.objectContaining({ reason: 'frozen' }))
  })
})
