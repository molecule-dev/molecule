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
 * A port of `@molecule/app-ide-react`'s
 * `PreviewPanel.health-hysteresis.test.tsx` with the same test names and the
 * same behavioural assertions, driving a real jsdom render of the Svelte
 * `PreviewPanel` under fake timers.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewPanelProps } from '../types.js'
import {
  advance,
  buildPreviewProvider,
  fireFrameLoad,
  installStubClassMap,
  type MountedPanel,
  mountPanel,
  postFromPreview,
} from './preview-panel-harness.js'

const PREVIEW_ORIGIN = 'https://abc123.mlcl.dev'
const HYSTERESIS_URL = `${PREVIEW_ORIGIN}/`
const STATUS_URL = `${PREVIEW_ORIGIN}/__mol/preview-status`

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

/**
 * A scripted status endpoint: each entry is what the next status probe answers
 * (`true` = serving, `false` = not). Once the script runs out it keeps answering
 * the last entry. Non-status fetches (never expected here) answer ok.
 *
 * @param script - The answers the status probes read, in order.
 * @returns The fetch mock and the number of status probes made.
 */
function scriptedStatus(script: boolean[]): {
  fetch: ReturnType<typeof vi.fn>
  probes: () => number
} {
  let i = 0
  const fetch = vi.fn(async (url: string) => {
    if (!String(url).startsWith(STATUS_URL)) return new Response(null, { status: 200 })
    const up = script[Math.min(i, script.length - 1)] ?? true
    i += 1
    return new Response(null, { status: up ? 200 : 503 })
  })
  return { fetch, probes: () => i }
}

/** Mounts the panel at the preview URL, tracking it for teardown. */
function mountTracked(props: PreviewPanelProps = {}): MountedPanel {
  const mounted = mountPanel(
    buildPreviewProvider({ url: HYSTERESIS_URL, currentUrl: HYSTERESIS_URL }),
    props,
  )
  panel = mounted
  return mounted
}

/** Mount, wait for the iframe, and confirm a render so the health check arms. */
async function mountRendered(): Promise<HTMLIFrameElement> {
  const { container } = mountTracked()
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  if (!iframe) throw new Error('the preview iframe never mounted')
  postFromPreview({ type: 'molecule:ready' })
  // Let the reveal fade settle so the steady-state health check is armed.
  await advance(1_500)
  return iframe
}

beforeEach(() => {
  installStubClassMap()
  vi.useFakeTimers()
})

afterEach(async () => {
  vi.useRealTimers()
  await panel?.dispose()
  panel = null
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
    const iframe = await mountRendered()
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
    const iframe = await mountRendered()
    const srcBefore = iframe.getAttribute('src')
    for (let i = 0; i < 12; i++) {
      await advance(3_000)
      postFromPreview({ type: 'molecule:heartbeat' })
    }
    expect(status.probes()).toBeGreaterThanOrEqual(8)
    expect(iframe.getAttribute('src')).toBe(srcBefore)
    expect(iframe.getAttribute('src')).not.toContain('_r=')
  })
})

describe('PreviewPanel — freeze watchdog and a document that has just reloaded', () => {
  /** Mount with a stuck-report spy, confirm a render, and let the reveal settle. */
  async function mountWithSpy(): Promise<{
    iframe: HTMLIFrameElement
    onPreviewStuck: ReturnType<typeof vi.fn>
  }> {
    const onPreviewStuck = vi.fn()
    const { container } = mountTracked({ onPreviewStuck })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    postFromPreview({ type: 'molecule:ready' })
    await advance(1_500)
    return { iframe, onPreviewStuck }
  }

  // X0 R78/R79 (2026-09-14): the "frozen" report fired within two minutes of a
  // handoff, while the harness's post-turn verification loaded the sandbox and the
  // preview had just been reloaded. A reloaded document beats only once it is up;
  // until then a heartbeat gap is a load in progress, not a blocked thread.
  it('does not report a freeze for a reloaded document that has not beaten yet', async () => {
    vi.stubGlobal('fetch', scriptedStatus([true]).fetch)
    const { iframe, onPreviewStuck } = await mountWithSpy()
    for (let i = 0; i < 3; i++) {
      await advance(3_000)
      postFromPreview({ type: 'molecule:heartbeat' })
    }
    // A reload: the new document loads but is slow to beat (busy sandbox). Ten
    // seconds of silence is past the freeze window and short of the never-displayed
    // escalation — a freeze verdict here would be the false one.
    fireFrameLoad(iframe)
    await advance(10_000)
    expect(onPreviewStuck).not.toHaveBeenCalled()
  })

  it('still reports a real freeze: a document that rendered and beat, then went silent', async () => {
    vi.stubGlobal('fetch', scriptedStatus([true]).fetch)
    const { onPreviewStuck } = await mountWithSpy()
    for (let i = 0; i < 3; i++) {
      await advance(3_000)
      postFromPreview({ type: 'molecule:heartbeat' })
    }
    await advance(20_000)
    expect(onPreviewStuck).toHaveBeenCalledWith(expect.objectContaining({ reason: 'frozen' }))
  })
})
