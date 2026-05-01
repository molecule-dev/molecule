// @vitest-environment jsdom

import { act, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  __setBarcodeDetectorOverride,
  __setZxingLoaderOverride,
  BarcodeScanner,
  type BarcodeScannerError,
  type BarcodeScanResult,
  DEFAULT_FORMATS,
  type ZxingReader,
} from '../BarcodeScanner.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/**
 * Build a fake `MediaStream` with one stoppable track. `getTracks()`
 * + `getVideoTracks()` both return the same array so the production
 * cleanup path can `track.stop()` without throwing.
 *
 * @returns `{ stream, stop }` — `stop` is a vi spy on the track stop.
 */
function createFakeStream(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
  const stop = vi.fn()
  const track = { stop, kind: 'video' } as unknown as MediaStreamTrack
  const tracks = [track]
  const stream = {
    getTracks: () => tracks,
    getVideoTracks: () => tracks,
  } as unknown as MediaStream
  return { stream, stop }
}

/**
 * Install a `getUserMedia` mock on `navigator.mediaDevices`. Restored
 * by `afterEach`.
 *
 * @param impl - The mock implementation.
 * @returns The vi spy installed.
 */
function installGetUserMedia(
  impl: (constraints?: MediaStreamConstraints) => Promise<MediaStream>,
): ReturnType<typeof vi.fn> {
  const fn = vi.fn(impl)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: fn },
  })
  return fn
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  // Stub out HTMLMediaElement.play — jsdom doesn't implement it.
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  __setBarcodeDetectorOverride(undefined)
  __setZxingLoaderOverride(undefined)
  // Drop the fake mediaDevices definition so the next test installs cleanly.
  // jsdom doesn't define it by default, so deleting is fine.
  delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices
  vi.restoreAllMocks()
})

describe('DEFAULT_FORMATS', () => {
  it('covers the four most common retail / logistics codes', () => {
    expect(DEFAULT_FORMATS).toEqual(['ean_13', 'upc_a', 'code_128', 'qr_code'])
  })
})

describe('<BarcodeScanner> — render', () => {
  it('renders a region with the localized aria-label', async () => {
    installGetUserMedia(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
    __setBarcodeDetectorOverride(null)
    __setZxingLoaderOverride(null)

    const { container } = render(
      <Wrap>
        <BarcodeScanner onScan={vi.fn()} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="barcode-scanner"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('aria-label')).toBeTruthy()
    expect(root?.getAttribute('role')).toBe('region')
    expect(container.querySelector('[data-mol-id="barcode-scanner-video"]')).not.toBeNull()
  })
})

describe('<BarcodeScanner> — getUserMedia', () => {
  it('calls getUserMedia with facingMode environment', async () => {
    const { stream } = createFakeStream()
    const fn = installGetUserMedia(() => Promise.resolve(stream))
    // Native detector that never finds anything keeps the loop quiet.
    __setBarcodeDetectorOverride(
      class FakeDetector {
        async detect() {
          return []
        }
      } as unknown as never,
    )

    render(
      <Wrap>
        <BarcodeScanner onScan={vi.fn()} />
      </Wrap>,
    )
    await waitFor(() => expect(fn).toHaveBeenCalled())
    const constraints = fn.mock.calls[0][0] as MediaStreamConstraints
    const videoConstraints = constraints.video as MediaTrackConstraints
    expect(videoConstraints.facingMode).toBe('environment')
    expect(constraints.audio).toBe(false)
  })

  it('dispatches permission_denied on NotAllowedError', async () => {
    installGetUserMedia(() => Promise.reject(new DOMException('nope', 'NotAllowedError')))
    __setBarcodeDetectorOverride(null)
    __setZxingLoaderOverride(null)

    const onError = vi.fn<[BarcodeScannerError], void>()
    const { container } = render(
      <Wrap>
        <BarcodeScanner onScan={vi.fn()} onError={onError} />
      </Wrap>,
    )
    await waitFor(() => expect(onError).toHaveBeenCalled())
    const err = onError.mock.calls[0][0]
    expect(err.code).toBe('permission_denied')
    expect(err.message).toBeTruthy()
    const root = container.querySelector('[data-mol-id="barcode-scanner"]')
    expect(root?.getAttribute('data-status')).toBe('error')
  })

  it('dispatches no_camera on NotFoundError', async () => {
    installGetUserMedia(() => Promise.reject(new DOMException('none', 'NotFoundError')))
    __setBarcodeDetectorOverride(null)
    __setZxingLoaderOverride(null)

    const onError = vi.fn<[BarcodeScannerError], void>()
    render(
      <Wrap>
        <BarcodeScanner onScan={vi.fn()} onError={onError} />
      </Wrap>,
    )
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('no_camera')
  })

  it('dispatches unsupported when navigator.mediaDevices is missing', async () => {
    // Don't install — leave navigator.mediaDevices undefined.
    __setBarcodeDetectorOverride(null)
    __setZxingLoaderOverride(null)
    const onError = vi.fn<[BarcodeScannerError], void>()
    render(
      <Wrap>
        <BarcodeScanner onScan={vi.fn()} onError={onError} />
      </Wrap>,
    )
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('unsupported')
  })
})

describe('<BarcodeScanner> — native BarcodeDetector path', () => {
  it('passes formats into the BarcodeDetector constructor and emits onScan', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const detectMock = vi
      .fn<[unknown], Promise<Array<{ rawValue: string; format: string }>>>()
      .mockResolvedValueOnce([{ rawValue: '012345678905', format: 'upc_a' }])
      .mockResolvedValue([])

    const ctorSpy = vi.fn()
    class FakeDetector {
      constructor(init?: { formats?: string[] }) {
        ctorSpy(init)
      }
      detect = detectMock
    }
    __setBarcodeDetectorOverride(FakeDetector as unknown as never)

    const onScan = vi.fn<[BarcodeScanResult], void>()
    render(
      <Wrap>
        <BarcodeScanner onScan={onScan} formats={['upc_a', 'ean_13']} />
      </Wrap>,
    )

    await waitFor(() => expect(onScan).toHaveBeenCalled())
    expect(ctorSpy).toHaveBeenCalledWith({ formats: ['upc_a', 'ean_13'] })
    expect(onScan).toHaveBeenCalledWith({ format: 'upc_a', value: '012345678905' })
  })

  it('stops scanning after the first match when continuous=false', async () => {
    const { stream, stop } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const detectMock = vi
      .fn<[unknown], Promise<Array<{ rawValue: string; format: string }>>>()
      .mockResolvedValueOnce([{ rawValue: '4006381333931', format: 'ean_13' }])
      .mockResolvedValue([])

    class FakeDetector {
      detect = detectMock
    }
    __setBarcodeDetectorOverride(FakeDetector as unknown as never)

    const onScan = vi.fn<[BarcodeScanResult], void>()
    const { container } = render(
      <Wrap>
        <BarcodeScanner onScan={onScan} continuous={false} scanIntervalMs={5} />
      </Wrap>,
    )
    await waitFor(() => expect(onScan).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        container.querySelector('[data-mol-id="barcode-scanner"]')?.getAttribute('data-status'),
      ).toBe('stopped'),
    )
    expect(stop).toHaveBeenCalled()
  })

  it('keeps scanning after a match when continuous=true and dedupes consecutive identical reads', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const detectMock = vi
      .fn<[unknown], Promise<Array<{ rawValue: string; format: string }>>>()
      .mockResolvedValueOnce([{ rawValue: 'X', format: 'qr_code' }])
      .mockResolvedValueOnce([{ rawValue: 'X', format: 'qr_code' }])
      .mockResolvedValueOnce([{ rawValue: 'Y', format: 'qr_code' }])
      .mockResolvedValue([])

    class FakeDetector {
      detect = detectMock
    }
    __setBarcodeDetectorOverride(FakeDetector as unknown as never)

    const onScan = vi.fn<[BarcodeScanResult], void>()
    render(
      <Wrap>
        <BarcodeScanner onScan={onScan} continuous scanIntervalMs={1} />
      </Wrap>,
    )
    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(2))
    expect(onScan.mock.calls[0][0].value).toBe('X')
    expect(onScan.mock.calls[1][0].value).toBe('Y')
  })

  it('dispatches detector_failure when detect() throws', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    class FakeDetector {
      async detect() {
        throw new Error('boom')
      }
    }
    __setBarcodeDetectorOverride(FakeDetector as unknown as never)

    const onError = vi.fn<[BarcodeScannerError], void>()
    render(
      <Wrap>
        <BarcodeScanner onScan={vi.fn()} onError={onError} />
      </Wrap>,
    )
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('detector_failure')
  })
})

describe('<BarcodeScanner> — fallback path', () => {
  it('uses the @zxing/library loader when BarcodeDetector is absent', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))
    __setBarcodeDetectorOverride(null)

    const decode = vi
      .fn()
      .mockResolvedValueOnce({ text: 'ABC-123' })
      .mockRejectedValue(new Error('NotFoundException'))
    const reset = vi.fn()
    const reader: ZxingReader = {
      decodeOnceFromVideoElement: decode,
      reset,
    }
    __setZxingLoaderOverride(() => Promise.resolve(reader))

    const onScan = vi.fn<[BarcodeScanResult], void>()
    render(
      <Wrap>
        <BarcodeScanner onScan={onScan} scanIntervalMs={1} />
      </Wrap>,
    )
    await waitFor(() => expect(onScan).toHaveBeenCalled())
    expect(onScan).toHaveBeenCalledWith({ format: 'unknown', value: 'ABC-123' })
  })

  it('dispatches fallback_unavailable when the loader is forced off', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))
    __setBarcodeDetectorOverride(null)
    __setZxingLoaderOverride(null)

    const onError = vi.fn<[BarcodeScannerError], void>()
    render(
      <Wrap>
        <BarcodeScanner onScan={vi.fn()} onError={onError} />
      </Wrap>,
    )
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('fallback_unavailable')
  })
})

describe('<BarcodeScanner> — cleanup', () => {
  it('stops camera tracks on unmount', async () => {
    const { stream, stop } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))
    class FakeDetector {
      async detect() {
        return []
      }
    }
    __setBarcodeDetectorOverride(FakeDetector as unknown as never)

    const { unmount, container } = render(
      <Wrap>
        <BarcodeScanner onScan={vi.fn()} scanIntervalMs={1} />
      </Wrap>,
    )
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="barcode-scanner-video"]')).not.toBeNull(),
    )
    // Wait one tick so the async start() has attached the stream.
    await act(async () => {
      await Promise.resolve()
    })
    unmount()
    // Cleanup runs synchronously inside the effect's return; the
    // mock-stream track.stop must have been called at least once.
    expect(stop).toHaveBeenCalled()
  })
})
