// @vitest-environment jsdom

/**
 * The recovery budgets: the stale-document auto-reload (loaded but never
 * rendered → reload, bounded by MAX_LOAD_RECOVERS), the dead-end probe that
 * keeps asking a down host while an actionable notice is up and runs the
 * manual-retry path itself once it answers (bounded by
 * MAX_DEAD_END_AUTO_RECOVERS, standing down while the app is still
 * heartbeating), and the backend-restart escalation's once-per-episode budget
 * and cooldown.
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

/** Mount + drive the server-up poll so the iframe mounts. */
async function mountPanel(props?: {
  onRestartBackend?: () => Promise<boolean>
  onPreviewStuck?: (report?: { reason: string; url?: string }) => void
}): Promise<HTMLElement> {
  const { container } = render(
    <Wrap provider={providerAtUrl()}>
      <PreviewPanel
        isBuilding={false}
        onRestartBackend={props?.onRestartBackend}
        onPreviewStuck={props?.onPreviewStuck}
      />
    </Wrap>,
  )
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  expect(container.querySelector('iframe')).not.toBeNull()
  return container
}

describe('PreviewPanel — stale-document auto-recovery budget', () => {
  it('reloads a loaded-but-unrendered document at most twice per load chain, then stops', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: serving, status: serving ? 200 : 503 }) as Response),
    )
    const container = await mountPanel()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await act(async () => {
      fireEvent.load(iframe)
    })
    const src0 = src(container)

    // Recovery 1 at LOAD_RECOVER_AFTER_MS: the server is up, the document is
    // loaded but dead (no heartbeat) → one cache-busted reload.
    await advance(12_500)
    const src1 = src(container)
    expect(src1).not.toBe(src0)
    expect(src1).toContain('_r=')
    await act(async () => {
      fireEvent.load(container.querySelector('iframe') as HTMLIFrameElement)
    })

    // Recovery 2 on the reloaded document…
    await advance(12_500)
    const src2 = src(container)
    expect(src2).not.toBe(src1)
    await act(async () => {
      fireEvent.load(container.querySelector('iframe') as HTMLIFrameElement)
    })

    // …and the budget is spent: with the server now DOWN (so the dead-end
    // probe cannot add its own reloads either), the src must never move again
    // — the third 12s window passes with no reload.
    serving = false
    await advance(15_000)
    const src3 = src(container)
    expect(src3).toBe(src2)
  }, 30_000)

  it('never interrupts a document whose bridge is still alive (liveness is the loading signal)', async () => {
    const container = await mountPanel()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await act(async () => {
      fireEvent.load(iframe)
    })
    // A big cold module graph: loaded, no ready yet, but the inline bridge
    // heartbeats throughout — recovery must stand down, however long it takes.
    const src0 = src(container)
    for (let t = 0; t < 6; t++) {
      postFromPreview({ type: 'molecule:heartbeat' })
      await advance(3_000)
    }
    await advance(3_000)
    expect(src(container)).toBe(src0)
    expect(src(container)).not.toContain('_r=')
  }, 30_000)

  it('a recovery probe against a server that just went down recovers nothing', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: serving, status: serving ? 200 : 503 }) as Response),
    )
    const container = await mountPanel()
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await act(async () => {
      fireEvent.load(iframe)
    })
    // The document is stale and dead — but the server dropped too: the 12s
    // check runs, gets no answer, and leaves the frame alone (the dead-end
    // probe's own retry loop owns the down-server case).
    const src0 = src(container)
    void iframe
    serving = false
    await advance(13_000)
    expect(src(container)).toBe(src0)
    expect(src(container)).not.toContain('_r=')
  }, 30_000)
})

describe('PreviewPanel — dead-end auto-recovery budget', () => {
  it('auto-recovers from the blank notice while the budget lasts, then stands down at the cap', async () => {
    const provider = providerAtUrl()
    const view = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    const container = view.container
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)

    // The budget counts notice EPISODES, and a confirmed render refunds it —
    // so the cap is reached through episodes that never reveal: the recovered
    // document loads, then breaks again at once (a crash inside the grace
    // window also suppresses the grace reveal), the blank notice returns, and
    // 3s later the probe sees the serving host and runs the manual-retry path
    // itself.
    const crash = (): void => {
      postFromPreview({ type: 'molecule:error', crash: true })
    }
    const reprime = (): void => {
      const current = container.querySelector('iframe') as HTMLIFrameElement
      act(() => {
        fireEvent.load(current)
        crash()
      })
    }

    // Episode 1 (from the revealed state): the crash re-covers, the notice
    // raises, and the probe's FIRST tick still sees the reveal's heartbeat
    // baseline as alive — it re-checks 3s later, then recovers.
    crash()
    await advance(400)
    await advance(2_600) // the notice is up
    await advance(3_100) // probe tick: alive (fresh baseline) → re-check
    await advance(3_400) // re-check tick: dead → server up → auto-retry #1
    const src1 = src(container)
    expect(src1).toContain('_r=')

    // Episodes 2 and 3: re-prime (load + immediate crash → no reveal, so the
    // budget is NOT refunded), notice returns, probe recovers.
    const src2 = await (async () => {
      reprime()
      await advance(400) // the crash lands inside the grace window
      await advance(2_600) // the notice returns
      await advance(3_400) // probe tick → auto-retry #2
      return src(container)
    })()
    const src3 = await (async () => {
      reprime()
      await advance(400)
      await advance(2_600)
      await advance(3_400) // probe tick → auto-retry #3
      return src(container)
    })()
    expect(src2).not.toBe(src1)
    expect(src3).not.toBe(src2)
    expect(src3).toContain('_r=')

    // The budget is spent: a FOURTH notice episode probes nothing — the cap
    // returns before any fetch — and never reloads.
    reprime()
    await advance(400)
    await advance(2_600)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    const calls = (): number => vi.mocked(fetch).mock.calls.length
    const fetchBefore = calls()
    const settled = src(container)
    await advance(8_000) // past two probe ticks
    expect(calls()).toBe(fetchBefore)
    expect(src(container)).toBe(settled)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
  }, 30_000)
})

describe('PreviewPanel — backend-restart escalation', () => {
  it('escalates once per episode and honors the cooldown before a SECOND episode may escalate', async () => {
    const restartSpy = vi.fn(async () => true)
    const container = await mountPanel({ onRestartBackend: restartSpy })
    const iframe = container.querySelector('iframe') as HTMLIFrameElement

    // Episode 1: nothing ever renders. The absolute ceiling gives up (~30s),
    // the dead-end probe burns a reload against a serving host, and past the
    // 3-minute escalation clock the panel asks the host to restart the dev
    // server exactly once.
    await advance(40_000)
    expect(restartSpy).not.toHaveBeenCalled()
    await advance(145_000)
    expect(restartSpy).toHaveBeenCalledTimes(1)

    // Episode 2: the restarted app renders once (re-arming the episode
    // budget — and holding the reveal long enough that the watchdog's next
    // tick sees a CONFIRMED preview and stands down), then breaks again — a
    // crash re-covers it, a loaded-but-blank reload raises the notice and
    // burns a fresh dead-end reload.
    postFromPreview({ type: 'molecule:ready' })
    await advance(12_000)
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(1_000)
    await act(async () => {
      fireEvent.load(container.querySelector('iframe') as HTMLIFrameElement)
    })
    // Past the notice window the dead-end probe re-engages…
    await advance(10_000)
    // …but the COOLDOWN still blocks a second escalation for 10 minutes from
    // the first restart, even with every other gate satisfied.
    await advance(200_000)
    expect(restartSpy).toHaveBeenCalledTimes(1)

    // Past the cooldown (600s after the first restart at ~185s → ~785s), the
    // second episode may escalate. (~819s here, safely past the boundary.)
    await advance(420_000)
    expect(restartSpy).toHaveBeenCalledTimes(2)
    // …and the fresh episode budget is spent again: no third call.
    await advance(60_000)
    expect(restartSpy).toHaveBeenCalledTimes(2)
    void iframe
  }, 60_000)

  it('keeps re-probing a DOWN server behind the notice (no recovery, no crash), and unmounts cleanly mid-probe', async () => {
    let serving = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: serving, status: serving ? 200 : 503 }) as Response),
    )
    const provider = providerAtUrl()
    const view = render(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} />
      </Wrap>,
    )
    const container = view.container
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    await act(async () => {
      fireEvent.load(iframe)
    })
    postFromPreview({ type: 'molecule:ready' })
    await advance(700)

    // The app breaks; the notice raises; the server is DOWN: the probe must
    // keep asking every 3s (never recovering) while the notice stays up.
    serving = false
    postFromPreview({ type: 'molecule:error', crash: true })
    await advance(400)
    await advance(3_000)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    const src0 = src(container)
    const calls0 = vi.mocked(fetch).mock.calls.length
    await advance(10_000)
    const calls1 = vi.mocked(fetch).mock.calls.length
    expect(calls1).toBeGreaterThan(calls0)
    expect(src(container)).toBe(src0)
    expect(q(container, 'preview-blank-notice')).not.toBeNull()
    // …and the panel unmounts cleanly with the probe still scheduled.
    view.unmount()
    await advance(5_000)
    expect(vi.mocked(fetch).mock.calls.length).toBe(calls1)
  }, 30_000)

  it('skips ticks while a probe is in flight, and a DOWN probe answer escalates nothing', async () => {
    const restartSpy = vi.fn(async () => true)
    // Mount + the dead-end recover answer UP; the ESCALATION's own probe
    // (past the 3-minute clock, every other gate satisfied) hangs, then
    // answers DOWN forever — so no tick overlaps a probe and nothing ever
    // escalates against a host that cannot serve.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    let calls = 0
    let hung = false
    const fetchSpy = vi.fn(() => {
      calls += 1
      if (calls <= 2) return Promise.resolve({ ok: true, status: 200 } as Response)
      if (!hung) {
        hung = true
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve({ ok: false, status: 503 } as Response)
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = render(
      <Wrap provider={providerAtUrl()}>
        <PreviewPanel isBuilding={false} onRestartBackend={restartSpy} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    expect(container.querySelector('iframe')).not.toBeNull()
    // Nothing ever renders: the ceiling gives up (~30s), the dead-end probe
    // burns its one reload (deadEnd ≥ 1) — and from then on every server
    // answer is DOWN, so the escalation has nothing to escalate against.
    await advance(200_000)
    expect(restartSpy).not.toHaveBeenCalled()
  }, 30_000)

  it('a probe answer landing after the app re-confirmed burns nothing', async () => {
    const restartSpy = vi.fn(async () => true)
    // Same shape, but the hanging probe finally answers UP — after the app
    // confirmed a render while it was in flight: the post-await re-check must
    // decline the escalation.
    const release: { resolve: ((response: Response) => void) | null } = { resolve: null }
    let calls = 0
    let hung = false
    const fetchSpy = vi.fn(() => {
      calls += 1
      if (calls <= 2) return Promise.resolve({ ok: true, status: 200 } as Response)
      if (!hung) {
        hung = true
        return new Promise<Response>((resolve) => {
          release.resolve = resolve
        })
      }
      return Promise.resolve({ ok: true, status: 200 } as Response)
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { container } = render(
      <Wrap provider={providerAtUrl()}>
        <PreviewPanel isBuilding={false} onRestartBackend={restartSpy} />
      </Wrap>,
    )
    for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
      await advance(50)
    }
    // Nothing renders for the first ~3 minutes (the ceiling gives up, the
    // dead-end budget is spent)… at ~185s the escalation's probe is hanging.
    await advance(185_000)
    expect(restartSpy).not.toHaveBeenCalled()
    // …and while it hangs, the app finally confirms a render.
    postFromPreview({ type: 'molecule:ready' })
    await advance(2_000)
    release.resolve?.({ ok: true, status: 200 } as Response)
    await advance(30_000)
    expect(restartSpy).not.toHaveBeenCalled()
  }, 30_000)
})
