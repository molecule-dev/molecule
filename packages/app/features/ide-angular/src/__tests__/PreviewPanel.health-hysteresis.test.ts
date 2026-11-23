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
 * with the same test names and the same assertions: the Angular panel is a view
 * over the same shared behaviour (`createPreviewPanelSession`), so a real jsdom
 * render of {@link PreviewPanel} driven by a real iframe preview provider must
 * reach the same decisions React's panel reaches. Fake timers drive the polling
 * clock; the session's microtask flush plus Angular's change detection replace
 * React's `act()`.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { PreviewStuckReport } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  forget,
  type MountedPanel,
  mountPanel,
  postFromPreview,
  providerAtUrl,
  settle,
} from './preview-panel-harness.js'

const PREVIEW_ORIGIN = 'https://abc123.mlcl.dev'
const PREVIEW_URL = `${PREVIEW_ORIGIN}/`
const STATUS_URL = `${PREVIEW_ORIGIN}/__mol/preview-status`

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * Advances the fake clock, then flushes the microtasks the session's updates queue.
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once the view re-rendered.
 */
const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

/**
 * A scripted status endpoint: each entry is what the next status probe answers
 * (`true` = serving, `false` = not). Once the script runs out it keeps answering
 * the last entry. Non-status fetches (never expected here) answer ok.
 *
 * @param script - The answers the next status probes give.
 * @returns The fetch stub and a probe counter.
 */
function scriptedStatus(script: boolean[]): {
  fetch: Mock<typeof fetch>
  probes: () => number
} {
  let i = 0
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    if (!String(input).startsWith(STATUS_URL)) {
      return new Response(null, { status: 200 })
    }
    const up = script[Math.min(i, script.length - 1)] ?? true
    i += 1
    return new Response(null, { status: up ? 200 : 503 })
  })
  return { fetch: fetchMock, probes: () => i }
}

/**
 * Mounts the panel, waits for the iframe, and confirms a render so the health
 * check arms.
 *
 * @returns The mounted panel and its iframe.
 */
async function mountRendered(): Promise<{ panel: MountedPanel; iframe: HTMLIFrameElement }> {
  const provider = providerAtUrl(PREVIEW_URL)
  const panel = await mountPanel(provider, { isBuilding: false })
  mounted.push(panel)
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = panel.container.querySelector<HTMLIFrameElement>('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  await postFromPreview(panel.container, { type: 'molecule:ready' })
  // Let the reveal fade settle so the steady-state health check is armed.
  await advance(1_500)
  return { panel, iframe }
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
    const { panel, iframe } = await mountRendered()
    const srcBefore = iframe.getAttribute('src')
    await advance(30_000)
    const after = panel.container.querySelector<HTMLIFrameElement>('iframe')
    expect(after).not.toBeNull()
    expect(after!.getAttribute('src')).not.toBe(srcBefore)
    expect(after?.getAttribute('src')).toContain('_r=')
  })

  // X0 R78/R79 (2026-09-14): a sandbox busy with a build answered the status probe
  // late for minutes while the page in the frame ran on — every pair of late
  // answers reloaded the frame ("[vite] connecting… connected." every 3–15 s), and
  // the stuck-preview detector fired on the churn. A heartbeating document is
  // alive whatever the probe says.
  it('never reloads a document that keeps heartbeating, however many probes miss', async () => {
    const status = scriptedStatus([true, true, false])
    vi.stubGlobal('fetch', status.fetch)
    const { panel, iframe } = await mountRendered()
    const srcBefore = iframe.getAttribute('src')
    for (let i = 0; i < 12; i++) {
      await advance(3_000)
      await postFromPreview(panel.container, { type: 'molecule:heartbeat' })
    }
    expect(status.probes()).toBeGreaterThanOrEqual(8)
    expect(iframe.getAttribute('src')).toBe(srcBefore)
    expect(iframe.getAttribute('src')).not.toContain('_r=')
  })
})

describe('PreviewPanel — freeze watchdog and a document that has just reloaded', () => {
  /**
   * Mounts with a stuck-report spy, confirms a render, and lets the reveal settle.
   *
   * @returns The mounted panel, its iframe and the spy.
   */
  async function mountWithSpy(): Promise<{
    panel: MountedPanel
    iframe: HTMLIFrameElement
    onPreviewStuck: Mock<(report?: PreviewStuckReport) => void>
  }> {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const panel = await mountPanel(providerAtUrl(PREVIEW_URL), {
      isBuilding: false,
      onPreviewStuck,
    })
    mounted.push(panel)
    for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = panel.container.querySelector<HTMLIFrameElement>('iframe')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    await postFromPreview(panel.container, { type: 'molecule:ready' })
    await advance(1_500)
    return { panel, iframe, onPreviewStuck }
  }

  // X0 R78/R79 (2026-09-14): the "frozen" report fired within two minutes of a
  // handoff, while the harness's post-turn verification loaded the sandbox and the
  // preview had just been reloaded. A reloaded document beats only once it is up;
  // until then a heartbeat gap is a load in progress, not a blocked thread.
  it('does not report a freeze for a reloaded document that has not beaten yet', async () => {
    vi.stubGlobal('fetch', scriptedStatus([true]).fetch)
    const { panel, iframe, onPreviewStuck } = await mountWithSpy()
    for (let i = 0; i < 3; i++) {
      await advance(3_000)
      await postFromPreview(panel.container, { type: 'molecule:heartbeat' })
    }
    // A reload: the new document loads but is slow to beat (busy sandbox). Ten
    // seconds of silence is past the freeze window and short of the never-displayed
    // escalation — a freeze verdict here would be the false one.
    iframe.dispatchEvent(new Event('load'))
    await settle()
    await advance(10_000)
    expect(onPreviewStuck).not.toHaveBeenCalled()
  })

  it('still reports a real freeze: a document that rendered and beat, then went silent', async () => {
    vi.stubGlobal('fetch', scriptedStatus([true]).fetch)
    const { panel, onPreviewStuck } = await mountWithSpy()
    for (let i = 0; i < 3; i++) {
      await advance(3_000)
      await postFromPreview(panel.container, { type: 'molecule:heartbeat' })
    }
    await advance(20_000)
    expect(onPreviewStuck).toHaveBeenCalledWith(expect.objectContaining({ reason: 'frozen' }))
  })
})
