// @vitest-environment jsdom

/**
 * `molecule:viewport` resizes the preview frame.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.viewport.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync` through the shared `createPreviewPanelSession`.
 *
 * The e2e preview client posts this and then polls its own innerWidth until
 * the host honours it; PreviewPanel already read a `requestedSize` for the
 * iframe's width/height, but nothing ever set it, so every
 * `page.setViewportSize` was answered with the unchanged size and the bond
 * warned "the preview host kept its own size". A phone layout therefore could
 * not be verified from a build — three of the seven first-contact failures in
 * X0 R83 were phone/geometry facts.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MountedPanel } from './preview-panel-harness.js'
import {
  advance,
  buildPreviewProvider,
  installStubClassMap,
  mountWithIframe,
  postFromPreview,
} from './preview-panel-harness.js'

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

beforeEach(() => {
  installStubClassMap()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 200 }))),
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

/** Mount + drive the server-up poll so the iframe mounts; return it. */
async function mount(): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const mounted = await mountWithIframe(buildPreviewProvider(), { isBuilding: false })
  panel = mounted
  return { container: mounted.container, iframe: mounted.iframe }
}

describe('molecule:viewport', () => {
  it('resizes the frame to the requested viewport', async () => {
    const { iframe } = await mount()
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    expect(iframe.style.height).toBe('844px')
  })

  it('clamps a viewport that would escape the panel or be unusable', async () => {
    const { iframe } = await mount()
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:viewport', width: 99999, height: 99999 })
    await advance(10)
    expect(iframe.style.width).toBe('4000px')
    postFromPreview({ type: 'molecule:viewport', width: 1, height: 1 })
    await advance(10)
    expect(iframe.style.width).toBe('120px')
  })

  it('hands the frame back to the device selector on a zero size', async () => {
    const { iframe } = await mount()
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    postFromPreview({ type: 'molecule:viewport', width: 0, height: 0 })
    await advance(10)
    expect(iframe.style.width).not.toBe('390px')
  })

  it('ignores a viewport that did not come from the preview window', async () => {
    const { iframe } = await mount()
    postFromPreview({ type: 'molecule:ready' })
    const before = iframe.style.width
    // No `source`: the trust gate must drop it.
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'molecule:viewport', width: 390, height: 844 },
        origin: 'http://localhost:5173',
      }),
    )
    await advance(10)
    expect(iframe.style.width).toBe(before)
  })
})
