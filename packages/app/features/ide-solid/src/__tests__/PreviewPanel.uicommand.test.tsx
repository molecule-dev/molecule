// @vitest-environment jsdom
/**
 * The `uiCommand` relay — a port of
 * `@molecule/app-ide-react/src/__tests__/PreviewPanel.uicommand.test.tsx` with the
 * same test names and the same assertions, mounted as a real Solid root.
 *
 * The host's AI-driven interaction command must reach the iframe's bridge, keep
 * re-posting until the bridge answers (a single post races iframe/bridge
 * readiness), stop at the result or the deadline, and ride the un-throttled
 * signals (inbound bridge messages, the document's onLoad) instead of only the
 * 350ms interval a hidden tab throttles to one tick per minute.
 *
 * The Solid panel is a view over the same shared behaviour
 * (`createPreviewPanelSession`), so the same real iframe preview provider drives
 * it; the host's `uiCommand` prop is a Solid signal, so replacing it re-runs the
 * panel's props effect (React's re-render).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewUiCommand } from '@molecule/app-ide-panel-logic'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'

import { PreviewPanel } from '../components/PreviewPanel.jsx'

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

/** The roots this file mounted, disposed after each test. */
const mounted: { dispose: () => void }[] = []

/** Lets the session's queued flush (and Solid's effects) settle on real microtasks. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

/**
 * Advances the fake clock, then settles the session's queued updates.
 *
 * @param ms - Fake-timer milliseconds to advance.
 */
async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

/** A real iframe preview provider already pointed at the preview URL. */
function providerAtUrl(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL })
  provider.setUrl(PREVIEW_URL)
  return provider
}

/**
 * Simulates an inbound bridge message from the preview iframe (same-origin).
 *
 * @param source - The window the panel trusts as the preview's (the captured one).
 * @param data - The message payload.
 */
async function postFromPreview(source: Window, data: Record<string, unknown>): Promise<void> {
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
  await settle()
}

/** The `postMessage` signature the panel's outbound relay calls. */
type PostMessage = (payload: unknown, targetOrigin?: string) => void

/** One spy on the preview iframe's outbound posts, and the window it answers as. */
interface CapturedPosts {
  /** Every `postMessage` call the panel made. */
  spy: ReturnType<typeof vi.fn<PostMessage>>
  /** The window standing in as the iframe's `contentWindow` (the trust-gate identity). */
  window: Window
}

/**
 * Records every post the panel sends to its preview iframe.
 *
 * The spy sits on a stable stand-in for the iframe's `contentWindow` rather than
 * on the jsdom window itself: the panel's stuck-load recovery navigates the
 * iframe with a cache-busted src and later remounts the element, so jsdom hands
 * out a NEW window (and a new element) and a spy on the first one would silently
 * stop hearing the relay. The stand-in is installed on the iframe ELEMENT
 * prototype so the remounted element answers with the same window; the relay's
 * cadence is what these cases assert, not which window object jsdom allocated.
 *
 * @param iframe - The mounted preview iframe.
 * @returns The recorded posts and the stand-in window.
 */
function capturePosts(iframe: HTMLIFrameElement): CapturedPosts {
  const spy = vi.fn<PostMessage>(() => {})
  const previewWindow: Window = Object.create(iframe.contentWindow) as Window
  Object.defineProperty(previewWindow, 'postMessage', { configurable: true, value: spy })
  Object.defineProperty(Object.getPrototypeOf(iframe), 'contentWindow', {
    configurable: true,
    get: () => previewWindow,
  })
  return { spy, window: previewWindow }
}

/** A concrete click command. */
const cmd = (id: string): PreviewUiCommand => ({ id, action: 'click', molId: 'submit-button' })

/** postMessage calls carrying the ui-command payload (not other bridge posts). */
const commandPosts = (spy: { mock: { calls: unknown[][] } }): Array<Record<string, unknown>> =>
  spy.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((payload) => payload?.type === 'molecule:ui-command')

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 }))),
  )
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
 * Mounts a panel whose `uiCommand` the test drives through a signal, with its
 * iframe up and a spy on the IFRAME's `postMessage` (the outbound relay target).
 *
 * @param command - The command at mount (null for none).
 * @param onUiResult - The host's result callback.
 * @returns The handles the cases drive.
 */
async function mountWithCommand(
  command: PreviewUiCommand | null,
  onUiResult?: (id: string, result: unknown) => void,
): Promise<{
  container: HTMLElement
  iframe: HTMLIFrameElement
  previewWindow: Window
  postSpy: ReturnType<typeof vi.fn<PostMessage>>
  setUiCommand: (command: PreviewUiCommand | null) => void
}> {
  const provider = providerAtUrl()
  const [uiCommand, setUiCommand] = createSignal<PreviewUiCommand | null>(command)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <PreviewContext.Provider value={provider}>
        <PreviewPanel isBuilding={false} uiCommand={uiCommand()} onUiResult={onUiResult} />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose })
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe') as HTMLIFrameElement
  expect(iframe).not.toBeNull()
  const captured = capturePosts(iframe)
  return {
    container,
    iframe,
    previewWindow: captured.window,
    postSpy: captured.spy,
    setUiCommand: (next: PreviewUiCommand | null): void => {
      setUiCommand(next)
    },
  }
}

describe('PreviewPanel — uiCommand relay', () => {
  it('posts a NEW command id into the iframe immediately, targeted at the src origin', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    await settle()
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
    await settle()
    expect(commandPosts(postSpy)).toHaveLength(0)
    await advance(700)
    expect(commandPosts(postSpy).some((p) => p.action === 'fill')).toBe(false)
  }, 30_000)

  it('re-posts every 350ms until the bridge answers, then stops', async () => {
    const onUiResult = vi.fn()
    const { previewWindow, postSpy } = await mountWithCommand(cmd('cmd-1'), onUiResult)
    // The mount post already happened; each 350ms tick re-posts.
    await advance(1_050)
    expect(commandPosts(postSpy)).toHaveLength(3)
    // The bridge answers: forwarded to the host keyed by id, and the loop stops.
    await postFromPreview(previewWindow, {
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
    await advance(1_400)
    expect(commandPosts(postSpy)).toHaveLength(3)
  }, 30_000)

  it('stops re-posting at the 40s deadline even with no answer', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    await settle()
    await advance(41_000)
    const atDeadline = commandPosts(postSpy).length
    expect(atDeadline).toBeGreaterThan(100)
    await advance(2_000)
    expect(commandPosts(postSpy).length).toBe(atDeadline)
  }, 30_000)

  it('a pending command is re-posted on an inbound bridge frame (the un-throttled retry)', async () => {
    const { previewWindow, postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    await settle()
    postSpy.mockClear()
    // A heartbeat proves the bridge is alive — the command rides it instantly,
    // with no 350ms wait (hidden tabs throttle intervals, not message events).
    await postFromPreview(previewWindow, { type: 'molecule:heartbeat' })
    expect(commandPosts(postSpy)).toHaveLength(1)
    // The ui-result frame itself must NOT re-post the command it answers.
    postSpy.mockClear()
    await postFromPreview(previewWindow, { type: 'molecule:ui-result', id: 'cmd-1', ok: true })
    expect(commandPosts(postSpy)).toHaveLength(0)
  }, 30_000)

  it('a pending command is re-posted when the document fires onLoad', async () => {
    const { iframe, postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('nav-1'))
    await settle()
    postSpy.mockClear()
    iframe.dispatchEvent(new Event('load'))
    await settle()
    expect(commandPosts(postSpy)).toHaveLength(1)
  }, 30_000)

  it('does not re-post on bridge frames once the deadline has passed', async () => {
    const { previewWindow, postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    await settle()
    await advance(41_000)
    postSpy.mockClear()
    await postFromPreview(previewWindow, { type: 'molecule:heartbeat' })
    expect(commandPosts(postSpy)).toHaveLength(0)
  }, 30_000)

  it('switching to a NEW command stops the previous retry loop', async () => {
    const { postSpy, setUiCommand } = await mountWithCommand(null)
    setUiCommand(cmd('cmd-1'))
    await settle()
    postSpy.mockClear()
    setUiCommand(cmd('cmd-2'))
    await settle()
    expect(commandPosts(postSpy)).toHaveLength(1)
    expect(commandPosts(postSpy)[0]?.id).toBe('cmd-2')
    await advance(700)
    expect(commandPosts(postSpy).filter((p) => p.id === 'cmd-1')).toHaveLength(0)
  }, 30_000)

  it('a ui-result for an UNRELATED id is forwarded but clears no pending command', async () => {
    const onUiResult = vi.fn()
    const { previewWindow, postSpy, setUiCommand } = await mountWithCommand(null, onUiResult)
    setUiCommand(cmd('cmd-1'))
    await settle()
    postSpy.mockClear()
    // A stale result from an earlier command: the host still hears it, and
    // cmd-1's retry loop is unaffected (it is not the answer to cmd-1).
    await postFromPreview(previewWindow, { type: 'molecule:ui-result', id: 'cmd-0', ok: true })
    expect(onUiResult).toHaveBeenCalledWith('cmd-0', {
      type: 'molecule:ui-result',
      id: 'cmd-0',
      ok: true,
    })
    await advance(700)
    expect(commandPosts(postSpy).length).toBeGreaterThanOrEqual(2)
  }, 30_000)
})
