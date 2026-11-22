// @vitest-environment jsdom

/**
 * The persisted preview orientation — a GLOBAL (cross-device) preference,
 * restored from the bonded storage provider on mount and written on every
 * rotate. The restore is best-effort: a storage provider that fails (or none
 * bonded) simply leaves the portrait default.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.orientation.test.tsx`
 * with the same test names and the same assertions: the orientation state and
 * its storage reads/writes live in the SAME shared behaviour
 * (`usePreviewPanelLogic`), and the Solid panel renders the same device-frame
 * selector ids, so a real jsdom render reaches the same iframe dimensions.
 * A microtask settle replaces React's `act()`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-live-preview-iframe'
import { PreviewContext } from '@molecule/app-solid'
import {
  createMemoryStorageProvider,
  setProvider as setStorageProvider,
  type StorageProvider,
} from '@molecule/app-storage'

import { PreviewPanel } from '../components/PreviewPanel.jsx'

const PREVIEW_URL = 'http://localhost:5173/'
const ORIENTATION_KEY = 'molecule.ide.preview.orientation'

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

/** A real successful fetch response, as the panel's server-up probe reads it. */
const okResponse = (): Promise<Response> => Promise.resolve(new Response(null, { status: 200 }))

/** A real iframe preview provider at the URL with the tablet frame selected. */
function tabletProvider(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL, defaultDevice: 'tablet' })
  provider.setUrl(PREVIEW_URL)
  return provider
}

/**
 * Mounts the panel over the tablet provider and drives the server-up poll.
 *
 * @returns The mount container.
 */
async function mountTablet(): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <PreviewContext.Provider value={tabletProvider()}>
        <PreviewPanel isBuilding={false} />
      </PreviewContext.Provider>
    ),
    container,
  )
  mounted.push({ dispose })
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  // Let the async orientation restore land.
  await advance(50)
  return container
}

/**
 * The rendered iframe's inline width and height.
 *
 * @param container - The mount container.
 * @returns The dimensions.
 */
const dims = (container: HTMLElement): { width: string; height: string } => {
  const iframe = container.querySelector('iframe')
  if (!(iframe instanceof HTMLIFrameElement)) throw new Error('the preview iframe never mounted')
  return { width: iframe.style.width, height: iframe.style.height }
}

/**
 * Open the device-frame menu (its rows only exist while it is open).
 *
 * @param container - The mount container.
 */
const openMenu = (container: HTMLElement): void => {
  const trigger = container.querySelector('[data-mol-id="preview-device-cycle"]')
  if (!(trigger instanceof HTMLElement)) throw new Error('the device-frame trigger is not rendered')
  trigger.click()
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(okResponse))
  vi.useFakeTimers()
})

afterEach(() => {
  for (const mount of mounted.splice(0)) mount.dispose()
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
    const rotate = container.querySelector('[data-mol-id="preview-device-rotate"]')
    if (!(rotate instanceof HTMLElement)) throw new Error('the rotate row is not rendered')
    rotate.click()
    await advance(50)
    expect(dims(container)).toEqual({ width: '1024px', height: '768px' })
    expect(writes).toContainEqual([ORIENTATION_KEY, 'landscape'])

    // …and back: the write follows the value, not the direction.
    openMenu(container)
    const rotateBack = container.querySelector('[data-mol-id="preview-device-rotate"]')
    if (!(rotateBack instanceof HTMLElement)) throw new Error('the rotate row is not rendered')
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
    const mobileOption = container.querySelector('[data-mol-id="preview-device-option-mobile"]')
    if (!(mobileOption instanceof HTMLElement)) throw new Error('the mobile option is not rendered')
    mobileOption.click()
    await advance(50)
    expect(dims(container)).toEqual({ width: '667px', height: '375px' })
  })
})
