// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `BarcodeScanner` — a port of
 * `@molecule/app-feature-barcode-scanner-react/src/__tests__/BarcodeScanner.test.tsx`:
 * the same test names and behavioral assertions, rendered with Svelte 5 runes
 * in jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Shared state the mocked i18n reads (hoisted, so `vi.mock` sees it). */
const mockState = vi.hoisted(() => ({ markerMode: false }))

/** Shared spy + fake reader for the mocked `@zxing/library`. */
const zxingMock = vi.hoisted(() => {
  const ctorSpy = vi.fn<(hints?: Map<number, number[]>) => void>()
  const decodeSpy = vi.fn<() => Promise<{ getText(): string }>>()
  return { ctorSpy, decodeSpy }
})

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }): string =>
      mockState.markerMode ? `[${key}]` : interpolate(opts?.defaultValue ?? key, values),
    // A minimal readable store of the locale (`$locale` reads it).
    locale: {
      subscribe(run: (value: string) => void) {
        run('en')
        return (): void => undefined
      },
    },
  }),
}))

// Mock the real dynamic-import fallback path. Enum values mirror the
// actual `@zxing/library` numeric enums (UPC_A=14, EAN_13=7,
// QR_CODE=11, POSSIBLE_FORMATS=2) so the test asserts the true mapping.
vi.mock('@zxing/library', () => {
  /**
   * Stand-in for `BrowserMultiFormatReader` that records the hints it was
   * constructed with and delegates decoding to a shared spy.
   */
  class MockReader {
    /**
     * Record the decode hints the component built from the requested formats.
     *
     * @param hints - The POSSIBLE_FORMATS hint map (or undefined).
     */
    constructor(hints?: Map<number, number[]>) {
      zxingMock.ctorSpy(hints)
    }
    /**
     * Delegate decoding to the shared spy.
     *
     * @returns The mocked decode result.
     */
    async decodeFromVideoElement(): Promise<{ getText(): string }> {
      return zxingMock.decodeSpy()
    }
    /**
     * No-op teardown for the mock reader.
     */
    reset(): void {
      // no-op teardown for the mock reader
    }
  }
  return {
    BrowserMultiFormatReader: MockReader,
    BarcodeFormat: {
      AZTEC: 0,
      CODABAR: 1,
      CODE_39: 2,
      CODE_93: 3,
      CODE_128: 4,
      DATA_MATRIX: 5,
      EAN_8: 6,
      EAN_13: 7,
      ITF: 8,
      PDF_417: 10,
      QR_CODE: 11,
      UPC_A: 14,
      UPC_E: 15,
    },
    DecodeHintType: { POSSIBLE_FORMATS: 2 },
  }
})

const { default: BarcodeScanner } = await import('../BarcodeScanner.svelte')
const { buildZxingHints, DEFAULT_FORMATS } = await import('../zxing.js')

import type {
  BarcodeFormat,
  BarcodeScannerError,
  BarcodeScannerProps,
  BarcodeScanResult,
  ZxingReader,
} from '../types.js'

/**
 * Permissive ClassMap stub — `cn(...)` joins truthy strings; every other
 * accessed member returns its own key as a string token.
 *
 * @returns A stub ClassMap-like object suitable for tests.
 */
function buildStubClassMap(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes
            .flat()
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      const token = String(prop)
      return (..._args: unknown[]): string => token
    },
  }
  return new Proxy({}, handler)
}

/**
 * Interpolate `{{name}}` values into the inline English default, the way the
 * real provider does.
 *
 * @param template - The default value template.
 * @param values - The interpolation values.
 * @returns The interpolated text.
 */
function interpolate(template: string, values?: Record<string, unknown>): string {
  let text = template
  if (values) {
    for (const [k, v] of Object.entries(values)) text = text.replaceAll(`{{${k}}}`, String(v))
  }
  return text
}

/**
 * Poll an assertion until it holds (the framework's `waitFor`).
 *
 * The first attempt flushes pending microtasks, mirroring
 * `@testing-library`'s `asyncWrapper`: the component's acquisition chain
 * (`getUserMedia` → `play` → the first `detect`) resolves entirely in
 * microtasks, so the immediate first emission is observable before any timer
 * tick. Without it the first attempt can land before that emission and the
 * next poll can land past the `dedupeMs` window, which is the same assertion
 * the React original makes through `@testing-library/react`.
 *
 * @param assert - The assertion to retry.
 * @param timeoutMs - How long to wait.
 * @returns The assertion's value.
 */
async function waitFor<T>(assert: () => T, timeoutMs = 1000): Promise<T> {
  for (let tick = 0; tick < 100; tick += 1) await Promise.resolve()
  let last: unknown
  const start = Date.now()
  for (;;) {
    try {
      return assert()
    } catch (error) {
      last = error
    }
    if (Date.now() - start >= timeoutMs) throw last
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

/** The live instances of the current test, torn down after it. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mount a `BarcodeScanner` with these props.
 *
 * @param props - The component props.
 * @returns The mount target and an unmount handle.
 */
function render(props: BarcodeScannerProps): {
  host: HTMLElement
  unmount: () => void
} {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(BarcodeScanner, { target, props })
  flushSync()
  mounted.push(instance)
  return { host: target, unmount: () => void mounted.splice(0).map((m) => unmount(m)) }
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
  // Complete platform-API literals: the production cleanup path only calls
  // `stop()` and reads `kind`, but the stubs are typed as the real track and
  // stream, so no assertion stands in for a missing member.
  const track: MediaStreamTrack = {
    kind: 'video',
    id: 'barcode-scanner-track',
    label: '',
    enabled: true,
    muted: false,
    contentHint: '',
    readyState: 'live',
    onended: null,
    onmute: null,
    onunmute: null,
    stop,
    applyConstraints: () => Promise.resolve(),
    clone: function (): MediaStreamTrack {
      return this
    },
    getCapabilities: () => ({}),
    getConstraints: () => ({}),
    getSettings: () => ({}),
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }
  const tracks = [track]
  const stream: MediaStream = {
    id: 'barcode-scanner-stream',
    active: true,
    onaddtrack: null,
    onremovetrack: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    clone: function (): MediaStream {
      return this
    },
    addTrack: () => {},
    removeTrack: () => {},
    getTrackById: () => null,
    getAudioTracks: () => [],
    getVideoTracks: () => tracks,
    getTracks: () => tracks,
  }
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
  mockState.markerMode = false
  zxingMock.ctorSpy.mockReset()
  zxingMock.decodeSpy.mockReset()
  zxingMock.decodeSpy.mockResolvedValue({ getText: () => 'MOCKED' })
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

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  // Drop the fake mediaDevices definition so the next test installs cleanly.
  // jsdom doesn't define it by default, so deleting is fine.
  Reflect.deleteProperty(navigator, 'mediaDevices')
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('DEFAULT_FORMATS', () => {
  it('covers the four most common retail / logistics codes', () => {
    expect(DEFAULT_FORMATS).toEqual(['ean_13', 'upc_a', 'code_128', 'qr_code'])
  })
})

describe('buildZxingHints', () => {
  // Mirror of the real @zxing/library enums.
  const BF: Record<string, number> = {
    AZTEC: 0,
    CODABAR: 1,
    CODE_39: 2,
    CODE_93: 3,
    CODE_128: 4,
    DATA_MATRIX: 5,
    EAN_8: 6,
    EAN_13: 7,
    ITF: 8,
    PDF_417: 10,
    QR_CODE: 11,
    UPC_A: 14,
    UPC_E: 15,
  }
  const DHT: Record<string, number> = { POSSIBLE_FORMATS: 2 }

  it('maps requested W3C formats onto the POSSIBLE_FORMATS hint', () => {
    const hints = buildZxingHints(['upc_a', 'ean_13'], BF, DHT)
    expect(hints).not.toBeNull()
    // Keyed by DecodeHintType.POSSIBLE_FORMATS (2), value = zxing enums.
    expect(hints?.get(DHT.POSSIBLE_FORMATS)).toEqual([BF.UPC_A, BF.EAN_13])
  })

  it('maps the full W3C format set correctly (e.g. pdf417 → PDF_417)', () => {
    const hints = buildZxingHints(['pdf417', 'qr_code', 'code_128'], BF, DHT)
    expect(hints?.get(2)).toEqual([BF.PDF_417, BF.QR_CODE, BF.CODE_128])
  })

  it('returns null when no requested format maps (reader left unconstrained)', () => {
    expect(buildZxingHints([], BF, DHT)).toBeNull()
  })
})

describe('<BarcodeScanner> — render', () => {
  it('renders a region with the localized aria-label', async () => {
    installGetUserMedia(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))

    const { host } = render({ onScan: vi.fn(), barcodeDetector: null, loadZxing: null })
    const root = host.querySelector('[data-mol-id="barcode-scanner"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('aria-label')).toBeTruthy()
    expect(root?.getAttribute('role')).toBe('region')
    expect(host.querySelector('[data-mol-id="barcode-scanner-video"]')).not.toBeNull()
  })
})

describe('<BarcodeScanner> — getUserMedia', () => {
  it('calls getUserMedia with facingMode environment', async () => {
    const { stream } = createFakeStream()
    const fn = installGetUserMedia(() => Promise.resolve(stream))

    /**
     * Fake BarcodeDetector that always returns no barcodes, keeping the scan loop quiet.
     */
    class QuietDetector {
      /**
       * Fake detect that always returns no barcodes.
       */
      async detect(): Promise<[]> {
        return []
      }
    }

    render({ onScan: vi.fn(), barcodeDetector: QuietDetector })
    await waitFor(() => expect(fn).toHaveBeenCalled())
    const constraints = fn.mock.calls[0][0] as MediaStreamConstraints
    const videoConstraints = constraints.video as MediaTrackConstraints
    expect(videoConstraints.facingMode).toBe('environment')
    expect(constraints.audio).toBe(false)
  })

  it('dispatches permission_denied on NotAllowedError', async () => {
    installGetUserMedia(() => Promise.reject(new DOMException('nope', 'NotAllowedError')))

    const onError = vi.fn<(error: BarcodeScannerError) => void>()
    const { host } = render({ onScan: vi.fn(), onError, barcodeDetector: null, loadZxing: null })
    await waitFor(() => expect(onError).toHaveBeenCalled())
    const err = onError.mock.calls[0][0]
    expect(err.code).toBe('permission_denied')
    expect(err.message).toBeTruthy()
    const root = host.querySelector('[data-mol-id="barcode-scanner"]')
    expect(root?.getAttribute('data-status')).toBe('error')
  })

  it('dispatches no_camera on NotFoundError', async () => {
    installGetUserMedia(() => Promise.reject(new DOMException('none', 'NotFoundError')))

    const onError = vi.fn<(error: BarcodeScannerError) => void>()
    render({ onScan: vi.fn(), onError, barcodeDetector: null, loadZxing: null })
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('no_camera')
  })

  it('dispatches unsupported when navigator.mediaDevices is missing', async () => {
    // Don't install — leave navigator.mediaDevices undefined.
    const onError = vi.fn<(error: BarcodeScannerError) => void>()
    render({ onScan: vi.fn(), onError, barcodeDetector: null, loadZxing: null })
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('unsupported')
  })
})

describe('<BarcodeScanner> — native BarcodeDetector path', () => {
  it('passes formats into the BarcodeDetector constructor and emits onScan', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const detectMock = vi
      .fn<() => Promise<Array<{ rawValue: string; format: string }>>>()
      .mockResolvedValueOnce([{ rawValue: '012345678905', format: 'upc_a' }])
      .mockResolvedValue([])

    const ctorSpy = vi.fn()
    /**
     * Fake BarcodeDetector that records constructor args and delegates detect to a mock.
     */
    class FakeDetector {
      /**
       * The detect mock of this detector.
       */
      detect = detectMock
      /**
       * Record the constructor args.
       *
       * @param init - The requested formats.
       */
      constructor(init?: { formats?: string[] }) {
        ctorSpy(init)
      }
    }

    const onScan = vi.fn<(result: BarcodeScanResult) => void>()
    render({ onScan, formats: ['upc_a', 'ean_13'], barcodeDetector: FakeDetector })

    await waitFor(() => expect(onScan).toHaveBeenCalled())
    expect(ctorSpy).toHaveBeenCalledWith({ formats: ['upc_a', 'ean_13'] })
    expect(onScan).toHaveBeenCalledWith({ format: 'upc_a', value: '012345678905' })
  })

  it('stops scanning after the first match when continuous=false', async () => {
    const { stream, stop } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const detectMock = vi
      .fn<() => Promise<Array<{ rawValue: string; format: string }>>>()
      .mockResolvedValueOnce([{ rawValue: '4006381333931', format: 'ean_13' }])
      .mockResolvedValue([])

    /**
     * Fake BarcodeDetector that delegates detect to a mock.
     */
    class FakeDetector {
      /**
       * The detect mock of this detector.
       */
      detect = detectMock
    }

    const onScan = vi.fn<(result: BarcodeScanResult) => void>()
    const { host } = render({
      onScan,
      continuous: false,
      scanIntervalMs: 5,
      barcodeDetector: FakeDetector,
    })
    await waitFor(() => expect(onScan).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        host.querySelector('[data-mol-id="barcode-scanner"]')?.getAttribute('data-status'),
      ).toBe('stopped'),
    )
    expect(stop).toHaveBeenCalled()
  })

  it('keeps scanning after a match when continuous=true and dedupes consecutive identical reads', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const detectMock = vi
      .fn<() => Promise<Array<{ rawValue: string; format: string }>>>()
      .mockResolvedValueOnce([{ rawValue: 'X', format: 'qr_code' }])
      .mockResolvedValueOnce([{ rawValue: 'X', format: 'qr_code' }])
      .mockResolvedValueOnce([{ rawValue: 'Y', format: 'qr_code' }])
      .mockResolvedValue([])

    /**
     * Fake BarcodeDetector that delegates detect to a mock.
     */
    class FakeDetector {
      /**
       * The detect mock of this detector.
       */
      detect = detectMock
    }

    const onScan = vi.fn<(result: BarcodeScanResult) => void>()
    render({
      onScan,
      continuous: true,
      scanIntervalMs: 1,
      barcodeDetector: FakeDetector,
    })
    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(2))
    expect(onScan.mock.calls[0][0].value).toBe('X')
    expect(onScan.mock.calls[1][0].value).toBe('Y')
  })

  it('dispatches detector_failure when detect() throws', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    /**
     * Fake BarcodeDetector whose detect always throws to simulate a detector failure.
     */
    class FakeDetector {
      /**
       * Always throws to trigger the detector_failure error code.
       */
      async detect(): Promise<never> {
        throw new Error('boom')
      }
    }

    const onError = vi.fn<(error: BarcodeScannerError) => void>()
    render({ onScan: vi.fn(), onError, barcodeDetector: FakeDetector })
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('detector_failure')
  })
})

describe('<BarcodeScanner> — fallback path', () => {
  it('uses the @zxing/library loader when BarcodeDetector is absent', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const decode = vi
      .fn<() => Promise<{ text: string }>>()
      .mockResolvedValueOnce({ text: 'ABC-123' })
      .mockRejectedValue(new Error('NotFoundException'))
    const reset = vi.fn()
    const reader: ZxingReader = {
      decodeOnceFromVideoElement: decode,
      reset,
    }
    const loadZxing = vi.fn<(formats: BarcodeFormat[]) => Promise<ZxingReader>>(() =>
      Promise.resolve(reader),
    )

    const onScan = vi.fn<(result: BarcodeScanResult) => void>()
    render({ onScan, scanIntervalMs: 1, barcodeDetector: null, loadZxing })
    await waitFor(() => expect(onScan).toHaveBeenCalled())
    expect(onScan).toHaveBeenCalledWith({ format: 'unknown', value: 'ABC-123' })
  })

  it('dispatches fallback_unavailable when the loader is forced off', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const onError = vi.fn<(error: BarcodeScannerError) => void>()
    render({ onScan: vi.fn(), onError, barcodeDetector: null, loadZxing: null })
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('fallback_unavailable')
  })

  it('passes the requested formats to zxing as POSSIBLE_FORMATS hints', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))
    // barcodeDetector={null} forces the fallback path; `loadZxing` stays
    // omitted so the REAL loader runs — against the mocked @zxing/library.
    const onScan = vi.fn<(result: BarcodeScanResult) => void>()
    render({ onScan, formats: ['upc_a', 'ean_13'], scanIntervalMs: 1, barcodeDetector: null })

    await waitFor(() => expect(zxingMock.ctorSpy).toHaveBeenCalled())
    const hints = zxingMock.ctorSpy.mock.calls[0][0]
    expect(hints).toBeInstanceOf(Map)
    // DecodeHintType.POSSIBLE_FORMATS = 2 → [BarcodeFormat.UPC_A(14), EAN_13(7)]
    expect(hints?.get(2)).toEqual([14, 7])
    await waitFor(() => expect(onScan).toHaveBeenCalledWith({ format: 'unknown', value: 'MOCKED' }))
  })
})

describe('<BarcodeScanner> — time-bounded dedupe', () => {
  it('re-emits the SAME code after the dedupe window elapses (continuous)', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    // Detector always finds the same code, frame after frame.
    const detectMock = vi
      .fn<() => Promise<Array<{ rawValue: string; format: string }>>>()
      .mockResolvedValue([{ rawValue: 'SAME', format: 'qr_code' }])

    /**
     * Fake BarcodeDetector that always returns the same code.
     */
    class FakeDetector {
      /**
       * The detect mock of this detector.
       */
      detect = detectMock
    }

    const onScan = vi.fn<(result: BarcodeScanResult) => void>()
    render({
      onScan,
      continuous: true,
      scanIntervalMs: 1,
      dedupeMs: 20,
      barcodeDetector: FakeDetector,
    })

    // First emission is immediate; a second emission of the SAME value can
    // only happen because the dedupe window elapsed and reset suppression.
    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onScan.mock.calls.length).toBeGreaterThanOrEqual(2), 2000)
    expect(onScan.mock.calls[0][0].value).toBe('SAME')
    expect(onScan.mock.calls[1][0].value).toBe('SAME')
  })

  it('suppresses the SAME code within the dedupe window and emits a DIFFERENT code immediately', async () => {
    const { stream } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))

    const detectMock = vi
      .fn<() => Promise<Array<{ rawValue: string; format: string }>>>()
      .mockResolvedValueOnce([{ rawValue: 'A', format: 'qr_code' }])
      .mockResolvedValueOnce([{ rawValue: 'A', format: 'qr_code' }]) // suppressed (within window)
      .mockResolvedValueOnce([{ rawValue: 'B', format: 'qr_code' }]) // different → immediate
      .mockResolvedValue([])

    /**
     * Fake BarcodeDetector driven by the queued mock.
     */
    class FakeDetector {
      /**
       * The detect mock of this detector.
       */
      detect = detectMock
    }

    const onScan = vi.fn<(result: BarcodeScanResult) => void>()
    render({
      onScan,
      continuous: true,
      scanIntervalMs: 1,
      dedupeMs: 100000,
      barcodeDetector: FakeDetector,
    })

    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(2))
    expect(onScan.mock.calls.map((c) => c[0].value)).toEqual(['A', 'B'])
  })
})

describe('<BarcodeScanner> — cleanup', () => {
  it('stops camera tracks on unmount', async () => {
    const { stream, stop } = createFakeStream()
    installGetUserMedia(() => Promise.resolve(stream))
    /**
     * Fake BarcodeDetector that always returns no barcodes, keeping the scan loop quiet.
     */
    class FakeDetector {
      /**
       * Returns an empty result set so the scan loop runs without emitting scans.
       */
      async detect(): Promise<[]> {
        return []
      }
    }

    const { host, unmount: teardown } = render({
      onScan: vi.fn(),
      scanIntervalMs: 1,
      barcodeDetector: FakeDetector,
    })
    await waitFor(() =>
      expect(host.querySelector('[data-mol-id="barcode-scanner-video"]')).not.toBeNull(),
    )
    // Wait one tick so the async start() has attached the stream.
    await new Promise((resolve) => setTimeout(resolve, 0))
    teardown()
    // Cleanup runs synchronously inside the teardown; the mock-stream
    // track.stop must have been called at least once.
    expect(stop).toHaveBeenCalled()
  })
})

describe('<BarcodeScanner> — literal t() error keys', () => {
  /**
   * One case per `BarcodeScannerErrorCode`: how to force that failure
   * with jsdom, the LITERAL key the status overlay must ask `t` for,
   * and any injected-detector props the path needs. The markers are
   * written out literally so a runtime-built key cannot sneak past.
   */
  const cases: Array<{
    code: string
    marker: string
    setup: () => void
    props?: Partial<BarcodeScannerProps>
  }> = [
    {
      code: 'permission_denied',
      marker: '[barcodeScanner.error.permission_denied]',
      setup: () => {
        installGetUserMedia(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
      },
    },
    {
      code: 'no_camera',
      marker: '[barcodeScanner.error.no_camera]',
      setup: () => {
        installGetUserMedia(() => Promise.reject(new DOMException('none', 'NotFoundError')))
      },
    },
    {
      code: 'unsupported',
      marker: '[barcodeScanner.error.unsupported]',
      setup: () => {
        // Leave navigator.mediaDevices undefined (afterEach deletes it).
      },
    },
    {
      code: 'detector_failure',
      marker: '[barcodeScanner.error.detector_failure]',
      setup: () => {
        installGetUserMedia(() => Promise.resolve(createFakeStream().stream))
        // Autoplay-policy rejection is reported as detector_failure.
        Object.defineProperty(HTMLMediaElement.prototype, 'play', {
          configurable: true,
          value: vi.fn().mockRejectedValue(new Error('autoplay blocked')),
        })
      },
    },
    {
      code: 'fallback_unavailable',
      marker: '[barcodeScanner.error.fallback_unavailable]',
      setup: () => {
        installGetUserMedia(() => Promise.resolve(createFakeStream().stream))
      },
      props: { barcodeDetector: null, loadZxing: null },
    },
  ]

  for (const c of cases) {
    it(`asks t for the literal ${c.code} key`, async () => {
      mockState.markerMode = true
      c.setup()
      const { host } = render({ onScan: vi.fn(), ...c.props })
      // React's mount commits the 'starting' and the dispatched error in one
      // batch; Svelte commits them as they happen, so the wait runs to the
      // terminal overlay text (the same assertion, observed when stable).
      const status = await waitFor(() => {
        const el = host.querySelector<HTMLElement>('[data-mol-id="barcode-scanner-status"]')
        if (el === null) throw new Error('the status overlay has not rendered yet')
        expect(el.textContent).toBe(c.marker)
        return el
      })
      // The overlay text is exactly what the marker provider's `t`
      // returned for the LITERAL key — a locale bond can therefore
      // translate every error state.
      expect(status.textContent).toBe(c.marker)
    })
  }

  it('asks t for the literal aria + starting-status keys', async () => {
    mockState.markerMode = true
    // A getUserMedia that never resolves pins the scanner in `starting`
    // state — the deterministic way to observe that status's marker.
    installGetUserMedia(() => new Promise<MediaStream>(() => {}))
    const { host } = render({ onScan: vi.fn(), barcodeDetector: null, loadZxing: null })
    const root = host.querySelector('[data-mol-id="barcode-scanner"]')
    expect(root?.getAttribute('aria-label')).toBe('[barcodeScanner.aria.region]')
    await waitFor(() =>
      expect(host.querySelector('[data-mol-id="barcode-scanner-status"]')?.textContent).toBe(
        '[barcodeScanner.status.starting]',
      ),
    )
    // No English fallback text may leak past the marker provider.
    expect(host.textContent).not.toContain('Starting camera')
  })

  it('asks t for the literal scanning-status key', async () => {
    mockState.markerMode = true
    installGetUserMedia(() => Promise.resolve(createFakeStream().stream))
    // A reader that never resolves pins the scanner in `scanning` state.
    // The loader is hoisted to a stable identity: an inline arrow would
    // change every render and restart the scan effect.
    const reader: ZxingReader = {
      decodeOnceFromVideoElement: () => new Promise<{ text: string }>(() => {}),
      reset: () => {},
    }
    const loadZxing = (): Promise<ZxingReader> => Promise.resolve(reader)
    const { host } = render({ onScan: vi.fn(), barcodeDetector: null, loadZxing })
    await waitFor(() =>
      expect(host.querySelector('[data-mol-id="barcode-scanner-status"]')?.textContent).toBe(
        '[barcodeScanner.status.scanning]',
      ),
    )
    expect(host.textContent).not.toContain('Scanning')
  })

  it('asks t for the literal stopped-status key', async () => {
    mockState.markerMode = true
    installGetUserMedia(() => Promise.resolve(createFakeStream().stream))
    // One hit, then misses: continuous=false stops the loop on the hit.
    const decode = vi
      .fn<() => Promise<{ text: string }>>()
      .mockResolvedValueOnce({ text: 'ABC-123' })
      .mockRejectedValue(new Error('NotFoundException'))
    const reader: ZxingReader = {
      decodeOnceFromVideoElement: decode,
      reset: () => {},
    }
    const loadZxing = (): Promise<ZxingReader> => Promise.resolve(reader)
    const { host } = render({ onScan: vi.fn(), barcodeDetector: null, loadZxing })
    await waitFor(() =>
      expect(host.querySelector('[data-mol-id="barcode-scanner-status"]')?.textContent).toBe(
        '[barcodeScanner.status.stopped]',
      ),
    )
    expect(host.textContent).not.toContain('Scan complete')
  })
})
