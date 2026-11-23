// @vitest-environment jsdom

/**
 * Angular inserts the preview `<iframe>` (the root of an `@for` view) before it binds `[src]`,
 * and a browser fires the initial about:blank document's `load` synchronously on that insertion.
 * The panel passed that event to the session as the preview's load, so the stuck detector stood
 * down and the loaded-but-unrendered recovery reloaded the frame on its own schedule instead.
 * The other ports set `src` before inserting the element and never see that event, so this file
 * has no React original.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  forget,
  type MountedPanel,
  mountPanel,
  providerAtUrl,
  settle,
} from './preview-panel-harness.js'

const PREVIEW_URL = 'https://abc123.mlcl.dev/'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * Advances the fake clock with the session's own renders held until the end, as
 * `PreviewPanel.server-probe.test.ts` does.
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once the held batch rendered.
 */
async function advance(ms: number): Promise<void> {
  const held: Array<() => void> = []
  const realQueueMicrotask = globalThis.queueMicrotask
  globalThis.queueMicrotask = (callback: VoidFunction): void => {
    held.push(callback)
  }
  try {
    await vi.advanceTimersByTimeAsync(ms)
    await settle()
  } finally {
    globalThis.queueMicrotask = realQueueMicrotask
  }
  for (const callback of held) callback()
  await settle()
}

beforeEach(() => {
  setClassMap(classMap)
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

describe('PreviewPanel — the iframe load before its src is bound', () => {
  it('does not count the initial about:blank load as the preview loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: 200 })),
    )
    const loads: (string | null)[] = []
    const onLoad = (event: Event): void => {
      if ((event.target as Element).tagName === 'IFRAME')
        loads.push((event.target as Element).getAttribute('src'))
    }
    document.addEventListener('load', onLoad, true)
    try {
      const panel = await mountPanel(providerAtUrl(PREVIEW_URL), { isBuilding: false })
      mounted.push(panel)
      for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) await advance(50)
      expect(panel.container.querySelector('iframe')?.getAttribute('src')).toBe(PREVIEW_URL)
      // The event this guards against happened: the element loaded once with no src.
      expect(loads).toEqual([null])

      // The preview document never answers. Nothing loaded, so the panel waits for the stuck
      // detector's first cycle (15s) and reloads then, cache-busted, as React's panel does. Taken as
      // the preview's load, the about:blank one sent it down the loaded-but-unrendered recovery
      // instead, which reloaded at 12s and again at 18s.
      const src = (): string | null | undefined =>
        panel.container.querySelector('iframe')?.getAttribute('src')
      await advance(14_000)
      expect(src()).toBe(PREVIEW_URL)
      await advance(2_000)
      const retried = src()
      expect(retried).toContain('_r=')
      await advance(10_000)
      expect(src()).toBe(retried)
      expect(panel.container.textContent).not.toContain("Preview can't load here")
    } finally {
      document.removeEventListener('load', onLoad, true)
    }
  })
})
