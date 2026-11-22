// @vitest-environment jsdom

/**
 * The `uiCommand` relay — the host's AI-driven interaction command must reach
 * the iframe's bridge, keep re-posting until the bridge answers (a single post
 * races iframe/bridge readiness), stop at the result or the deadline, and ride
 * the un-throttled signals (inbound bridge messages, the document's onLoad)
 * instead of only the 350ms interval a hidden tab throttles to one tick per
 * minute.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.uicommand.test.tsx`
 * with the same test names and the same assertions: the Vue panel is a view over
 * the same shared behaviour (`createPreviewPanelSession`), so a real jsdom render
 * of {@link PreviewPanel} driven by a real iframe preview provider must post the
 * same messages to the iframe's window and forward the same replies to the host.
 * `settle()` replaces React's `act()`, and `setProps` stands in for `rerender`.
 *
 * jsdom replaces an iframe's `contentWindow` when its `src` changes, and the
 * panel's un-answered-load recovery re-sets that src with a cache buster partway
 * through the 40s window. {@link trackPosts} follows the window so the relay is
 * counted across that re-load — the behaviour asserted is a message count, not a
 * particular window object.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewUiCommand } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  type MountedPanel,
  mountPanel,
  postFromPreview,
  providerAtUrl,
  settle,
} from './preview-panel-harness.js'

/** One spy on an iframe window's `postMessage`. */
interface PostSpy {
  /** The recorded calls. */
  readonly mock: { readonly calls: unknown[][] }
  /** Starts the call list over. */
  mockClear: () => void
}

/** A live counter of the panel's outbound `postMessage` calls. */
interface PostTracker {
  /** Spies on the iframe's current window, if it changed since the last call. */
  refresh: () => void
  /** Starts every spy counting from zero. */
  clear: () => void
  /** Every recorded call, oldest first. */
  calls: () => unknown[][]
  /** The recorded `molecule:ui-command` payloads, oldest first. */
  posts: () => Array<Record<string, unknown>>
}

/**
 * Starts counting the panel's posts on the preview frame's window, following
 * both the window (jsdom replaces it when the `src` changes) and the element
 * (the un-answered-load recovery remounts it). Call {@link PostTracker.refresh}
 * after a clock step.
 *
 * @param container - The mount container.
 * @returns The tracker.
 */
function trackPosts(container: HTMLElement): PostTracker {
  const spies: PostSpy[] = []
  let spied: Window | null = null
  const refresh = (): void => {
    const win = (container.querySelector('iframe') as HTMLIFrameElement | null)?.contentWindow
    if (win && win !== spied) {
      spied = win
      spies.push(vi.spyOn(win, 'postMessage').mockImplementation(() => {}))
    }
  }
  refresh()
  const calls = (): unknown[][] => spies.flatMap((spy) => spy.mock.calls)
  return {
    refresh,
    clear: (): void => {
      for (const spy of spies) spy.mockClear()
    },
    calls,
    posts: (): Array<Record<string, unknown>> =>
      calls()
        .map((call) => call[0] as Record<string, unknown>)
        .filter((payload) => payload?.type === 'molecule:ui-command'),
  }
}

/**
 * Advances the fake clock, flushing the microtasks the session's updates queue.
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @param tracker - When given, re-follows the iframe's window after the step.
 * @returns Resolves once the view re-rendered.
 */
const advance = async (ms: number, tracker?: PostTracker): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
  tracker?.refresh()
}

/**
 * Advances a long span in 350ms steps, re-following the iframe's window after
 * each one (the un-answered-load recovery navigates the frame once).
 *
 * @param tracker - The post tracker.
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once the view re-rendered.
 */
async function advanceLong(tracker: PostTracker, ms: number): Promise<void> {
  const step = 350
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    await advance(Math.min(step, ms - elapsed), tracker)
  }
}

/** A concrete click command. */
const cmd = (id: string): PreviewUiCommand => ({ id, action: 'click', molId: 'submit-button' })

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/** A panel mounted with `uiCommand`, its iframe up, and its post tracker. */
interface CommandPanel {
  /** The mounted panel. */
  panel: MountedPanel
  /** The mount container. */
  container: HTMLElement
  /** The preview iframe. */
  iframe: HTMLIFrameElement
  /** The iframe window's outbound post tracker (installed after mount). */
  tracker: PostTracker
  /** Replaces the panel's `uiCommand` prop, as React's `rerender` does. */
  setUiCommand: (command: PreviewUiCommand | null) => Promise<void>
}

/**
 * A panel mounted with `uiCommand`, its iframe up, and a tracker of the
 * IFRAME's `postMessage` (the outbound relay target).
 *
 * @param command - The first UI command.
 * @param onUiResult - The host's ui-result handler.
 * @returns The mounted panel's handles.
 */
async function mountWithCommand(
  command: PreviewUiCommand | null,
  onUiResult?: (id: string, result: unknown) => void,
): Promise<CommandPanel> {
  const panel = mountPanel(providerAtUrl(), {
    isBuilding: false,
    uiCommand: command,
    onUiResult,
  })
  mounted.push(panel)
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = panel.container.querySelector('iframe') as HTMLIFrameElement
  expect(iframe).not.toBeNull()
  const tracker = trackPosts(panel.container)
  return {
    panel,
    container: panel.container,
    iframe,
    tracker,
    setUiCommand: async (next: PreviewUiCommand | null): Promise<void> => {
      await panel.setProps({ uiCommand: next })
      tracker.refresh()
    },
  }
}

beforeEach(() => {
  setClassMap(classMap)
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true } as Response)),
  )
  vi.useFakeTimers()
})

afterEach(() => {
  for (const panel of mounted.splice(0)) panel.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PreviewPanel — uiCommand relay', () => {
  it('posts a NEW command id into the iframe immediately, targeted at the src origin', async () => {
    const { tracker, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    expect(tracker.posts()).toHaveLength(1)
    expect(tracker.calls()).toContainEqual([
      expect.objectContaining({ type: 'molecule:ui-command', id: 'cmd-1', action: 'click' }),
      'http://localhost:5173',
    ])
  }, 30_000)

  it('does not re-post a command id it already relayed (a new object with the same id is not a new command)', async () => {
    const { tracker, setUiCommand } = await mountWithCommand(cmd('cmd-1'))
    await advance(50, tracker)
    tracker.clear()
    // Same id, different payload: the effect sees the remembered id, posts
    // nothing for it, and the mutated payload is never relayed.
    await setUiCommand({ id: 'cmd-1', action: 'fill', molId: 'name-input', text: 'hi' })
    expect(tracker.posts()).toHaveLength(0)
    await advance(700, tracker)
    expect(tracker.posts().some((p) => p.action === 'fill')).toBe(false)
  }, 30_000)

  it('re-posts every 350ms until the bridge answers, then stops', async () => {
    const onUiResult = vi.fn<(id: string, result: unknown) => void>()
    const { container, tracker } = await mountWithCommand(cmd('cmd-1'), onUiResult)
    // The mount post already happened; each 350ms tick re-posts.
    await advance(1_050, tracker)
    expect(tracker.posts()).toHaveLength(3)
    // The bridge answers: forwarded to the host keyed by id, and the loop stops.
    await postFromPreview(container, {
      type: 'molecule:ui-result',
      id: 'cmd-1',
      ok: true,
      found: true,
    })
    expect(onUiResult).toHaveBeenCalledTimes(1)
    expect(onUiResult).toHaveBeenCalledWith('cmd-1', {
      type: 'molecule:ui-result',
      id: 'cmd-1',
      ok: true,
      found: true,
    })
    await advance(1_400, tracker)
    expect(tracker.posts()).toHaveLength(3)
  }, 30_000)

  it('stops re-posting at the 40s deadline even with no answer', async () => {
    const { tracker, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    await advanceLong(tracker, 41_000)
    const atDeadline = tracker.posts().length
    expect(atDeadline).toBeGreaterThan(100)
    await advanceLong(tracker, 2_000)
    expect(tracker.posts().length).toBe(atDeadline)
  }, 30_000)

  it('a pending command is re-posted on an inbound bridge frame (the un-throttled retry)', async () => {
    const { container, tracker, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    tracker.clear()
    // A heartbeat proves the bridge is alive — the command rides it instantly,
    // with no 350ms wait (hidden tabs throttle intervals, not message events).
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    expect(tracker.posts()).toHaveLength(1)
    // The ui-result frame itself must NOT re-post the command it answers.
    tracker.clear()
    await postFromPreview(container, { type: 'molecule:ui-result', id: 'cmd-1', ok: true })
    expect(tracker.posts()).toHaveLength(0)
  }, 30_000)

  it('a pending command is re-posted when the document fires onLoad', async () => {
    const { iframe, tracker, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('nav-1'))
    tracker.clear()
    iframe.dispatchEvent(new Event('load'))
    await settle()
    tracker.refresh()
    expect(tracker.posts()).toHaveLength(1)
  }, 30_000)

  it('does not re-post on bridge frames once the deadline has passed', async () => {
    const { container, tracker, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    await advanceLong(tracker, 41_000)
    tracker.clear()
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    expect(tracker.posts()).toHaveLength(0)
  }, 30_000)

  it('switching to a NEW command stops the previous retry loop', async () => {
    const { tracker, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    tracker.clear()
    await setUiCommand(cmd('cmd-2'))
    expect(tracker.posts()).toHaveLength(1)
    expect(tracker.posts()[0]?.id).toBe('cmd-2')
    await advance(700, tracker)
    expect(tracker.posts().filter((p) => p.id === 'cmd-1')).toHaveLength(0)
  }, 30_000)

  it('a ui-result for an UNRELATED id is forwarded but clears no pending command', async () => {
    const onUiResult = vi.fn<(id: string, result: unknown) => void>()
    const { container, tracker, setUiCommand } = await mountWithCommand(null, onUiResult)
    await setUiCommand(cmd('cmd-1'))
    tracker.clear()
    // A stale result from an earlier command: the host still hears it, and
    // cmd-1's retry loop is unaffected (it is not the answer to cmd-1).
    await postFromPreview(container, { type: 'molecule:ui-result', id: 'cmd-0', ok: true })
    expect(onUiResult).toHaveBeenCalledWith('cmd-0', {
      type: 'molecule:ui-result',
      id: 'cmd-0',
      ok: true,
    })
    await advance(700, tracker)
    expect(tracker.posts().length).toBeGreaterThanOrEqual(2)
  }, 30_000)
})
