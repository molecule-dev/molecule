// @vitest-environment jsdom

/**
 * The persisted preview orientation — a GLOBAL (cross-device) preference,
 * restored from the bonded storage provider on mount and written on every
 * rotate. The restore is best-effort: a storage provider that fails (or none
 * bonded) simply leaves the portrait default.
 *
 * A port of `@molecule/app-ide-react`'s `PreviewPanel.orientation.test.tsx`
 * with the same test names and the same assertions: a real jsdom render of the
 * Svelte `PreviewPanel` with the tablet frame selected, driven by the
 * package's recording live-preview provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewProvider } from '@molecule/app-live-preview'
import {
  createMemoryStorageProvider,
  setProvider as setStorageProvider,
  type StorageProvider,
} from '@molecule/app-storage'

import {
  advance,
  buildPreviewProvider,
  installStubClassMap,
  type MountedPanel,
  mountWithIframe,
} from './preview-panel-harness.js'

const ORIENTATION_KEY = 'molecule.ide.preview.orientation'

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
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** A provider at the preview URL with the tablet frame selected. */
function tabletProvider(): PreviewProvider {
  return buildPreviewProvider({ device: 'tablet' })
}

/**
 * Mount with the tablet frame; return the panel container.
 *
 * @returns The element the panel rendered into.
 */
async function mountTablet(): Promise<HTMLElement> {
  const mounted = await mountWithIframe(tabletProvider(), { isBuilding: false })
  panel = mounted
  // Let the async orientation restore land.
  await advance(50)
  return mounted.container
}

/**
 * The preview iframe's applied size.
 *
 * @param container - The element the panel rendered into.
 * @returns The iframe's CSS width and height.
 */
function dims(container: HTMLElement): { width: string; height: string } {
  const iframe = container.querySelector('iframe')
  if (!(iframe instanceof HTMLIFrameElement)) throw new Error('the preview iframe is missing')
  return { width: iframe.style.width, height: iframe.style.height }
}

/**
 * Opens the device-frame menu (its rows only exist while it is open).
 *
 * @param container - The element the panel rendered into.
 */
function openMenu(container: HTMLElement): void {
  const trigger = container.querySelector('[data-mol-id="preview-device-cycle"]')
  if (!(trigger instanceof HTMLElement)) throw new Error('the device-frame trigger is missing')
  trigger.click()
}

describe('PreviewPanel — persisted orientation', () => {
  it('restores a stored landscape orientation for a rotatable frame', async () => {
    const storage = createMemoryStorageProvider()
    await storage.set(ORIENTATION_KEY, 'landscape')
    setStorageProvider(storage)
    const container = await mountTablet()
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
    const container = await mountTablet()
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
    const container = await mountTablet()
    expect(dims(container)).toEqual({ width: '768px', height: '1024px' })

    openMenu(container)
    await advance(0)
    const rotate = container.querySelector('[data-mol-id="preview-device-rotate"]')
    if (!(rotate instanceof HTMLElement)) throw new Error('the Rotate row is missing')
    rotate.click()
    await advance(50)
    expect(dims(container)).toEqual({ width: '1024px', height: '768px' })
    expect(writes).toContainEqual([ORIENTATION_KEY, 'landscape'])

    // …and back: the write follows the value, not the direction.
    openMenu(container)
    await advance(0)
    const rotateBack = container.querySelector('[data-mol-id="preview-device-rotate"]')
    if (!(rotateBack instanceof HTMLElement)) throw new Error('the Rotate row is missing')
    rotateBack.click()
    await advance(50)
    expect(dims(container)).toEqual({ width: '768px', height: '1024px' })
    expect(writes).toContainEqual([ORIENTATION_KEY, 'portrait'])
  })

  it('a device switch keeps the chosen orientation (it is a global preference)', async () => {
    const storage = createMemoryStorageProvider()
    await storage.set(ORIENTATION_KEY, 'landscape')
    setStorageProvider(storage)
    const container = await mountTablet()
    expect(dims(container)).toEqual({ width: '1024px', height: '768px' })
    // Switch to the mobile frame through the selector: landscape still applies
    // (mobile portrait is 375x667; landscape swaps it).
    openMenu(container)
    await advance(0)
    const mobile = container.querySelector('[data-mol-id="preview-device-option-mobile"]')
    if (!(mobile instanceof HTMLElement)) throw new Error('the Mobile row is missing')
    mobile.click()
    await advance(50)
    expect(dims(container)).toEqual({ width: '667px', height: '375px' })
  })
})
