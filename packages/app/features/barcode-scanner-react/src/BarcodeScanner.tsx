import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Supported barcode/symbology formats. Mirrors the W3C Shape Detection
 * `BarcodeFormat` enum so values can be passed straight through to the
 * native `BarcodeDetector` constructor when present, and mapped to
 * equivalents in the `@zxing/library` fallback.
 */
export type BarcodeFormat =
  | 'aztec'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'data_matrix'
  | 'ean_8'
  | 'ean_13'
  | 'itf'
  | 'pdf417'
  | 'qr_code'
  | 'upc_a'
  | 'upc_e'

/**
 * Result emitted from a successful scan.
 */
export interface BarcodeScanResult {
  /** Format of the detected symbology (e.g. `'ean_13'`). */
  format: BarcodeFormat | string
  /** Raw decoded value as produced by the underlying detector. */
  value: string
}

/**
 * Reasons the scanner can fail at runtime — surfaced via `onError` and
 * via i18n-keyed status messages on the rendered overlay.
 */
export type BarcodeScannerErrorCode =
  /** `getUserMedia()` rejected with `NotAllowedError` or `SecurityError`. */
  | 'permission_denied'
  /** `getUserMedia()` rejected with `NotFoundError` (no camera attached). */
  | 'no_camera'
  /** Browser does not expose `navigator.mediaDevices.getUserMedia`. */
  | 'unsupported'
  /** A detector instance threw while decoding a frame. */
  | 'detector_failure'
  /** The fallback `@zxing/library` import failed (offline / blocked). */
  | 'fallback_unavailable'

/** Error shape passed to `onError`. */
export interface BarcodeScannerError {
  /** Stable machine-readable error code. */
  code: BarcodeScannerErrorCode
  /** Localized human-readable message. */
  message: string
  /** Original underlying error, if any. */
  cause?: unknown
}

/** Props for `<BarcodeScanner>`. */
export interface BarcodeScannerProps {
  /**
   * Symbologies the scanner should accept. Defaults to the four most
   * common retail / logistics codes:
   * `['ean_13', 'upc_a', 'code_128', 'qr_code']`.
   */
  formats?: BarcodeFormat[]
  /** Fired with the decoded result on every successful scan. */
  onScan: (result: BarcodeScanResult) => void
  /** Fired when camera acquisition or detection fails. */
  onError?: (error: BarcodeScannerError) => void
  /**
   * When `true`, keeps scanning after each detection (deduped on the
   * decoded value). When `false` (default), stops the camera and the
   * detection loop on the first successful scan.
   */
  continuous?: boolean
  /**
   * Polling interval, in milliseconds, between detector frames.
   * Defaults to `200`. Lower values increase responsiveness at higher
   * CPU cost.
   */
  scanIntervalMs?: number
  /** Pixel width hint passed as the camera constraint. Defaults to 640. */
  width?: number
  /** Pixel height hint passed as the camera constraint. Defaults to 480. */
  height?: number
  /** Extra classes merged onto the root element. */
  className?: string
}

/** Default formats accepted when the caller doesn't pass `formats`. */
export const DEFAULT_FORMATS: BarcodeFormat[] = ['ean_13', 'upc_a', 'code_128', 'qr_code']

/** Subset of the W3C `BarcodeDetector` interface we actually use. */
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>
}

/** Constructor signature for the W3C `BarcodeDetector`. */
interface BarcodeDetectorConstructor {
  new (init?: { formats?: string[] }): BarcodeDetectorLike
}

/**
 * Module-level injection points. Tests overwrite these via the exported
 * setters; production code picks the real browser globals + the real
 * `@zxing/library` import.
 *
 * Keeping them as `let` variables (instead of reading `window` inside
 * the component) makes the component deterministically testable in
 * jsdom without monkey-patching globals from outside.
 */
let detectorCtorOverride: BarcodeDetectorConstructor | null | undefined = undefined
let zxingLoaderOverride: ZxingLoader | null | undefined = undefined

/**
 * Loader function returning a `@zxing/library`-compatible reader.
 * Indirection lets us pin to a small subset of the surface area we
 * actually depend on and lets tests stub the fallback path.
 */
export type ZxingLoader = () => Promise<ZxingReader>

/** Minimal subset of `BrowserMultiFormatReader` we depend on. */
export interface ZxingReader {
  /**
   * Decode a single frame from a `<video>` element. Returns
   * `{ text, format }` when a barcode is detected, otherwise `null` or
   * throws a `NotFoundException` (caller treats both as "no match").
   */
  decodeOnceFromVideoElement(video: HTMLVideoElement): Promise<{ text: string; format?: string }>
  /** Stop any internal scanning loop and release decoders. */
  reset(): void
}

/**
 * Override the `BarcodeDetector` constructor used by the next mounted
 * scanner. Pass `null` to force the fallback path even when the
 * native API is present. Pass `undefined` to revert to the browser
 * default.
 *
 * @param ctor - Constructor stub or `null`/`undefined`.
 */
export function __setBarcodeDetectorOverride(
  ctor: BarcodeDetectorConstructor | null | undefined,
): void {
  detectorCtorOverride = ctor
}

/**
 * Override the `@zxing/library` loader used by the next mounted
 * scanner. Pass `null` to force the loader to fail (simulating an
 * offline bundle). Pass `undefined` to revert to the real dynamic
 * import.
 *
 * @param loader - Loader stub or `null`/`undefined`.
 */
export function __setZxingLoaderOverride(loader: ZxingLoader | null | undefined): void {
  zxingLoaderOverride = loader
}

/**
 * Resolve the active `BarcodeDetector` constructor: the test override
 * takes precedence over `window.BarcodeDetector`. Returns `null` if no
 * native detector is available.
 *
 * @returns The detector constructor or `null`.
 */
function resolveDetectorCtor(): BarcodeDetectorConstructor | null {
  if (detectorCtorOverride === null) return null
  if (detectorCtorOverride !== undefined) return detectorCtorOverride
  if (typeof globalThis !== 'undefined') {
    const w = globalThis as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
    if (w.BarcodeDetector !== undefined) return w.BarcodeDetector
  }
  return null
}

/**
 * Resolve the active fallback loader. Tests inject a stub via
 * `__setZxingLoaderOverride`; production callers get a real dynamic
 * import of `@zxing/library`'s `BrowserMultiFormatReader`.
 *
 * @returns A loader function or `null` when forced unavailable.
 */
function resolveZxingLoader(): ZxingLoader | null {
  if (zxingLoaderOverride === null) return null
  if (zxingLoaderOverride !== undefined) return zxingLoaderOverride
  return async () => {
    const mod = (await import('@zxing/library')) as unknown as {
      BrowserMultiFormatReader: new () => {
        decodeFromVideoElement(video: HTMLVideoElement | string): Promise<{
          getText(): string
        }>
        reset(): void
      }
    }
    const reader = new mod.BrowserMultiFormatReader()
    return {
      async decodeOnceFromVideoElement(video: HTMLVideoElement) {
        const r = await reader.decodeFromVideoElement(video)
        return { text: r.getText() }
      },
      reset() {
        reader.reset()
      },
    }
  }
}

/**
 * Map a `getUserMedia` rejection into a stable `BarcodeScannerError`
 * code so callers can branch on a small finite set of strings.
 *
 * @param error - The original rejection.
 * @returns The mapped error code.
 */
function mapMediaErrorCode(error: unknown): BarcodeScannerErrorCode {
  // `DOMException` in some environments (older jsdom, certain
  // browser sandboxes) does not extend `Error`, so duck-type the
  // `name` field directly.
  const name =
    error !== null && typeof error === 'object' && 'name' in error
      ? String((error as { name: unknown }).name)
      : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission_denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no_camera'
  return 'detector_failure'
}

/**
 * Browser-side barcode scanner. Acquires a rear-facing camera via
 * `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`,
 * then drives a detection loop using the native `BarcodeDetector` API
 * when available and falling back to `@zxing/library` otherwise.
 *
 * The component is purely presentational on top of the camera stream
 * — it renders a `<video>` plus a small status overlay routed through
 * the companion locale bond and `getClassMap()`. Detected results are
 * delivered to the caller through `onScan`; failures through
 * `onError`. The camera stream and detection loop are torn down on
 * unmount and on every prop change that affects acquisition.
 *
 * @param props - Component props.
 * @returns The scanner element.
 */
export function BarcodeScanner(props: BarcodeScannerProps) {
  const {
    formats = DEFAULT_FORMATS,
    onScan,
    onError,
    continuous = false,
    scanIntervalMs = 200,
    width = 640,
    height = 480,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()

  // Stable string key for the formats array — used as a dep so the
  // effect only restarts when contents change, not on every render.
  const formatsKey = formats.join('|')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cancelledRef = useRef<boolean>(false)
  const lastValueRef = useRef<string | null>(null)

  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'stopped' | 'error'>(
    'idle',
  )
  const [errorCode, setErrorCode] = useState<BarcodeScannerErrorCode | null>(null)

  // Stable callback refs keep the effect's identity from churning on
  // every parent render — re-acquiring the camera on each render would
  // strobe the device permission UI in some browsers.
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    cancelledRef.current = false
    let pollHandle: ReturnType<typeof setTimeout> | null = null
    let zxingReader: ZxingReader | null = null

    const formatList = formatsKey === '' ? [] : (formatsKey.split('|') as BarcodeFormat[])

    /**
     * Localize a `BarcodeScannerErrorCode` and dispatch it through
     * `onError` exactly once per failure.
     *
     * @param code - The error code.
     * @param cause - Original underlying error.
     */
    const dispatchError = (code: BarcodeScannerErrorCode, cause?: unknown): void => {
      const message = t(
        `barcodeScanner.error.${code}`,
        {},
        { defaultValue: defaultErrorMessage(code) },
      )
      setStatus('error')
      setErrorCode(code)
      onErrorRef.current?.({ code, message, cause })
    }

    /**
     * Stop the active stream and clear the polling handle. Idempotent
     * — safe to call from cleanup and from the first-scan fast path.
     */
    const stopScanning = (): void => {
      cancelledRef.current = true
      if (pollHandle !== null) {
        clearTimeout(pollHandle)
        pollHandle = null
      }
      if (zxingReader !== null) {
        try {
          zxingReader.reset()
        } catch {
          /* ignore — best-effort teardown */
        }
        zxingReader = null
      }
      const stream = streamRef.current
      if (stream !== null) {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      const video = videoRef.current
      if (video !== null) {
        try {
          video.pause()
        } catch {
          /* ignore — element may be detached */
        }
        video.srcObject = null
      }
    }

    /**
     * Deliver a scan, dedupe consecutive identical reads, and stop
     * the loop if `continuous` is `false`.
     *
     * @param result - The decoded result.
     */
    const handleResult = (result: BarcodeScanResult): void => {
      if (lastValueRef.current === result.value) return
      lastValueRef.current = result.value
      onScanRef.current(result)
      if (!continuous) {
        setStatus('stopped')
        stopScanning()
      }
    }

    /**
     * Start the camera, then dispatch to the detector loop or
     * fallback loop based on platform support.
     */
    const start = async (): Promise<void> => {
      setStatus('starting')
      setErrorCode(null)

      if (
        typeof navigator === 'undefined' ||
        navigator.mediaDevices === undefined ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        dispatchError('unsupported')
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: width }, height: { ideal: height } },
          audio: false,
        })
      } catch (cause) {
        dispatchError(mapMediaErrorCode(cause), cause)
        return
      }

      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (video === null) {
        // Effect ran but the element is detached — tear the stream
        // back down and bail without dispatching, since this is a
        // benign mount/unmount race rather than an error condition.
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        return
      }

      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      try {
        await video.play()
      } catch (cause) {
        // Autoplay policies can reject silent video plays; surface as
        // detector_failure so callers can show a tap-to-start hint.
        dispatchError('detector_failure', cause)
        return
      }

      const ctor = resolveDetectorCtor()
      if (ctor !== null) {
        await runNativeDetectorLoop(ctor)
      } else {
        await runFallbackLoop()
      }
    }

    /**
     * Native-detector poll loop. Re-uses one detector instance across
     * frames; bails on cancellation.
     *
     * @param ctor - The active detector constructor.
     */
    const runNativeDetectorLoop = async (ctor: BarcodeDetectorConstructor): Promise<void> => {
      let detector: BarcodeDetectorLike
      try {
        detector = new ctor({ formats: formatList })
      } catch (cause) {
        dispatchError('detector_failure', cause)
        return
      }

      setStatus('scanning')
      const tick = async (): Promise<void> => {
        if (cancelledRef.current) return
        const video = videoRef.current
        if (video === null) return
        try {
          const matches = await detector.detect(video)
          if (cancelledRef.current) return
          if (matches.length > 0) {
            const first = matches[0]
            handleResult({ format: first.format, value: first.rawValue })
            if (!continuous) return
          }
        } catch (cause) {
          dispatchError('detector_failure', cause)
          return
        }
        if (!cancelledRef.current) {
          pollHandle = setTimeout(() => {
            void tick()
          }, scanIntervalMs)
        }
      }
      await tick()
    }

    /**
     * Fallback poll loop driven by `@zxing/library`'s
     * `BrowserMultiFormatReader#decodeOnceFromVideoElement`. The
     * reader resolves on a hit and rejects with a `NotFoundException`
     * on misses — both are normal and drive the next tick.
     */
    const runFallbackLoop = async (): Promise<void> => {
      const loader = resolveZxingLoader()
      if (loader === null) {
        dispatchError('fallback_unavailable')
        return
      }
      try {
        zxingReader = await loader()
      } catch (cause) {
        dispatchError('fallback_unavailable', cause)
        return
      }

      setStatus('scanning')
      const tick = async (): Promise<void> => {
        if (cancelledRef.current) return
        const video = videoRef.current
        if (video === null || zxingReader === null) return
        try {
          const result = await zxingReader.decodeOnceFromVideoElement(video)
          if (cancelledRef.current) return
          if (result !== null && result.text !== '') {
            handleResult({ format: result.format ?? 'unknown', value: result.text })
            if (!continuous) return
          }
        } catch {
          // NotFoundException and friends are normal misses; ignore
          // them and keep polling.
        }
        if (!cancelledRef.current) {
          pollHandle = setTimeout(() => {
            void tick()
          }, scanIntervalMs)
        }
      }
      await tick()
    }

    void start()

    return () => {
      stopScanning()
    }
    // The format list is intentionally collapsed to a stable string so
    // the effect restarts only when its length or contents change.
  }, [continuous, scanIntervalMs, width, height, formatsKey, t])

  /**
   * Resolve the English fallback message for an error code. Centralized
   * so both inline `defaultValue`s and snapshot tests see the same
   * canonical strings.
   *
   * @param code - The error code.
   * @returns The fallback English message.
   */
  function defaultErrorMessage(code: BarcodeScannerErrorCode): string {
    switch (code) {
      case 'permission_denied':
        return 'Camera permission denied'
      case 'no_camera':
        return 'No camera found'
      case 'unsupported':
        return 'Camera not supported in this browser'
      case 'detector_failure':
        return 'Barcode detector failed'
      case 'fallback_unavailable':
        return 'Barcode scanner library could not be loaded'
      default:
        return 'Barcode scanner error'
    }
  }

  const rootStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: width,
    aspectRatio: `${width} / ${height}`,
    overflow: 'hidden',
    background: 'currentColor',
  }
  const videoStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  }
  const statusOverlayStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    textAlign: 'center',
    pointerEvents: 'none',
  }

  const statusLabel: string = (() => {
    if (status === 'starting')
      return t('barcodeScanner.status.starting', {}, { defaultValue: 'Starting camera…' })
    if (status === 'scanning')
      return t('barcodeScanner.status.scanning', {}, { defaultValue: 'Scanning…' })
    if (status === 'stopped')
      return t('barcodeScanner.status.stopped', {}, { defaultValue: 'Scan complete' })
    if (status === 'error' && errorCode !== null)
      return t(
        `barcodeScanner.error.${errorCode}`,
        {},
        { defaultValue: defaultErrorMessage(errorCode) },
      )
    return ''
  })()

  const ariaLabel = t(
    'barcodeScanner.aria.region',
    {},
    { defaultValue: 'Barcode scanner camera view' },
  )

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      data-mol-id="barcode-scanner"
      data-status={status}
      className={cm.cn(className)}
      style={rootStyle}
    >
      <video
        ref={videoRef}
        data-mol-id="barcode-scanner-video"
        style={videoStyle}
        muted
        playsInline
      />
      {statusLabel !== '' && (
        <div
          role="status"
          aria-live="polite"
          data-mol-id="barcode-scanner-status"
          style={statusOverlayStyle}
        >
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{statusLabel}</span>
        </div>
      )}
    </div>
  )
}
