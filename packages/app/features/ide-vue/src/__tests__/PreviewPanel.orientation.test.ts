// @vitest-environment jsdom

/**
 * The persisted preview orientation — a GLOBAL (cross-device) preference,
 * restored from the bonded storage provider on mount and written on every
 * rotate. The restore is best-effort: a storage provider that fails (or none
 * bonded) simply leaves the portrait default.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.orientation.test.tsx`
 * with the same test names and the same assertions: the Vue panel is a view over
 * the same shared behaviour (`createPreviewPanelSession`), so a real jsdom render
 * of {@link PreviewPanel} driven by a real iframe preview provider must restore,
 * write and keep the orientation exactly as React's panel does.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'
import {
  createMemoryStorageProvider,
  setProvider as setStorageProvider,
  type StorageProvider,
} from '@molecule/app-storage'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type MountedPanel, mountPanel, settle } from './preview-panel-harness.js'

const PREVIEW_URL = 'http://localhost:5173/'
const ORIENTATION_KEY = 'molecule.ide.preview.orientation'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * Advances the fake clock, flushing the session's queued updates and the view's
 * re-render (Vue's next-tick flush replaces React's `act()`).
 *
 * @param ms - Fake-timer milliseconds to advance.
 * @returns Resolves once the view re-rendered.
 */
async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

/**
 * Mounts the panel and tracks it for teardown.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @returns The mounted panel.
 */
function mount(provider: PreviewProvider): MountedPanel {
  const panel = mountPanel(provider, { isBuilding: false })
  mounted.push(panel)
  return panel
}

/** A real iframe preview provider at the URL with the tablet frame selected. */
function tabletProvider(): PreviewProvider {
  const provider = createProvider({ defaultUrl: PREVIEW_URL, defaultDevice: 'tablet' })
  provider.setUrl(PREVIEW_URL)
  return provider
}

/**
 * Mounts with the tablet frame and lets the async orientation restore land.
 *
 * @returns The mounted panel.
 */
async function mountTablet(): Promise<MountedPanel> {
  const panel = mount(tabletProvider())
  for (let i = 0; i < 12 && !panel.container.querySelector('iframe'); i++) {
    await advance(50)
  }
  // Let the async orientation restore land.
  await advance(50)
  return panel
}

/**
 * The preview iframe's inline width/height.
 *
 * @param container - The mount container.
 * @returns The width and height CSS values.
 */
function dims(container: HTMLElement): { width: string; height: string } {
  const iframe = container.querySelector('iframe') as HTMLIFrameElement
  return { width: iframe.style.width, height: iframe.style.height }
}

/**
 * Opens the device-frame menu (its rows only exist while it is open).
 *
 * @param container - The mount container.
 * @returns Resolves once the menu rendered.
 */
async function openMenu(container: HTMLElement): Promise<void> {
  ;(container.querySelector('[data-mol-id="preview-device-cycle"]') as HTMLElement).click()
  await settle()
}

beforeEach(() => {
  setClassMap(classMap)
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => ({ ok: true, status: 200 }) as Response),
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

describe('PreviewPanel — persisted orientation', () => {
  it('restores a stored landscape orientation for a rotatable frame', async () => {
    const storage = createMemoryStorageProvider()
    await storage.set(ORIENTATION_KEY, 'landscape')
    setStorageProvider(storage)
    const { container } = await mountTablet()
    // Tablet portrait is 768x1024; the stored landscape swaps it.
    expect(dims(container)).toEqual({ width: '1024px', height: '768px' })
  })

  it('keeps the portrait default when the storage read fails (no provider is not an error)', async () => {
    const failing: StorageProvider = {
      ...createMemoryStorageProvider(),
      async get() {
        throw new Error('storage unavailable')
      },
    }
    setStorageProvider(failing)
    const { container } = await mountTablet()
    expect(dims(container)).toEqual({ width: '768px', height: '1024px' })
  })

  it('rotating writes the new orientation through the storage bond', async () => {
    const writes: Array<[string, string]> = []
    const storage = createMemoryStorageProvider()
    const recording: StorageProvider = {
      ...storage,
      async set(key: string, value: unknown) {
        writes.push([key, String(value)])
        return storage.set(key, value)
      },
    }
    setStorageProvider(recording)
    const { container } = await mountTablet()
    expect(dims(container)).toEqual({ width: '768px', height: '1024px' })

    await openMenu(container)
    ;(container.querySelector('[data-mol-id="preview-device-rotate"]') as HTMLElement).click()
    await advance(50)
    expect(dims(container)).toEqual({ width: '1024px', height: '768px' })
    expect(writes).toContainEqual([ORIENTATION_KEY, 'landscape'])

    // …and back: the write follows the value, not the direction.
    await openMenu(container)
    ;(container.querySelector('[data-mol-id="preview-device-rotate"]') as HTMLElement).click()
    await advance(50)
    expect(dims(container)).toEqual({ width: '768px', height: '1024px' })
    expect(writes).toContainEqual([ORIENTATION_KEY, 'portrait'])
  })

  it('a device switch keeps the chosen orientation (it is a global preference)', async () => {
    const storage = createMemoryStorageProvider()
    await storage.set(ORIENTATION_KEY, 'landscape')
    setStorageProvider(storage)
    const { container } = await mountTablet()
    expect(dims(container)).toEqual({ width: '1024px', height: '768px' })
    // Switch to the mobile frame through the selector: landscape still applies
    // (mobile portrait is 375x667; landscape swaps it).
    await openMenu(container)
    ;(
      container.querySelector('[data-mol-id="preview-device-option-mobile"]') as HTMLElement
    ).click()
    await advance(50)
    expect(dims(container)).toEqual({ width: '667px', height: '375px' })
  })
})
