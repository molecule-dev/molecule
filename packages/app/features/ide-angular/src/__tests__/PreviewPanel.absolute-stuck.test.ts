// @vitest-environment jsdom

/**
 * Absolute readiness ceiling — the preview can NEVER sit on a bare loading spinner
 * forever. The targeted recovery paths (onLoad grace, stuck-detection, blank-post-build)
 * each resolve a specific failure, but a combination can leave the overlay up
 * indefinitely (e.g. the document never fires onLoad, or a crash storm suppresses the
 * onLoad grace so the blank notice — which needs it — never appears). Past
 * `ABSOLUTE_STUCK_MS`, with no confirmed render and no active build, the panel gives up
 * to the actionable loop-breaker (`preview-load-failed`) so there is always a way out;
 * a later `molecule:ready` clears it.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.absolute-stuck.test.tsx`
 * with the same test names and the same assertions: the Angular panel is a view over the
 * same shared behaviour (`createPreviewPanelSession`), so a real jsdom render of
 * {@link PreviewPanel} driven by a real iframe preview provider must reach the same DOM
 * states React's panel reaches. Fake timers (the ceiling is 30s) drive the render; the
 * session's microtask flush plus Angular's change detection replace React's `act()`.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewStuckReport } from '@molecule/app-ide-panel-logic'
import type { PreviewErrorReport } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  forget,
  loadIframe,
  type MountedPanel,
  mountPanel,
  okResponse,
  type PanelProps,
  postFromPreview,
  PREVIEW_URL,
  providerAtUrl,
  q,
  responseOf,
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
async function mount(
  initial: PanelProps = {},
  provider: ReturnType<typeof providerAtUrl> = providerAtUrl(),
): Promise<MountedPanel> {
  const panel = await mountPanel(provider, initial)
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

beforeEach(() => {
  setClassMap(classMap)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(okResponse))
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

/**
 * Mounts the panel + drives the server-up poll so the iframe mounts.
 *
 * @param isBuilding - Whether the host reports an active build.
 * @returns The mounted panel and its iframe.
 */
async function mountWithIframe(
  isBuilding: boolean,
): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const { container } = await mount({ isBuilding })
  // Advance in small steps so the server-up poll's mocked-fetch microtask resolves (and
  // the iframe mounts) BEFORE the probe's 500ms abort timer can race it under fake timers.
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { container, iframe }
}

describe('PreviewPanel — absolute readiness ceiling', () => {
  it('gives up to the loop-breaker after the ceiling when no render is ever confirmed', async () => {
    const { container } = await mountWithIframe(false)
    // Worst case: the document never fires onLoad and the app never confirms a render, so
    // none of the faster paths surface a way out. The ceiling must still rescue it.
    await advance(31_000)
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  })

  it('does NOT fire while a build is in progress (no false "can\'t load" mid-build)', async () => {
    const { container } = await mountWithIframe(true)
    await advance(31_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
  })

  it('does NOT fire once the app confirms a render before the ceiling', async () => {
    const { container, iframe } = await mountWithIframe(false)
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(31_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
  })
})

describe('PreviewPanel — structured stuck reports (host → agent signal)', () => {
  it('reports the absolute ceiling as reason: load-timeout when no render is ever confirmed', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const { container } = await mount({ isBuilding: false, onPreviewStuck })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    await advance(31_000)
    expect(onPreviewStuck).toHaveBeenCalled()
    expect(onPreviewStuck.mock.calls[0][0]).toMatchObject({ reason: 'load-timeout' })
  })
})

describe('PreviewPanel — navigation atomic remount (no live-OOPIF teardown)', () => {
  it('mounts the new route atomically on navigation, NOT via the server-up probe', async () => {
    const provider = providerAtUrl()
    const { container } = await mount({ isBuilding: false }, provider)
    // Cold first load mounts the iframe via the poll path.
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    if (!iframe) throw new Error('the preview iframe never mounted')
    // Confirm a render so the preview counts as "running" (everLoaded → true).
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(10)

    // Now make the server-up probe HANG. A navigation of a running preview must do an
    // ATOMIC remount to the new route (like the manual reload) and must NOT depend on the
    // probe — the old two-phase teardown (blank the live iframe, re-add only after the
    // async probe) wedged the sandboxed cross-origin OOPIF so the route never rendered.
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => new Promise<Response>(() => undefined)),
    )
    const target = PREVIEW_URL + 'my-learning'
    provider.setUrl(target)
    await settle()
    const after = container.querySelector('iframe')
    // The iframe is present with the new route immediately — no probe needed, no teardown
    // gap — and carries the `_r` cache-buster so the cross-origin frame actually reloads
    // (a bare same-as-current URL is a no-op; that's what hung chat-link navigations).
    expect(after).not.toBeNull()
    expect(after?.getAttribute('src')?.startsWith(target)).toBe(true)
    expect(after?.getAttribute('src')).toContain('_r=')
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
    // Angular's application bootstrap is asynchronous, so mounting the panel already
    // yields to the microtask the first server-up probe resolves on. Hold the probe open
    // until the redundant `setUrl` ran, which is the in-flight state React's synchronous
    // mount reaches.
    const held: Array<() => void> = []
    const fetchSpy = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          held.push(() => resolve(responseOf(true)))
        }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const provider = providerAtUrl()
    const { container } = await mount({ isBuilding: false }, provider)

    // A second code path reports the identical boot url before the first server-up poll
    // has resolved.
    provider.setUrl(PREVIEW_URL)
    await settle()

    for (const release of held) release()

    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }

    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe(PREVIEW_URL)
    // Exactly one poll round ran — the redundant setUrl was a no-op, so no second chain
    // (and no second teardown of the iframe being created) occurred.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('settles on exactly one iframe pointed at the LATEST url when setUrl targets change before the server answers', async () => {
    // Angular's application bootstrap is asynchronous, so mounting the panel already
    // yields to the microtask the first server-up probe resolves on — the server would
    // have answered before the test could change the target. Hold every probe open until
    // the target changed, which is exactly the state React's synchronous mount reaches.
    const held: Array<() => void> = []
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        () =>
          new Promise<Response>((resolve) => {
            held.push(() => resolve(responseOf(true)))
          }),
      ),
    )

    const provider = providerAtUrl()
    const { container } = await mount({ isBuilding: false }, provider)

    // A genuinely different target supersedes the in-flight cold poll (still before
    // everLoaded flips true) — the effect legitimately re-enters the cold branch. The
    // atomic mount-key bump on poll success must still resolve to a single,
    // correctly-targeted iframe rather than a stale or duplicate one.
    const target = PREVIEW_URL + 'workspace'
    provider.setUrl(target)
    await settle()

    // Let both answers land: the superseded chain bails on its epoch/url guard, the
    // new one mounts.
    for (const release of held) release()

    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }

    const iframes = container.querySelectorAll('iframe')
    expect(iframes).toHaveLength(1)
    expect(iframes[0]?.getAttribute('src')).toBe(target)
  })
})

describe('PreviewPanel — runtime-error de-dup (one fault, one report)', () => {
  it('forwards an identical runtime-error signature only once within the window', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const { container } = await mount({ isBuilding: false, onPreviewError })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    // The SAME uncaught error reported twice — the centralized runtime bridge AND a
    // template's baked sender both fire it. The agent must hear it once, not twice.
    const err = {
      type: 'molecule:runtime-error',
      message: 'x is not defined',
      source: 'http://localhost:5173/src/main.tsx',
      line: 12,
      column: 3,
    }
    await postFromPreview(container, err)
    await postFromPreview(container, err)
    await advance(2_500) // flush the error debounce
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0]).toHaveLength(1)
  })

  it('forwards DISTINCT runtime errors separately (de-dup is per-signature)', async () => {
    const onPreviewError = vi.fn<(errors: PreviewErrorReport[]) => void>()
    const { container } = await mount({ isBuilding: false, onPreviewError })
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    await postFromPreview(container, { type: 'molecule:runtime-error', message: 'first failure' })
    await postFromPreview(container, { type: 'molecule:runtime-error', message: 'second failure' })
    await advance(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0]).toHaveLength(2)
  })
})

describe('PreviewPanel — stale-document auto-recovery', () => {
  it('auto-reloads a loaded-but-never-rendered document once the server is up', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // The document loads but the app NEVER confirms a render — e.g. a Vite server restart
    // dropped the HMR connection mid-load, leaving a stale, disconnected iframe.
    await loadIframe(iframe)
    const srcBefore = iframe.getAttribute('src')
    // Past LOAD_RECOVER_AFTER_MS the single server-up check passes → the iframe reloads
    // (cache-busted) to reconnect, instead of needing a manual reload.
    await advance(13_000)
    const after = container.querySelector('iframe')
    expect(after).not.toBeNull()
    expect(after?.getAttribute('src')).not.toBe(srcBefore)
  })

  it('does NOT reload once the app has confirmed a render', async () => {
    const { container, iframe } = await mountWithIframe(false)
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    const srcBefore = container.querySelector('iframe')?.getAttribute('src')
    await advance(13_000)
    const after = container.querySelector('iframe')
    expect(after?.getAttribute('src')).toBe(srcBefore)
  })
})
