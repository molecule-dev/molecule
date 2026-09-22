// @vitest-environment jsdom

/**
 * `molecule:viewport` resizes the preview frame.
 *
 * The e2e preview client posts this and then polls its own innerWidth until
 * the host honours it; PreviewPanel already read a `requestedSize` for the
 * iframe's width/height, but nothing ever set it, so every
 * `page.setViewportSize` was answered with the unchanged size and the bond
 * warned "the preview host kept its own size". A phone layout therefore could
 * not be verified from a build — three of the seven first-contact failures in
 * X0 R83 were phone/geometry facts.
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
  // The panel's trust gate accepts molecule:* ONLY from the preview iframe's own window
  // (event.source === iframe.contentWindow), so simulate a genuine message from it. The panel
  // renders exactly one iframe; its contentWindow is a real (jsdom) Window once mounted.
  // act(): the handler's setStates must COMMIT before the test advances fake timers, or a
  // timer callback (the 12s stale-doc recovery) reads the pre-ready refs and acts on them.
  const source = document.querySelector('iframe')?.contentWindow ?? null
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
  })
}

/**
 * Advance fake timers INSIDE act() so React work scheduled by timer callbacks
 * (setState from the ceiling / stuck-retry / recovery timers) is flushed before
 * the caller asserts on the DOM. A bare `vi.advanceTimersByTimeAsync` only
 * yields to the real event loop while it still has fake timers to step through,
 * so whether React's commit (a real macrotask) ran before the assertion used to
 * depend on the incidental timer layout AFTER the state change — retuning a
 * constant (STUCK_DETECT_MS 8s→15s) silently broke these tests that way.
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once timers ran and React flushed.
 */
const advance = (ms: number): Promise<void> => act(() => vi.advanceTimersByTimeAsync(ms))

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
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  return { container, iframe: iframe as HTMLIFrameElement }
}

describe('molecule:viewport', () => {
  it('resizes the frame to the requested viewport', async () => {
    const { iframe } = await mount(false)
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    expect(iframe.style.height).toBe('844px')
  })

  it('clamps a viewport that would escape the panel or be unusable', async () => {
    const { iframe } = await mount(false)
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:viewport', width: 99999, height: 99999 })
    await advance(10)
    expect(iframe.style.width).toBe('4000px')
    postFromPreview({ type: 'molecule:viewport', width: 1, height: 1 })
    await advance(10)
    expect(iframe.style.width).toBe('120px')
  })

  it('hands the frame back to the device selector on a zero size', async () => {
    const { iframe } = await mount(false)
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    postFromPreview({ type: 'molecule:viewport', width: 0, height: 0 })
    await advance(10)
    expect(iframe.style.width).not.toBe('390px')
  })

  it('ignores a viewport that did not come from the preview window', async () => {
    const { iframe } = await mount(false)
    postFromPreview({ type: 'molecule:ready' })
    const before = iframe.style.width
    act(() => {
      // No `source`: the trust gate must drop it.
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'molecule:viewport', width: 390, height: 844 },
          origin: PREVIEW_ORIGIN,
        }),
      )
    })
    await advance(10)
    expect(iframe.style.width).toBe(before)
  })
})
