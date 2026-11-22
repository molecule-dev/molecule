// @vitest-environment jsdom

/**
 * `molecule:viewport` resizes the preview frame.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.viewport.test.tsx`
 * with the same test names and the same assertions: the Vue panel is a view over
 * the same shared behaviour, so a viewport the e2e preview client posts must be
 * honoured on the iframe's width/height, clamped to usable bounds, reset to the
 * device frame on a zero size, and ignored when it did not come from the preview
 * window.
 *
 * The e2e preview client posts this and then polls its own innerWidth until the
 * host honours it; a phone layout could not be verified from a build otherwise.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  type MountedPanel,
  mountPanel,
  postFromPreview,
  providerAtUrl,
  settle,
} from './preview-panel-harness.js'

/** The preview iframe's origin, as the panel's bridge trust gate reads it. */
const PREVIEW_ORIGIN = 'http://localhost:5173'

/**
 * Advances the fake clock, flushing the microtasks the session's updates queue.
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once the view re-rendered.
 */
const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * Mounts the panel and drives the server-up poll so the iframe mounts.
 *
 * @param isBuilding - The host's active-build hint.
 * @returns The mounted panel and its iframe.
 */
async function mount(
  isBuilding: boolean,
): Promise<{ panel: MountedPanel; iframe: HTMLIFrameElement }> {
  const panel = mountPanel(providerAtUrl(), { isBuilding })
  mounted.push(panel)
  // Advance in small steps so the server-up poll's mocked-fetch microtask resolves (and
  // the iframe mounts) BEFORE the probe's 500ms abort timer can race it under fake timers.
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = panel.container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  return { panel, iframe: iframe as HTMLIFrameElement }
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

describe('molecule:viewport', () => {
  it('resizes the frame to the requested viewport', async () => {
    const { panel, iframe } = await mount(false)
    await postFromPreview(panel.container, { type: 'molecule:ready' })
    await postFromPreview(panel.container, { type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    expect(iframe.style.height).toBe('844px')
  })

  it('clamps a viewport that would escape the panel or be unusable', async () => {
    const { panel, iframe } = await mount(false)
    await postFromPreview(panel.container, { type: 'molecule:ready' })
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
    const { panel, iframe } = await mount(false)
    await postFromPreview(panel.container, { type: 'molecule:ready' })
    await postFromPreview(panel.container, { type: 'molecule:viewport', width: 390, height: 844 })
    await advance(10)
    expect(iframe.style.width).toBe('390px')
    await postFromPreview(panel.container, { type: 'molecule:viewport', width: 0, height: 0 })
    await advance(10)
    expect(iframe.style.width).not.toBe('390px')
  })

  it('ignores a viewport that did not come from the preview window', async () => {
    const { panel, iframe } = await mount(false)
    await postFromPreview(panel.container, { type: 'molecule:ready' })
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
