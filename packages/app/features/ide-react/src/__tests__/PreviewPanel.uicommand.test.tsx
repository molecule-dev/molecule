// @vitest-environment jsdom

/**
 * The `uiCommand` relay — the host's AI-driven interaction command must reach
 * the iframe's bridge, keep re-posting until the bridge answers (a single post
 * races iframe/bridge readiness), stop at the result or the deadline, and ride
 * the un-throttled signals (inbound bridge messages, the document's onLoad)
 * instead of only the 350ms interval a hidden tab throttles to one tick per
 * minute.
 *
 * @module
 */

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { PreviewUiCommand } from '@molecule/app-ide-panel-logic'
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

const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

/** A concrete click command. */
const cmd = (id: string): PreviewUiCommand => ({ id, action: 'click', molId: 'submit-button' })

/** postMessage calls carrying the ui-command payload (not other bridge posts). */
const commandPosts = (spy: { mock: { calls: unknown[][] } }): Array<Record<string, unknown>> =>
  spy.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((payload) => payload?.type === 'molecule:ui-command')

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

/**
 * A panel mounted with `uiCommand`, its iframe up, and a spy on the IFRAME's
 * `postMessage` (the outbound relay target).
 */
async function mountWithCommand(
  command: PreviewUiCommand | null,
  onUiResult?: (id: string, result: unknown) => void,
): Promise<{
  container: HTMLElement
  iframe: HTMLIFrameElement
  postSpy: { mock: { calls: unknown[][] }; mockClear: () => void }
  setUiCommand: (command: PreviewUiCommand | null) => void
}> {
  const provider = providerAtUrl()
  const view = render(
    <Wrap provider={provider}>
      <PreviewPanel isBuilding={false} uiCommand={command} onUiResult={onUiResult} />
    </Wrap>,
  )
  for (let i = 0; i < 12 && !view.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = view.container.querySelector('iframe') as HTMLIFrameElement
  expect(iframe).not.toBeNull()
  const postSpy = vi
    .spyOn(iframe.contentWindow as Window, 'postMessage')
    .mockImplementation(() => {})
  const setUiCommand = (next: PreviewUiCommand | null): void => {
    view.rerender(
      <Wrap provider={provider}>
        <PreviewPanel isBuilding={false} uiCommand={next} onUiResult={onUiResult} />
      </Wrap>,
    )
  }
  return { container: view.container, iframe, postSpy, setUiCommand }
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
    expect(commandPosts(postSpy).some((p) => p.action === 'fill')).toBe(false)
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
    await act(async () => {
      fireEvent.load(iframe)
    })
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
    expect(commandPosts(postSpy).filter((p) => p.id === 'cmd-1')).toHaveLength(0)
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
