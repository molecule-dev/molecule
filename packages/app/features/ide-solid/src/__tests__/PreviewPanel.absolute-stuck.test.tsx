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
 * with the same test names and the same assertions: the Solid panel is a view over the
 * same shared behaviour (`createPreviewPanelSession`), so a real jsdom render of
 * {@link PreviewPanel} driven by a real iframe preview provider must reach the same DOM
 * states React's panel reaches. Fake timers (the ceiling is 30s) drive the render; a
 * microtask settle replaces React's `act()` (Solid applies the session's updates
 * synchronously once the headless session's own microtask flush runs).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewStuckReport } from '@molecule/app-ide-panel-logic'
import type { PreviewErrorReport } from '@molecule/app-ide-panel-logic/panels'
import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'

import { PreviewPanel, type PreviewPanelProps } from '../components/PreviewPanel.jsx'

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

/** The roots this file mounted, disposed after each test. */
const mounted: { dispose: () => void; container: HTMLElement }[] = []

/** A real successful fetch response, as the panel's server-up probe reads it. */
const okResponse = (): Promise<Response> => Promise.resolve(new Response(null, { status: 200 }))

/** A real iframe preview provider already pointed at the preview URL. */
function providerAtUrl(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL })
  provider.setUrl(PREVIEW_URL)
  return provider
}

/**
 * Mounts the panel over a provider, the way the app does.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @param props - The host-facing props.
 * @returns The container it rendered into.
 */
function mountPanel(provider: PreviewProvider, props: PreviewPanelProps = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <PreviewContext.Provider value={provider}>
        <PreviewPanel {...props} />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose, container })
  return container
}

/**
 * Dispatches an inbound bridge message from the preview iframe (same-origin).
 *
 * The panel's trust gate accepts `molecule:*` ONLY from the preview iframe's own window
 * (`event.source === iframe.contentWindow`), so the event is simulated as a genuine
 * message from it.
 *
 * @param container - The mount container.
 * @param data - The message payload.
 * @returns Resolves once the session's update flush ran.
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
 * @returns Resolves once the session's update flush ran.
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

/**
 * Advances the fake clock, flushing the microtasks the session's updates queue.
 *
 * @param ms - Fake-timer milliseconds to advance.
 */
const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
}

/** Lets the session's queued flush (and Solid's effects) settle on real microtasks. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(okResponse))
  vi.useFakeTimers()
})

afterEach(() => {
  for (const mount of mounted.splice(0)) mount.dispose()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Mounts the panel + drives the server-up poll so the iframe mounts.
 *
 * @param isBuilding - Whether the host reports an active build.
 * @returns The container and the mounted iframe.
 */
async function mount(
  isBuilding: boolean,
): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const container = mountPanel(providerAtUrl(), { isBuilding })
  // Advance in small steps so the server-up poll's mocked-fetch microtask resolves (and
  // the iframe mounts) BEFORE the probe's abort timer can race it under fake timers.
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
    const { container } = await mount(false)
    // Worst case: the document never fires onLoad and the app never confirms a render, so
    // none of the faster paths surface a way out. The ceiling must still rescue it.
    await advance(31_000)
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  })

  it('does NOT fire while a build is in progress (no false "can\'t load" mid-build)', async () => {
    const { container } = await mount(true)
    await advance(31_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
  })

  it('does NOT fire once the app confirms a render before the ceiling', async () => {
    const { container, iframe } = await mount(false)
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await advance(31_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
  })
})

describe('PreviewPanel — structured stuck reports (host → agent signal)', () => {
  it('reports the absolute ceiling as reason: load-timeout when no render is ever confirmed', async () => {
    const onPreviewStuck = vi.fn<(report?: PreviewStuckReport) => void>()
    const container = mountPanel(providerAtUrl(), { isBuilding: false, onPreviewStuck })
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
    const container = mountPanel(provider, { isBuilding: false })
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
    expect(after?.src.startsWith(target)).toBe(true)
    expect(after?.src).toContain('_r=')
  })
})

describe('PreviewPanel — cold-load redundant setUrl (host reports the boot url more than once)', () => {
  it('does not restart the in-flight poll chain when setUrl repeats the SAME url before the server answers', async () => {
    // A sandbox-boot host (e.g. Workspace.tsx) can legitimately report its preview
    // url from more than one code path for a single boot (an SSE `done` event, a
    // status-poll fallback, a mount-time check). Before the provider-level
    // idempotency guard, every one of those calls bumped loadNonce regardless of
    // whether the url actually changed, re-triggering this cold-load effect mid-
    // poll: clearPoll() tore down the in-flight chain and started a fresh one —
    // the same two-phase teardown/rebuild shape already proven (via the
    // navigation fix above) to wedge a cross-origin OOPIF at the browser level.
    const fetchSpy = vi.fn<typeof fetch>(okResponse)
    vi.stubGlobal('fetch', fetchSpy)

    const provider = providerAtUrl()
    const container = mountPanel(provider, { isBuilding: false })

    // A second code path reports the identical boot url before the first
    // server-up poll has resolved.
    provider.setUrl(PREVIEW_URL)
    await settle()

    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }

    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.src).toBe(PREVIEW_URL)
    // Exactly one poll round ran — the redundant setUrl was a no-op, so no
    // second chain (and no second teardown of the iframe being created) occurred.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('settles on exactly one iframe pointed at the LATEST url when setUrl targets change before the server answers', async () => {
    const fetchSpy = vi.fn<typeof fetch>(okResponse)
    vi.stubGlobal('fetch', fetchSpy)

    const provider = providerAtUrl()
    const container = mountPanel(provider, { isBuilding: false })

    // A genuinely different target supersedes the in-flight cold poll (still
    // before everLoaded flips true) — the effect legitimately re-enters the cold
    // branch. The atomic mount-key bump on poll success must still resolve to a
    // single, correctly-targeted iframe rather than a stale or duplicate one.
    const target = PREVIEW_URL + 'workspace'
    provider.setUrl(target)
    await settle()

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
    const container = mountPanel(providerAtUrl(), { isBuilding: false, onPreviewError })
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
    const container = mountPanel(providerAtUrl(), { isBuilding: false, onPreviewError })
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
    const { container, iframe } = await mount(false)
    // The document loads but the app NEVER confirms a render — e.g. a Vite server restart
    // dropped the HMR connection mid-load, leaving a stale, disconnected iframe.
    await loadIframe(iframe)
    const srcBefore = iframe.src
    // Past LOAD_RECOVER_AFTER_MS the single server-up check passes → the iframe reloads
    // (cache-busted) to reconnect, instead of needing a manual reload.
    await advance(13_000)
    const after = container.querySelector('iframe')
    expect(after).not.toBeNull()
    expect(after?.src).not.toBe(srcBefore)
  })

  it('does NOT reload once the app has confirmed a render', async () => {
    const { container, iframe } = await mount(false)
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    const srcBefore = container.querySelector('iframe')?.src
    await advance(13_000)
    const after = container.querySelector('iframe')
    expect(after?.src).toBe(srcBefore)
  })
})
