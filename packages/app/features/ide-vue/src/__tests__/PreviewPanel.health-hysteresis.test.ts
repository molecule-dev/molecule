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
 * with the same test names and the same assertions: the Vue panel is a view over
 * the same shared behaviour (`createPreviewPanelSession`), so a real jsdom render
 * of {@link PreviewPanel} driven by a real iframe preview provider must reach the
 * same decisions React's panel reaches.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewStuckReport } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  type MountedPanel,
  mountPanel,
  type PanelProps,
  postFromPreview,
  PREVIEW_URL,
  providerAtUrl,
  settle,
} from './preview-panel-harness.js'

/** The status endpoint the panel's steady-state probe asks first. */
const STATUS_URL = new URL('/__mol/preview-status', PREVIEW_URL).toString()

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
 * Advances the fake clock, flushing the microtasks the session's updates queue.
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
 * @param script - One answer per status probe.
 * @returns The fetch stub and a counter of status probes served.
 */
function scriptedStatus(script: boolean[]): {
  fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>
  probes: () => number
} {
  let i = 0
  const spy = vi.fn<typeof globalThis.fetch>(async (input: RequestInfo | URL) => {
    if (!String(input).startsWith(STATUS_URL)) return { ok: true, status: 200 } as Response
    const up = script[Math.min(i, script.length - 1)] ?? true
    i += 1
    return { ok: up, status: up ? 200 : 503 } as Response
  })
  return { fetch: spy, probes: () => i }
}

/**
 * Mounts the panel, waits for the iframe, and confirms a render so the health
 * check arms.
 *
 * @returns The preview iframe.
 */
async function mountRendered(): Promise<HTMLIFrameElement> {
  const { container } = mount({ isBuilding: false })
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  await postFromPreview(container, { type: 'molecule:ready' })
  // Let the reveal fade settle so the steady-state health check is armed.
  await advance(1_500)
  return iframe
}

beforeEach(() => {
  setClassMap(classMap)
  vi.useFakeTimers()
})

afterEach(() => {
  for (const panel of mounted.splice(0)) panel.unmount()
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

    const iframe = await mountRendered()
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
    const { container } = mount({ isBuilding: false })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(1_500)
    const srcBefore = iframe.getAttribute('src')
    await advance(30_000)
    const after = container.querySelector('iframe')
    expect(after?.getAttribute('src')).not.toBe(srcBefore)
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
    const { container } = mount({ isBuilding: false })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(1_500)
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
  /**
   * Mounts with a stuck-report spy, confirms a render, and lets the reveal settle.
   *
   * @returns The panel container and the stuck-report spy.
   */
  async function mountWithSpy(): Promise<{
    container: HTMLElement
    onPreviewStuck: ReturnType<typeof vi.fn<(report?: PreviewStuckReport) => void>>
  }> {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const panel = mount({ isBuilding: false, onPreviewStuck })
    for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
      await advance(50)
    }
    await postFromPreview(panel.container, { type: 'molecule:ready' })
    await advance(1_500)
    return { container: panel.container, onPreviewStuck }
  }

  // X0 R78/R79 (2026-09-14): the "frozen" report fired within two minutes of a
  // handoff, while the harness's post-turn verification loaded the sandbox and the
  // preview had just been reloaded. A reloaded document beats only once it is up;
  // until then a heartbeat gap is a load in progress, not a blocked thread.
  it('does not report a freeze for a reloaded document that has not beaten yet', async () => {
    vi.stubGlobal('fetch', scriptedStatus([true]).fetch)
    const { container, onPreviewStuck } = await mountWithSpy()
    for (let i = 0; i < 3; i++) {
      await advance(3_000)
      await postFromPreview(container, { type: 'molecule:heartbeat' })
    }
    // A reload: the new document loads but is slow to beat (busy sandbox). Ten
    // seconds of silence is past the freeze window and short of the never-displayed
    // escalation — a freeze verdict here would be the false one.
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe is gone')
    iframe.dispatchEvent(new Event('load'))
    await settle()
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
