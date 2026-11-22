// @vitest-environment jsdom
/**
 * `molecule:viewport` resizes the preview frame — a port of
 * `@molecule/app-ide-react/src/__tests__/PreviewPanel.viewport.test.tsx` with the
 * same test names and the same assertions, mounted as a real Solid root.
 *
 * The e2e preview client posts this and then polls its own innerWidth until the
 * host honours it; the shared preview behaviour clamps what a page may ask for,
 * hands the frame back to the device selector on a zero size, and trusts only
 * messages from the preview window.
 *
 * The Solid panel is a view over the same shared behaviour, so a real jsdom
 * render driven by a real iframe preview provider must reach the same DOM states
 * React's panel reaches.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
 * Dispatches an inbound bridge message from the preview iframe (same-origin).
 *
 * @param container - The mount container.
 * @param data - The message payload.
 * @param withSource - Whether to carry the iframe's own window as the source.
 */
async function postFromPreview(
  container: HTMLElement,
  data: Record<string, unknown>,
  withSource = true,
): Promise<void> {
  const source = withSource ? (container.querySelector('iframe')?.contentWindow ?? null) : null
  const event: MessageEventInit = { data, origin: PREVIEW_ORIGIN }
  if (withSource) event.source = source
  window.dispatchEvent(new MessageEvent('message', event))
  await settle()
}

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
 * Mounts the panel over a real provider and drives the server-up poll so the
 * iframe mounts; returns handles.
 *
 * @param isBuilding - The panel's `isBuilding` prop.
 * @returns The mount container and the iframe.
 */
async function mount(
  isBuilding: boolean,
): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const provider = providerAtUrl()
  const dispose = render(
    () => (
      <PreviewContext.Provider value={provider}>
        <PreviewPanel isBuilding={isBuilding} />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose })
  // Advance in small steps so the server-up poll's mocked-fetch microtask resolves (and
  // the iframe mounts) BEFORE the probe's 500ms abort timer can race it under fake timers.
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { container, iframe: iframe as HTMLIFrameElement }
}

describe('molecule:viewport', () => {
  it('resizes the frame to the requested viewport', async () => {
    const { container, iframe } = await mount(false)
    await postFromPreview(container, { type: 'molecule:ready' })
    await postFromPreview(container, { type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    expect(iframe.style.height).toBe('844px')
  })

  it('clamps a viewport that would escape the panel or be unusable', async () => {
    const { container, iframe } = await mount(false)
    await postFromPreview(container, { type: 'molecule:ready' })
    await postFromPreview(container, { type: 'molecule:viewport', width: 99999, height: 99999 })
    await advance(10)
    expect(iframe.style.width).toBe('4000px')
    await postFromPreview(container, { type: 'molecule:viewport', width: 1, height: 1 })
    await advance(10)
    expect(iframe.style.width).toBe('120px')
  })

  it('hands the frame back to the device selector on a zero size', async () => {
    const { container, iframe } = await mount(false)
    await postFromPreview(container, { type: 'molecule:ready' })
    await postFromPreview(container, { type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    await postFromPreview(container, { type: 'molecule:viewport', width: 0, height: 0 })
    await advance(10)
    expect(iframe.style.width).not.toBe('390px')
  })

  it('ignores a viewport that did not come from the preview window', async () => {
    const { container, iframe } = await mount(false)
    await postFromPreview(container, { type: 'molecule:ready' })
    const before = iframe.style.width
    // No `source`: the trust gate must drop it.
    await postFromPreview(container, { type: 'molecule:viewport', width: 390, height: 844 }, false)
    await advance(10)
    expect(iframe.style.width).toBe(before)
  })
})
