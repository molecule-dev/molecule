// @vitest-environment jsdom

/**
 * The `uiCommand` relay — the host's AI-driven interaction command must reach
 * the iframe's bridge, keep re-posting until the bridge answers (a single post
 * races iframe/bridge readiness), stop at the result or the deadline, and ride
 * the un-throttled signals (inbound bridge messages, the document's onLoad)
 * instead of only the 350ms interval a hidden tab throttles to one tick per
 * minute.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.uicommand.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync` over the shared `createPreviewPanelSession`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type { PreviewUiCommand } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { MountedPanel } from './preview-panel-harness.js'
import {
  advance,
  buildPreviewProvider,
  fireFrameLoad,
  mountWithIframe,
  postFromPreview,
} from './preview-panel-harness.js'

/** A concrete click command. */
const cmd = (id: string): PreviewUiCommand => ({ id, action: 'click', molId: 'submit-button' })

/**
 * postMessage calls carrying the ui-command payload (not other bridge posts).
 *
 * @param spy - The iframe window's postMessage spy.
 * @returns The ui-command payloads, in order.
 */
function commandPosts(spy: { mock: { calls: unknown[][] } }): Array<Record<string, unknown>> {
  return spy.mock.calls
    .map((call) => call[0] as Record<string, unknown>)
    .filter((payload) => payload?.type === 'molecule:ui-command')
}

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true } as Response)),
  )
  vi.useFakeTimers()
})

afterEach(async () => {
  vi.useRealTimers()
  await panel?.dispose()
  panel = null
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * A panel mounted with `uiCommand`, its iframe up, and a spy on the IFRAME's
 * `postMessage` (the outbound relay target).
 *
 * @param command - The command the panel starts with.
 * @param onUiResult - The host callback the bridge's reply reaches.
 * @returns The mounted handles.
 */
async function mountWithCommand(
  command: PreviewUiCommand | null,
  onUiResult?: (id: string, result: unknown) => void,
) {
  const mounted = await mountWithIframe(buildPreviewProvider(), {
    isBuilding: false,
    uiCommand: command,
    onUiResult,
  })
  panel = mounted
  const postSpy = vi
    .spyOn(mounted.iframe.contentWindow as Window, 'postMessage')
    .mockImplementation(() => {})
  return {
    container: mounted.container,
    iframe: mounted.iframe,
    postSpy,
    setUiCommand: (next: PreviewUiCommand | null): void => {
      mounted.setProps({ isBuilding: false, uiCommand: next, onUiResult })
      flushSync()
    },
  }
}

describe('PreviewPanel — uiCommand relay', () => {
  it('posts a NEW command id into the iframe immediately, targeted at the src origin', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    expect(commandPosts(postSpy)).toHaveLength(1)
    expect(postSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'molecule:ui-command', id: 'cmd-1', action: 'click' }),
      'http://localhost:5173',
    )
  }, 30_000)

  it('does not re-post a command id it already relayed (a new object with the same id is not a new command)', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(cmd('cmd-1'))
    await advance(50)
    postSpy.mockClear()
    // Same id, different payload: the effect sees the remembered id, posts
    // nothing for it, and the mutated payload is never relayed.
    setUiCommand({ id: 'cmd-1', action: 'fill', molId: 'name-input', text: 'hi' })
    expect(commandPosts(postSpy)).toHaveLength(0)
    await advance(700)
    expect(commandPosts(postSpy).some((payload) => payload.action === 'fill')).toBe(false)
  }, 30_000)

  it('re-posts every 350ms until the bridge answers, then stops', async () => {
    const onUiResult = vi.fn()
    const { postSpy } = await mountWithCommand(cmd('cmd-1'), onUiResult)
    // The mount post already happened; each 350ms tick re-posts.
    await advance(1_050)
    expect(commandPosts(postSpy)).toHaveLength(3)
    // The bridge answers: forwarded to the host keyed by id, and the loop stops.
    postFromPreview({ type: 'molecule:ui-result', id: 'cmd-1', ok: true, found: true })
    expect(onUiResult).toHaveBeenCalledTimes(1)
    expect(onUiResult).toHaveBeenCalledWith('cmd-1', {
      type: 'molecule:ui-result',
      id: 'cmd-1',
      ok: true,
      found: true,
    })
    await advance(1_400)
    expect(commandPosts(postSpy)).toHaveLength(3)
  }, 30_000)

  it('stops re-posting at the 40s deadline even with no answer', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(null)
    // Report the document live. jsdom never loads the frame's modules, so an
    // un-answered frame's own recovery cycles would replace/unmount it part-way
    // through this 41s window; a live app keeps it mounted, and the retry loop
    // under test stops only on a ui-result or the deadline, never on readiness.
    postFromPreview({ type: 'molecule:ready' })
    flushSync()
    setUiCommand(cmd('cmd-1'))
    await advance(41_000)
    const atDeadline = commandPosts(postSpy).length
    expect(atDeadline).toBeGreaterThan(100)
    await advance(2_000)
    expect(commandPosts(postSpy).length).toBe(atDeadline)
  }, 30_000)

  it('a pending command is re-posted on an inbound bridge frame (the un-throttled retry)', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    postSpy.mockClear()
    // A heartbeat proves the bridge is alive — the command rides it instantly,
    // with no 350ms wait (hidden tabs throttle intervals, not message events).
    postFromPreview({ type: 'molecule:heartbeat' })
    expect(commandPosts(postSpy)).toHaveLength(1)
    // The ui-result frame itself must NOT re-post the command it answers.
    postSpy.mockClear()
    postFromPreview({ type: 'molecule:ui-result', id: 'cmd-1', ok: true })
    expect(commandPosts(postSpy)).toHaveLength(0)
  }, 30_000)

  it('a pending command is re-posted when the document fires onLoad', async () => {
    const { iframe, postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('nav-1'))
    postSpy.mockClear()
    fireFrameLoad(iframe)
    flushSync()
    expect(commandPosts(postSpy)).toHaveLength(1)
  }, 30_000)

  it('does not re-post on bridge frames once the deadline has passed', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    await advance(41_000)
    postSpy.mockClear()
    postFromPreview({ type: 'molecule:heartbeat' })
    expect(commandPosts(postSpy)).toHaveLength(0)
  }, 30_000)

  it('switching to a NEW command stops the previous retry loop', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    postSpy.mockClear()
    setUiCommand(cmd('cmd-2'))
    expect(commandPosts(postSpy)).toHaveLength(1)
    expect(commandPosts(postSpy)[0]?.id).toBe('cmd-2')
    await advance(700)
    expect(commandPosts(postSpy).filter((payload) => payload.id === 'cmd-1')).toHaveLength(0)
  }, 30_000)

  it('a ui-result for an UNRELATED id is forwarded but clears no pending command', async () => {
    const onUiResult = vi.fn()
    const { postSpy, setUiCommand } = await mountWithCommand(null, onUiResult)
    setUiCommand(cmd('cmd-1'))
    postSpy.mockClear()
    // A stale result from an earlier command: the host still hears it, and
    // cmd-1's retry loop is unaffected (it is not the answer to cmd-1).
    postFromPreview({ type: 'molecule:ui-result', id: 'cmd-0', ok: true })
    expect(onUiResult).toHaveBeenCalledWith('cmd-0', {
      type: 'molecule:ui-result',
      id: 'cmd-0',
      ok: true,
    })
    await advance(700)
    expect(commandPosts(postSpy).length).toBeGreaterThanOrEqual(2)
  }, 30_000)
})
