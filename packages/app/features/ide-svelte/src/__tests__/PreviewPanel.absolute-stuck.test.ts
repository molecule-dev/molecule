// @vitest-environment jsdom

/**
 * Absolute readiness ceiling — the preview can NEVER sit on a bare loading
 * spinner forever. The targeted recovery paths (onLoad grace, stuck-detection,
 * blank-post-build) each resolve a specific failure, but a combination can
 * leave the overlay up indefinitely (e.g. the document never fires onLoad, or a
 * crash storm suppresses the onLoad grace so the blank notice — which needs it
 * — never appears). Past the absolute ceiling, with no confirmed render and no
 * active build, the panel gives up to the actionable loop-breaker
 * (`preview-load-failed`) so there is always a way out; a later
 * `molecule:ready` clears it.
 *
 * Fake timers drive a real jsdom render of the Svelte `PreviewPanel`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewStuckReport } from '@molecule/app-ide-panel-logic'
import type { PreviewErrorReport } from '@molecule/app-ide-panel-logic/panels'
import type { PreviewProvider } from '@molecule/app-live-preview'

import type { PreviewPanelProps } from '../types.js'
import {
  advance,
  buildPreviewProvider,
  currentIframe,
  fireFrameLoad,
  installStubClassMap,
  type MountedPanel,
  mountPanel,
  mountWithIframe,
  postFromPreview,
  PREVIEW_URL,
  q,
  settle,
} from './preview-panel-harness.js'

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

/** Mounts the panel over a fresh provider and tracks it for teardown. */
function mountTracked(provider: PreviewProvider, props: PreviewPanelProps = {}): MountedPanel {
  panel = mountPanel(provider, props)
  return panel
}

/** Mounts and drives the server-up poll, tracking the panel for teardown. */
async function mountTrackedWithIframe(
  provider: PreviewProvider,
  props: PreviewPanelProps = {},
): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const mounted = await mountWithIframe(provider, props)
  panel = mounted
  return mounted
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
  vi.useRealTimers()
  await panel?.dispose()
  panel = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PreviewPanel — absolute readiness ceiling', () => {
  it('gives up to the loop-breaker after the ceiling when no render is ever confirmed', async () => {
    const mounted = await mountTrackedWithIframe(buildPreviewProvider(), { isBuilding: false })
    // Worst case: the document never fires onLoad and the app never confirms a render, so
    // none of the faster paths surface a way out. The ceiling must still rescue it.
    await advance(31_000)
    expect(q(mounted.container, 'preview-load-failed')).not.toBeNull()
  })

  it('does NOT fire while a build is in progress (no false "can\'t load" mid-build)', async () => {
    const mounted = await mountTrackedWithIframe(buildPreviewProvider(), { isBuilding: true })
    await advance(31_000)
    expect(q(mounted.container, 'preview-load-failed')).toBeNull()
  })

  it('does NOT fire once the app confirms a render before the ceiling', async () => {
    const mounted = await mountTrackedWithIframe(buildPreviewProvider(), { isBuilding: false })
    fireFrameLoad(mounted.iframe)
    postFromPreview({ type: 'molecule:ready' })
    await settle()
    await advance(31_000)
    expect(q(mounted.container, 'preview-load-failed')).toBeNull()
  })
})

describe('PreviewPanel — structured stuck reports (host → agent signal)', () => {
  it('reports the absolute ceiling as reason: load-timeout when no render is ever confirmed', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    await mountTrackedWithIframe(buildPreviewProvider(), {
      isBuilding: false,
      onPreviewStuck,
    })
    await advance(31_000)
    expect(onPreviewStuck).toHaveBeenCalled()
    expect(onPreviewStuck.mock.calls[0][0]).toMatchObject({ reason: 'load-timeout' })
  })
})

describe('PreviewPanel — navigation atomic remount (no live-OOPIF teardown)', () => {
  it('mounts the new route atomically on navigation, NOT via the server-up probe', async () => {
    const provider = buildPreviewProvider()
    const mounted = await mountTrackedWithIframe(provider, { isBuilding: false })
    // Confirm a render so the preview counts as "running" (everLoaded → true).
    fireFrameLoad(mounted.iframe)
    postFromPreview({ type: 'molecule:ready' })
    await advance(10)

    // Now make the server-up probe HANG. A navigation of a running preview must do an
    // ATOMIC remount to the new route (like the manual reload) and must NOT depend on the
    // probe — the old two-phase teardown (blank the live iframe, re-add only after the
    // async probe) wedged the sandboxed cross-origin OOPIF so the route never rendered.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    const target = PREVIEW_URL + 'my-learning'
    provider.setUrl(target)
    await settle()

    const after = currentIframe(mounted.container)
    expect(after).not.toBeNull()
    const src = after?.getAttribute('src') ?? ''
    // The iframe is present with the new route immediately — no probe needed, no teardown
    // gap — and carries the `_r` cache-buster so the cross-origin frame actually reloads
    // (a bare same-as-current URL is a no-op; that's what hung chat-link navigations).
    expect(src.startsWith(target)).toBe(true)
    expect(src).toContain('_r=')
  })
})

describe('PreviewPanel — cold-load redundant setUrl (host reports the boot url more than once)', () => {
  it('does not restart the in-flight poll chain when setUrl repeats the SAME url before the server answers', async () => {
    // A sandbox-boot host can legitimately report its preview url from more than one code
    // path for a single boot (an SSE `done` event, a status-poll fallback, a mount-time
    // check). Before the provider-level idempotency guard, every one of those calls bumped
    // loadNonce regardless of whether the url actually changed, re-triggering this
    // cold-load effect mid-poll: clearPoll() tore down the in-flight chain and started a
    // fresh one — the same two-phase teardown/rebuild shape already proven (via the
    // navigation fix above) to wedge a cross-origin OOPIF at the browser level.
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })))
    vi.stubGlobal('fetch', fetchSpy)

    const provider = buildPreviewProvider()
    const mounted = mountTracked(provider, { isBuilding: false })

    // A second code path reports the identical boot url before the first
    // server-up poll has resolved.
    provider.setUrl(PREVIEW_URL)

    for (let i = 0; i < 12 && !currentIframe(mounted.container); i++) {
      await advance(50)
    }

    const iframe = currentIframe(mounted.container)
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe(PREVIEW_URL)
    // Exactly one poll round ran — the redundant setUrl was a no-op, so no
    // second chain (and no second teardown of the iframe being created) occurred.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('settles on exactly one iframe pointed at the LATEST url when setUrl targets change before the server answers', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })))
    vi.stubGlobal('fetch', fetchSpy)

    const provider = buildPreviewProvider()
    const mounted = mountTracked(provider, { isBuilding: false })

    // A genuinely different target supersedes the in-flight cold poll (still
    // before everLoaded flips true) — the effect legitimately re-enters the cold
    // branch. The atomic mount-key bump on poll success must still resolve to a
    // single, correctly-targeted iframe rather than a stale or duplicate one.
    const target = PREVIEW_URL + 'workspace'
    provider.setUrl(target)

    for (let i = 0; i < 12 && !currentIframe(mounted.container); i++) {
      await advance(50)
    }

    const iframes = mounted.container.querySelectorAll('iframe')
    expect(iframes).toHaveLength(1)
    expect(iframes[0].getAttribute('src')).toBe(target)
  })
})

describe('PreviewPanel — runtime-error de-dup (one fault, one report)', () => {
  it('forwards an identical runtime-error signature only once within the window', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    await mountTrackedWithIframe(buildPreviewProvider(), { isBuilding: false, onPreviewError })
    // The SAME uncaught error reported twice — the centralized runtime bridge AND a
    // template's baked sender both fire it. The agent must hear it once, not twice.
    const err = {
      type: 'molecule:runtime-error',
      message: 'x is not defined',
      source: 'http://localhost:5173/src/main.tsx',
      line: 12,
      column: 3,
    }
    postFromPreview(err)
    postFromPreview(err)
    await advance(2_500) // flush the error debounce
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0]).toHaveLength(1)
  })

  it('forwards DISTINCT runtime errors separately (de-dup is per-signature)', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    await mountTrackedWithIframe(buildPreviewProvider(), { isBuilding: false, onPreviewError })
    postFromPreview({ type: 'molecule:runtime-error', message: 'first failure' })
    postFromPreview({ type: 'molecule:runtime-error', message: 'second failure' })
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0]).toHaveLength(2)
  })
})

describe('PreviewPanel — stale-document auto-recovery', () => {
  it('auto-reloads a loaded-but-never-rendered document once the server is up', async () => {
    const mounted = await mountTrackedWithIframe(buildPreviewProvider(), { isBuilding: false })
    // The document loads but the app NEVER confirms a render — e.g. a Vite server restart
    // dropped the HMR connection mid-load, leaving a stale, disconnected iframe.
    fireFrameLoad(mounted.iframe)
    const srcBefore = mounted.iframe.getAttribute('src') ?? ''
    // Past the single server-up check's delay, the iframe reloads (cache-busted) to
    // reconnect, instead of needing a manual reload.
    await advance(13_000)
    const after = currentIframe(mounted.container)
    expect(after).not.toBeNull()
    expect(after!.getAttribute('src')).not.toBe(srcBefore)
  })

  it('does NOT reload once the app has confirmed a render', async () => {
    const mounted = await mountTrackedWithIframe(buildPreviewProvider(), { isBuilding: false })
    fireFrameLoad(mounted.iframe)
    postFromPreview({ type: 'molecule:ready' })
    await settle()
    const srcBefore = currentIframe(mounted.container)?.getAttribute('src') ?? ''
    await advance(13_000)
    const after = currentIframe(mounted.container)
    expect(after).not.toBeNull()
    expect(after?.getAttribute('src')).toBe(srcBefore)
  })
})
