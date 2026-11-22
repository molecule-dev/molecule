// @vitest-environment jsdom
/**
 * The `uiCommand` relay — a port of
 * `@molecule/app-ide-react/src/__tests__/PreviewPanel.uicommand.test.tsx` with
 * the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication` over a real iframe preview provider.
 *
 * The host's AI-driven interaction command must reach the iframe's bridge, keep
 * re-posting until the bridge answers (a single post races iframe/bridge
 * readiness), stop at the result or the deadline, and ride the un-throttled
 * signals (inbound bridge messages, the document's onLoad) instead of only the
 * 350ms interval a hidden tab throttles to one tick per minute.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewUiCommand, PreviewUiResult } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  forget,
  type MountedPanel,
  mountPanel,
  okResponse,
  type PanelProps,
  postFromPreview,
  providerAtUrl,
  settle,
} from './preview-panel-harness.js'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/** A concrete click command. */
const cmd = (id: string): PreviewUiCommand => ({ id, action: 'click', molId: 'submit-button' })

/**
 * Records the iframe's outbound `postMessage` calls, re-anchoring across a
 * contentWindow swap. jsdom gives an iframe a fresh Window on every navigation
 * (the panel's stale-document recovery re-points the src), while a real browser
 * keeps the same Window for a same-origin navigation — so the recorder follows
 * the live frame instead of a single Window object.
 */
interface PostRecorder {
  /** Every recorded call's argument list. */
  readonly calls: ReadonlyArray<ReadonlyArray<unknown>>
  /** Forgets the calls recorded so far. */
  clear: () => void
  /** Spies the frame's current contentWindow (a no-op for a window already spied). */
  anchor: () => void
}

/** How long one `advance` step runs before re-anchoring (a swapped window loses no full retry tick). */
const ANCHOR_STEP_MS = 100

/**
 * Advances the fake clock, then flushes the microtasks the session's updates queue.
 * Re-anchors the recorder between steps so a contentWindow swap loses no posts.
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @param recorder - The post recorder to keep anchored (optional).
 * @returns Resolves once the view re-rendered.
 */
const advance = async (ms: number, recorder?: PostRecorder): Promise<void> => {
  let left = ms
  while (left > 0) {
    const step = Math.min(ANCHOR_STEP_MS, left)
    await vi.advanceTimersByTimeAsync(step)
    recorder?.anchor()
    left -= step
  }
  await settle()
}

/**
 * Builds a recorder spying the frame's `postMessage`.
 *
 * @param container - The mount container (its live iframe is followed).
 * @returns The recorder.
 */
function createPostRecorder(container: HTMLElement): PostRecorder {
  const calls: unknown[][] = []
  const spied = new WeakSet<Window>()
  const anchor = (): void => {
    const contentWindow = container.querySelector('iframe')?.contentWindow
    if (!contentWindow || spied.has(contentWindow)) return
    spied.add(contentWindow)
    vi.spyOn(contentWindow, 'postMessage').mockImplementation((...args: unknown[]) => {
      calls.push(args)
    })
  }
  anchor()
  return {
    calls,
    clear: (): void => {
      calls.length = 0
    },
    anchor,
  }
}

/**
 * The `postMessage` calls carrying the ui-command payload (not other bridge posts).
 *
 * @param recorder - The post recorder.
 * @returns The command payloads.
 */
const commandPosts = (recorder: PostRecorder): Array<Record<string, unknown>> =>
  recorder.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((payload) => payload?.type === 'molecule:ui-command')

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
 * A panel mounted with `uiCommand`, its iframe up, and a recorder on the
 * IFRAME's `postMessage` (the outbound relay target).
 *
 * @param command - The initial UI command (or null).
 * @param onUiResult - The host's reply handler.
 * @returns The mount and the driving handles.
 */
async function mountWithCommand(
  command: PreviewUiCommand | null,
  onUiResult?: (id: string, result: PreviewUiResult) => void,
): Promise<{
  container: HTMLElement
  iframe: HTMLIFrameElement
  recorder: PostRecorder
  setUiCommand: (command: PreviewUiCommand | null) => Promise<void>
}> {
  const base: PanelProps = { isBuilding: false, uiCommand: command, onUiResult }
  const panel = await mountPanel(providerAtUrl(), base)
  mounted.push(panel)
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = panel.container.querySelector('iframe') as HTMLIFrameElement | null
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  const recorder = createPostRecorder(panel.container)
  const setUiCommand = async (next: PreviewUiCommand | null): Promise<void> => {
    await panel.setProps({ ...base, uiCommand: next })
  }
  return { container: panel.container, iframe, recorder, setUiCommand }
}

describe('PreviewPanel — uiCommand relay', () => {
  it('posts a NEW command id into the iframe immediately, targeted at the src origin', async () => {
    const { recorder, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    expect(commandPosts(recorder)).toHaveLength(1)
    expect(recorder.calls).toContainEqual([
      expect.objectContaining({ type: 'molecule:ui-command', id: 'cmd-1', action: 'click' }),
      'http://localhost:5173',
    ])
  }, 30_000)

  it('does not re-post a command id it already relayed (a new object with the same id is not a new command)', async () => {
    const { recorder, setUiCommand } = await mountWithCommand(cmd('cmd-1'))
    await advance(50, recorder)
    recorder.clear()
    // Same id, different payload: the effect sees the remembered id, posts
    // nothing for it, and the mutated payload is never relayed.
    await setUiCommand({ id: 'cmd-1', action: 'fill', molId: 'name-input', text: 'hi' })
    expect(commandPosts(recorder)).toHaveLength(0)
    await advance(700, recorder)
    expect(commandPosts(recorder).some((p) => p.action === 'fill')).toBe(false)
  }, 30_000)

  it('re-posts every 350ms until the bridge answers, then stops', async () => {
    const onUiResult = vi.fn<(id: string, result: PreviewUiResult) => void>()
    const { container, recorder } = await mountWithCommand(cmd('cmd-1'), onUiResult)
    // The mount post already happened; each 350ms tick re-posts.
    await advance(1_050, recorder)
    expect(commandPosts(recorder)).toHaveLength(3)
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
    await advance(1_400, recorder)
    expect(commandPosts(recorder)).toHaveLength(3)
  }, 30_000)

  it('stops re-posting at the 40s deadline even with no answer', async () => {
    const { recorder, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    await advance(41_000, recorder)
    const atDeadline = commandPosts(recorder).length
    expect(atDeadline).toBeGreaterThan(100)
    await advance(2_000, recorder)
    expect(commandPosts(recorder).length).toBe(atDeadline)
  }, 30_000)

  it('a pending command is re-posted on an inbound bridge frame (the un-throttled retry)', async () => {
    const { container, recorder, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    recorder.clear()
    // A heartbeat proves the bridge is alive — the command rides it instantly,
    // with no 350ms wait (hidden tabs throttle intervals, not message events).
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    expect(commandPosts(recorder)).toHaveLength(1)
    // The ui-result frame itself must NOT re-post the command it answers.
    recorder.clear()
    await postFromPreview(container, { type: 'molecule:ui-result', id: 'cmd-1', ok: true })
    expect(commandPosts(recorder)).toHaveLength(0)
  }, 30_000)

  it('a pending command is re-posted when the document fires onLoad', async () => {
    const { iframe, recorder, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('nav-1'))
    recorder.clear()
    iframe.dispatchEvent(new Event('load'))
    await settle()
    expect(commandPosts(recorder)).toHaveLength(1)
  }, 30_000)

  it('does not re-post on bridge frames once the deadline has passed', async () => {
    const { container, recorder, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    await advance(41_000, recorder)
    recorder.clear()
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    expect(commandPosts(recorder)).toHaveLength(0)
  }, 30_000)

  it('switching to a NEW command stops the previous retry loop', async () => {
    const { recorder, setUiCommand } = await mountWithCommand(null)
    await setUiCommand(cmd('cmd-1'))
    recorder.clear()
    await setUiCommand(cmd('cmd-2'))
    expect(commandPosts(recorder)).toHaveLength(1)
    expect(commandPosts(recorder)[0]?.id).toBe('cmd-2')
    await advance(700, recorder)
    expect(commandPosts(recorder).filter((p) => p.id === 'cmd-1')).toHaveLength(0)
  }, 30_000)

  it('a ui-result for an UNRELATED id is forwarded but clears no pending command', async () => {
    const onUiResult = vi.fn<(id: string, result: PreviewUiResult) => void>()
    const { container, recorder, setUiCommand } = await mountWithCommand(null, onUiResult)
    await setUiCommand(cmd('cmd-1'))
    recorder.clear()
    // A stale result from an earlier command: the host still hears it, and
    // cmd-1's retry loop is unaffected (it is not the answer to cmd-1).
    await postFromPreview(container, { type: 'molecule:ui-result', id: 'cmd-0', ok: true })
    expect(onUiResult).toHaveBeenCalledWith('cmd-0', {
      type: 'molecule:ui-result',
      id: 'cmd-0',
      ok: true,
    })
    await advance(700, recorder)
    expect(commandPosts(recorder).length).toBeGreaterThanOrEqual(2)
  }, 30_000)
})
