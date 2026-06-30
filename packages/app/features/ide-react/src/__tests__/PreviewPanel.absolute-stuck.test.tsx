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
 * Fake timers (the ceiling is 30s) drive a real jsdom render of {@link PreviewPanel}.
 *
 * @module
 */

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { I18nProvider, PreviewProvider as PreviewContextProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { PreviewPanel } from '../components/PreviewPanel.js'

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

/** Wrap children with the i18n + preview context PreviewPanel needs. */
function Wrap({
  children,
  provider,
}: {
  children: ReactNode
  provider: PreviewProvider
}): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <PreviewContextProvider provider={provider}>{children}</PreviewContextProvider>
    </I18nProvider>
  )
}

/** A real iframe preview provider already pointed at the preview URL. */
function providerAtUrl(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL })
  provider.setUrl(PREVIEW_URL)
  return provider
}

/** Simulate an inbound bridge message from the preview iframe (same-origin). */
function postFromPreview(data: Record<string, unknown>): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN }))
}

const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true } as Response)),
  )
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Mount + drive the server-up poll so the iframe mounts; return it. */
async function mount(
  isBuilding: boolean,
): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const provider = providerAtUrl()
  const { container } = render(
    <Wrap provider={provider}>
      <PreviewPanel isBuilding={isBuilding} />
    </Wrap>,
  )
  // Advance in small steps so the server-up poll's mocked-fetch microtask resolves (and
  // the iframe mounts) BEFORE the probe's 500ms abort timer can race it under fake timers.
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await vi.advanceTimersByTimeAsync(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  return { container, iframe: iframe as HTMLIFrameElement }
}

describe('PreviewPanel — absolute readiness ceiling', () => {
  it('gives up to the loop-breaker after the ceiling when no render is ever confirmed', async () => {
    const { container } = await mount(false)
    // Worst case: the document never fires onLoad and the app never confirms a render, so
    // none of the faster paths surface a way out. The ceiling must still rescue it.
    await vi.advanceTimersByTimeAsync(31_000)
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  })

  it('does NOT fire while a build is in progress (no false "can\'t load" mid-build)', async () => {
    const { container } = await mount(true)
    await vi.advanceTimersByTimeAsync(31_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
  })

  it('does NOT fire once the app confirms a render before the ceiling', async () => {
    const { container, iframe } = await mount(false)
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await vi.advanceTimersByTimeAsync(31_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
  })
})

describe('PreviewPanel — structured stuck reports (host → agent signal)', () => {
  it('reports the absolute ceiling as reason: load-timeout when no render is ever confirmed', async () => {
    const onPreviewStuck = vi.fn()
    const provider = providerAtUrl()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} onPreviewStuck={onPreviewStuck} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await vi.advanceTimersByTimeAsync(50)
    }
    await vi.advanceTimersByTimeAsync(31_000)
    expect(onPreviewStuck).toHaveBeenCalled()
    expect(onPreviewStuck.mock.calls[0][0]).toMatchObject({ reason: 'load-timeout' })
  })
})

describe('PreviewPanel — navigation atomic remount (no live-OOPIF teardown)', () => {
  it('mounts the new route atomically on navigation, NOT via the server-up probe', async () => {
    const provider = providerAtUrl()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    // Cold first load mounts the iframe via the poll path.
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await vi.advanceTimersByTimeAsync(50)
    }
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    // Confirm a render so the preview counts as "running" (everLoaded → true).
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await vi.advanceTimersByTimeAsync(10)

    // Now make the server-up probe HANG. A navigation of a running preview must do an
    // ATOMIC remount to the new route (like the manual reload) and must NOT depend on the
    // probe — the old two-phase teardown (blank the live iframe, re-add only after the
    // async probe) wedged the sandboxed cross-origin OOPIF so the route never rendered.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})), // never resolves
    )
    const target = PREVIEW_URL + 'my-learning'
    act(() => {
      provider.setUrl(target)
    })
    const after = container.querySelector('iframe') as HTMLIFrameElement
    // The iframe is present with the new route immediately — no probe needed, no teardown
    // gap — and carries the `_r` cache-buster so the cross-origin frame actually reloads
    // (a bare same-as-current URL is a no-op; that's what hung chat-link navigations).
    expect(after).not.toBeNull()
    expect(after.src.startsWith(target)).toBe(true)
    expect(after.src).toContain('_r=')
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
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true } as Response))
    vi.stubGlobal('fetch', fetchSpy)

    const provider = providerAtUrl()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )

    // A second code path reports the identical boot url before the first
    // server-up poll has resolved.
    act(() => {
      provider.setUrl(PREVIEW_URL)
    })

    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await vi.advanceTimersByTimeAsync(50)
    }

    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    expect(iframe).not.toBeNull()
    expect(iframe.src).toBe(PREVIEW_URL)
    // Exactly one poll round ran — the redundant setUrl was a no-op, so no
    // second chain (and no second teardown of the iframe being created) occurred.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('settles on exactly one iframe pointed at the LATEST url when setUrl targets change before the server answers', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true } as Response))
    vi.stubGlobal('fetch', fetchSpy)

    const provider = providerAtUrl()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )

    // A genuinely different target supersedes the in-flight cold poll (still
    // before everLoaded flips true) — the effect legitimately re-enters the cold
    // branch. The atomic mount-key bump on poll success must still resolve to a
    // single, correctly-targeted iframe rather than a stale or duplicate one.
    const target = PREVIEW_URL + 'workspace'
    act(() => {
      provider.setUrl(target)
    })

    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await vi.advanceTimersByTimeAsync(50)
    }

    const iframes = container.querySelectorAll('iframe')
    expect(iframes).toHaveLength(1)
    expect((iframes[0] as HTMLIFrameElement).src).toBe(target)
  })
})

describe('PreviewPanel — runtime-error de-dup (one fault, one report)', () => {
  it('forwards an identical runtime-error signature only once within the window', async () => {
    const onPreviewError = vi.fn()
    const provider = providerAtUrl()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} onPreviewError={onPreviewError} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await vi.advanceTimersByTimeAsync(50)
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
    postFromPreview(err)
    postFromPreview(err)
    await vi.advanceTimersByTimeAsync(2_500) // flush the error debounce
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0]).toHaveLength(1)
  })

  it('forwards DISTINCT runtime errors separately (de-dup is per-signature)', async () => {
    const onPreviewError = vi.fn()
    const provider = providerAtUrl()
    const { container } = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} onPreviewError={onPreviewError} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await vi.advanceTimersByTimeAsync(50)
    }
    postFromPreview({ type: 'molecule:runtime-error', message: 'first failure' })
    postFromPreview({ type: 'molecule:runtime-error', message: 'second failure' })
    await vi.advanceTimersByTimeAsync(2_500)
    expect(onPreviewError).toHaveBeenCalledTimes(1)
    expect(onPreviewError.mock.calls[0][0]).toHaveLength(2)
  })
})

describe('PreviewPanel — stale-document auto-recovery', () => {
  it('auto-reloads a loaded-but-never-rendered document once the server is up', async () => {
    const { container, iframe } = await mount(false)
    // The document loads but the app NEVER confirms a render — e.g. a Vite server restart
    // dropped the HMR connection mid-load, leaving a stale, disconnected iframe.
    fireEvent.load(iframe)
    const srcBefore = iframe.src
    // Past LOAD_RECOVER_AFTER_MS the single server-up check passes → the iframe reloads
    // (cache-busted) to reconnect, instead of needing a manual reload.
    await vi.advanceTimersByTimeAsync(13_000)
    const after = container.querySelector('iframe') as HTMLIFrameElement
    expect(after.src).not.toBe(srcBefore)
  })

  it('does NOT reload once the app has confirmed a render', async () => {
    const { container, iframe } = await mount(false)
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:ready' })
    const srcBefore = (container.querySelector('iframe') as HTMLIFrameElement).src
    await vi.advanceTimersByTimeAsync(13_000)
    const after = container.querySelector('iframe') as HTMLIFrameElement
    expect(after.src).toBe(srcBefore)
  })
})
