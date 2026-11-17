// @vitest-environment jsdom

/**
 * The backend-restart escalation watchdog — the LAST recovery the panel may
 * attempt when document reloads provably cannot help (a dev server holding
 * poisoned module state). It runs on its own 10s interval against live refs,
 * so its guards are what keep it from asking a host to restart a serving,
 * building or already-restarted app:
 *
 * - a tick that lands while its own probe is still in flight does nothing,
 * - a server that does not answer RIGHT NOW gets no restart (the dead-end probe
 *   owns a down server), and
 * - an answer that arrives after the app confirmed a render is discarded.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
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
  const source = document.querySelector('iframe')?.contentWindow ?? null
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
  })
}

const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

const src = (container: HTMLElement): string =>
  (container.querySelector('iframe') as HTMLIFrameElement | null)?.getAttribute('src') ?? ''

const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

/** What the preview host answers: serving, down, or "still thinking". */
type Answer = 'up' | 'down' | 'hang'

/** A scriptable server-up probe, so the escalation's own probe can be held open. */
let answer: Answer = 'up'
let pending: Array<(response: Response) => void> = []
function installFetch(): void {
  answer = 'up'
  pending = []
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      if (answer === 'hang') {
        return new Promise<Response>((resolve) => {
          pending.push(resolve)
        })
      }
      return Promise.resolve({
        ok: answer === 'up',
        status: answer === 'up' ? 200 : 503,
      } as Response)
    }),
  )
}

/** Answer the held-open probe and let the awaiting chain settle. */
async function settleProbe(response: Response): Promise<void> {
  await act(async () => {
    // A tick may have opened its own probe while the escalation's was held: answer
    // every held probe so the escalation's continuation always runs.
    const held = pending
    pending = []
    for (const resolve of held) resolve(response)
    await Promise.resolve()
  })
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  installFetch()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Mount and drive the server-up poll so the iframe mounts. */
async function mountPanel(restart: () => Promise<boolean>): Promise<{
  container: HTMLElement
  provider: ReturnType<typeof createProvider>
}> {
  const provider = providerAtUrl()
  const { container } = render(
    <Wrap provider={provider}>
      <PreviewPanel isBuilding={false} onRestartBackend={restart} />
    </Wrap>,
  )
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  expect(container.querySelector('iframe')).not.toBeNull()
  return { container, provider }
}

/** Drive the panel to the state the watchdog escalates from: a spent loop breaker + one auto-reload. */
async function burnDeadEndBudget(container: HTMLElement): Promise<void> {
  // Nothing ever renders and the document never loads: the absolute ceiling
  // gives up to the loop breaker…
  await advance(31_000)
  expect(q(container, 'preview-load-failed')).not.toBeNull()
  // …and the dead-end probe sees the serving host and runs the retry itself,
  // which clears the notice and cache-busts the document.
  await advance(3_200)
  expect(q(container, 'preview-load-failed')).toBeNull()
  expect(src(container)).toContain('_r=')
}

describe('PreviewPanel — backend-restart escalation guards', () => {
  it('a tick that overlaps the in-flight probe neither stacks a probe nor loses the verdict (one restart)', async () => {
    const restart = vi.fn(async () => true)
    const { container } = await mountPanel(restart)
    await burnDeadEndBudget(container)

    // Past the 3-minute clock the watchdog opens its own probe; hold it open so
    // the next 10s tick lands while it is in flight.
    answer = 'hang'
    await advance(150_000)
    expect(restart).not.toHaveBeenCalled()
    await advance(10_000)
    expect(restart).not.toHaveBeenCalled()

    // The single held-open probe then answers UP: the escalation runs exactly
    // once (the overlapping tick neither duplicated nor dropped it)…
    await settleProbe({ ok: true, status: 200 } as Response)
    await advance(100)
    expect(restart).toHaveBeenCalledTimes(1)

    // …and the episode is spent: later ticks do not ask again.
    await advance(30_000)
    expect(restart).toHaveBeenCalledTimes(1)
  }, 60_000)

  it('a DOWN answer to that probe escalates nothing (a down host needs waking, not a restart)', async () => {
    const restart = vi.fn(async () => true)
    const { container } = await mountPanel(restart)
    await burnDeadEndBudget(container)

    answer = 'hang'
    await advance(150_000)
    // The probe's answer is DOWN — the dead-end machinery owns a down server.
    answer = 'down'
    await settleProbe({ ok: false, status: 503 } as Response)
    await advance(30_000)
    expect(restart).not.toHaveBeenCalled()
    // The panel keeps its honest notice up rather than restarting anything.
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  }, 60_000)

  it('discards a probe answer that arrives after the app confirmed a render (no restart burned)', async () => {
    const restart = vi.fn(async () => true)
    const { container } = await mountPanel(restart)
    await burnDeadEndBudget(container)

    // The escalation probe is open when the app finally renders.
    answer = 'hang'
    await advance(150_000)
    postFromPreview({ type: 'molecule:ready' })
    await advance(1_000)

    // Its UP answer lands after the confirmation: the post-await re-check must
    // decline the escalation.
    await settleProbe({ ok: true, status: 200 } as Response)
    await advance(30_000)
    expect(restart).not.toHaveBeenCalled()
  }, 60_000)

  it('never asks twice in one broken stretch, even after a fresh give-up and auto-reload', async () => {
    const restart = vi.fn(async () => true)
    const { container, provider } = await mountPanel(restart)
    await burnDeadEndBudget(container)

    // The episode's ONE restart: past the clock, the probe answers UP.
    answer = 'hang'
    await advance(150_000)
    answer = 'up'
    await settleProbe({ ok: true, status: 200 } as Response)
    await advance(100)
    expect(restart).toHaveBeenCalledTimes(1)

    // The app is STILL broken (no render ever confirmed). A refresh re-arms the
    // ceiling, which gives up again and burns another dead-end reload — the
    // watchdog's next tick must see the already-used restart and stand down.
    await act(async () => {
      provider.refresh()
    })
    await advance(31_000)
    expect(q(container, 'preview-load-failed')).not.toBeNull()
    await advance(3_200)
    // The dead-end probe recovered the notice (a serving host) — so every gate
    // but "already restarted this episode" is satisfied now.
    expect(q(container, 'preview-load-failed')).toBeNull()
    await advance(10_000)
    expect(restart).toHaveBeenCalledTimes(1)
  }, 60_000)
})
