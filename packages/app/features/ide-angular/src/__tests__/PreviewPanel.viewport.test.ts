// @vitest-environment jsdom
/**
 * `molecule:viewport` resizes the preview frame — a port of
 * `@molecule/app-ide-react/src/__tests__/PreviewPanel.viewport.test.tsx` with the
 * same test names and the same behavioral assertions, mounted through Angular's
 * own `createApplication` over a real iframe preview provider.
 *
 * The e2e preview client posts this and then polls its own innerWidth until
 * the host honours it; PreviewPanel already read a `requestedSize` for the
 * iframe's width/height, but nothing ever set it, so every
 * `page.setViewportSize` was answered with the unchanged size and the bond
 * warned "the preview host kept its own size".
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  forget,
  loadIframe,
  type MountedPanel,
  mountPanel,
  okResponse,
  type PanelProps,
  postFromPreview,
  PREVIEW_ORIGIN,
  providerAtUrl,
  settle,
} from './preview-panel-harness.js'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * Advances the fake clock, then flushes the microtasks the session's updates queue.
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once the view re-rendered.
 */
const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

/**
 * Mounts the panel over a provider and tracks it for teardown.
 *
 * @param initial - The host-facing props.
 * @returns The mounted panel.
 */
async function mount(initial: PanelProps = {}): Promise<MountedPanel> {
  const panel = await mountPanel(providerAtUrl(), { isBuilding: false, ...initial })
  mounted.push(panel)
  return panel
}

/**
 * Mounts the panel + drives the server-up poll so the iframe mounts.
 *
 * @returns The mounted panel and its iframe.
 */
async function mountWithIframe(): Promise<{ panel: MountedPanel; iframe: HTMLIFrameElement }> {
  const panel = await mount()
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = panel.container.querySelector<HTMLIFrameElement>('iframe')
  expect(iframe).not.toBeNull()
  if (!iframe) throw new Error('the preview iframe never mounted')
  await loadIframe(iframe)
  await postFromPreview(panel.container, { type: 'molecule:ready' })
  await advance(10)
  return { panel, iframe }
}

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

describe('molecule:viewport', () => {
  it('resizes the frame to the requested viewport', async () => {
    const { panel, iframe } = await mountWithIframe()
    await postFromPreview(panel.container, { type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    expect(iframe.style.height).toBe('844px')
  })

  it('clamps a viewport that would escape the panel or be unusable', async () => {
    const { panel, iframe } = await mountWithIframe()
    await postFromPreview(panel.container, {
      type: 'molecule:viewport',
      width: 99999,
      height: 99999,
    })
    await advance(10)
    expect(iframe.style.width).toBe('4000px')
    await postFromPreview(panel.container, { type: 'molecule:viewport', width: 1, height: 1 })
    await advance(10)
    expect(iframe.style.width).toBe('120px')
  })

  it('hands the frame back to the device selector on a zero size', async () => {
    const { panel, iframe } = await mountWithIframe()
    await postFromPreview(panel.container, { type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    await postFromPreview(panel.container, { type: 'molecule:viewport', width: 0, height: 0 })
    await advance(10)
    expect(iframe.style.width).not.toBe('390px')
  })

  it('ignores a viewport that did not come from the preview window', async () => {
    const { iframe } = await mountWithIframe()
    const before = iframe.style.width
    // No `source`: the trust gate must drop it.
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'molecule:viewport', width: 390, height: 844 },
        origin: PREVIEW_ORIGIN,
      }),
    )
    await advance(10)
    expect(iframe.style.width).toBe(before)
  })
})
