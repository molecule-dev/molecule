/**
 * Types for the Solid barcode scanner — the same shapes
 * `@molecule/app-feature-barcode-scanner-react` exports.
 *
 * @module
 */

/**
 * Supported barcode/symbology formats. Mirrors the W3C Shape Detection
 * `BarcodeFormat` enum so values can be passed straight through to the
 * native `BarcodeDetector` constructor when present. The
 * `@zxing/library` fallback maps this list onto zxing's
 * `DecodeHintType.POSSIBLE_FORMATS` hint (see {@link buildZxingHints}),
 * so the fallback reader is constrained to the same symbologies.
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

/** Props for the `BarcodeScanner` component. */
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
   * When `true`, keeps scanning after each detection. Identical
   * consecutive reads are deduped only for a cooldown window
   * (`dedupeMs`) — after that window the SAME code can be scanned and
   * re-emitted again (e.g. adding two of the same item on purpose), and
   * a DIFFERENT code always emits immediately. When `false` (default),
   * stops the camera and the detection loop on the first successful scan.
   */
  continuous?: boolean
  /**
   * Polling interval, in milliseconds, between detector frames.
   * Defaults to `200`. Lower values increase responsiveness at higher
   * CPU cost.
   */
  scanIntervalMs?: number
  /**
   * Dedupe cooldown, in milliseconds. After a value is emitted, the
   * SAME value is suppressed for this long before it may be emitted
   * again (a different value is never suppressed). Prevents one physical
   * scan from firing `onScan` on every frame while still allowing a
   * deliberate re-scan of the same code. Defaults to `1500` (1.5s).
   */
  dedupeMs?: number
  /** Pixel width hint passed as the camera constraint. Defaults to 640. */
  width?: number
  /** Pixel height hint passed as the camera constraint. Defaults to 480. */
  height?: number
  /** Extra classes merged onto the root element. */
  className?: string
  /**
   * The `BarcodeDetector` constructor used for native detection. Omit to
   * read the browser's `globalThis.BarcodeDetector` (the W3C Shape
   * Detection API, Chromium / WebView). Pass `null` to force the
   * `@zxing/library` fallback even when the native API is present. Tests
   * pass a stub here to drive the native path deterministically, instead
   * of monkey-patching globals.
   */
  barcodeDetector?: BarcodeDetectorConstructor | null
  /**
   * Loader for the `@zxing/library` fallback reader used when no native
   * `BarcodeDetector` is available. Omit to use the real dynamic
   * `import('@zxing/library')`. Pass `null` to make the fallback fail
   * immediately (as when the bundle is offline or blocked). Tests pass a
   * stub here to drive the fallback path deterministically.
   */
  loadZxing?: ZxingLoader | null
}

/**
 * Subset of the W3C `BarcodeDetector` interface we actually use.
 * Exported so consumers can type an injected
 * {@link BarcodeScannerProps.barcodeDetector} value.
 */
export interface BarcodeDetectorLike {
  /**
   * Detect barcodes in one frame.
   *
   * @param source - The frame source to scan (the live `<video>`).
   * @returns The detected barcodes with their raw values and formats.
   */
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>
}

/**
 * Constructor signature for the W3C `BarcodeDetector`. Exported so
 * consumers can type the constructor passed to the
 * {@link BarcodeScannerProps.barcodeDetector} prop.
 */
export interface BarcodeDetectorConstructor {
  /**
   * Construct a detector constrained to the requested symbologies.
   *
   * @param init - The requested `formats` list.
   */
  new (init?: { formats?: string[] }): BarcodeDetectorLike
}

/**
 * Loader function returning a `@zxing/library`-compatible reader,
 * constrained to the requested `formats`. Indirection lets us pin to a
 * small subset of the surface area we actually depend on and lets tests
 * stub the fallback path (via the {@link BarcodeScannerProps.loadZxing}
 * prop).
 *
 * @param formats - The symbologies the reader should be constrained to,
 *   mapped onto zxing's `POSSIBLE_FORMATS` hint by the real loader.
 * @returns A promise for the reader.
 */
export type ZxingLoader = (formats: BarcodeFormat[]) => Promise<ZxingReader>

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
