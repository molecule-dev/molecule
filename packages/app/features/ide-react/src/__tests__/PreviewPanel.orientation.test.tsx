// @vitest-environment jsdom

/**
 * The persisted preview orientation — a GLOBAL (cross-device) preference,
 * restored from the bonded storage provider on mount and written on every
 * rotate. The restore is best-effort: a storage provider that fails (or none
 * bonded) simply leaves the portrait default.
 *
 * @module
 */

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { I18nProvider, PreviewProvider as PreviewContextProvider } from '@molecule/app-react'
import {
  createMemoryStorageProvider,
  setProvider as setStorageProvider,
  type StorageProvider,
} from '@molecule/app-storage'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { PreviewPanel } from '../components/PreviewPanel.js'

const PREVIEW_URL = 'http://localhost:5173/'
const ORIENTATION_KEY = 'molecule.ide.preview.orientation'

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

/** A real iframe preview provider at the URL with the tablet frame selected. */
function tabletProvider(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL, defaultDevice: 'tablet' })
  provider.setUrl(PREVIEW_URL)
  return provider
}

const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

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

/** Mount with the tablet frame; return the panel container. */
async function mountTablet(): Promise<HTMLElement> {
  const { container } = render(
    <Wrap provider={tabletProvider()}>
      <PreviewPanel isBuilding={false} />
    </Wrap>,
  )
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  // Let the async orientation restore land.
  await advance(50)
  return container
}

const dims = (container: HTMLElement): { width: string; height: string } => {
  const iframe = container.querySelector('iframe') as HTMLIFrameElement
  return { width: iframe.style.width, height: iframe.style.height }
}

/** Open the device-frame menu (its rows only exist while it is open). */
const openMenu = (container: HTMLElement): void => {
  fireEvent.click(container.querySelector('[data-mol-id="preview-device-cycle"]') as Element)
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
    fireEvent.click(container.querySelector('[data-mol-id="preview-device-rotate"]') as Element)
    await advance(50)
    expect(dims(container)).toEqual({ width: '1024px', height: '768px' })
    expect(writes).toContainEqual([ORIENTATION_KEY, 'landscape'])

    // …and back: the write follows the value, not the direction.
    openMenu(container)
    fireEvent.click(container.querySelector('[data-mol-id="preview-device-rotate"]') as Element)
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
    fireEvent.click(
      container.querySelector('[data-mol-id="preview-device-option-mobile"]') as Element,
    )
    await advance(50)
    expect(dims(container)).toEqual({ width: '667px', height: '375px' })
  })
})
