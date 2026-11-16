/**
 * BarcodeScanner component (React parity).
 *
 * @module
 */

import { Component, effect, type ElementRef, signal, ViewChild } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type {
  BarcodeDetectorConstructor,
  BarcodeDetectorLike,
  BarcodeFormat,
  BarcodeScannerErrorCode,
  BarcodeScannerProps,
  BarcodeScanResult,
  ZxingLoader,
  ZxingReader,
} from './types.js'
import { buildZxingHints, DEFAULT_FORMATS } from './zxing.js'

/**
 * Resolve the active `BarcodeDetector` constructor: the injected
 * `barcodeDetector` input takes precedence, then the browser's
 * `globalThis.BarcodeDetector` (the W3C Shape Detection API, present
 * only in Chromium / WebView). Returns `null` when neither is
 * available — the caller runs the `@zxing/library` fallback.
 *
 * @param injected - The `barcodeDetector` input: a constructor, `null`
 *   to force the fallback, or `undefined` for the browser default.
 * @returns The detector constructor or `null`.
 */
function resolveDetectorCtor(
  injected: BarcodeDetectorConstructor | null | undefined,
): BarcodeDetectorConstructor | null {
  if (injected === null) return null
  if (injected !== undefined) return injected
  // The platform API is read through the `'BarcodeDetector' in host`
  // narrowing, and the value itself is duck-typed before the single,
  // guarded cast — never a chained type assertion.
  const host = globalThis
  if (!('BarcodeDetector' in host)) return null
  const ctor: unknown = host.BarcodeDetector
  return typeof ctor === 'function' ? (ctor as BarcodeDetectorConstructor) : null
}

/**
 * Resolve the active fallback loader: the injected `loadZxing` input
 * takes precedence; otherwise callers get a real dynamic import of
 * `@zxing/library`'s `BrowserMultiFormatReader`, constructed with a
 * `POSSIBLE_FORMATS` hint derived from the requested `formats`.
 *
 * @param injected - The `loadZxing` input: a loader, `null` to make the
 *   fallback fail (as offline), or `undefined` for the real dynamic
 *   import.
 * @returns A loader function or `null` when forced unavailable.
 */
function resolveZxingLoader(injected: ZxingLoader | null | undefined): ZxingLoader | null {
  if (injected === null) return null
  if (injected !== undefined) return injected
  return async (formats: BarcodeFormat[]) => {
    const mod = await import('@zxing/library')
    const hints = buildZxingHints(
      formats,
      numericEnumTable(mod.BarcodeFormat),
      numericEnumTable(mod.DecodeHintType),
    )
    const reader = new mod.BrowserMultiFormatReader(hints ?? undefined)
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
 * The numeric name → value table of a zxing enum object. zxing's enums are
 * real TypeScript numeric enums, so their runtime objects also carry the
 * reverse mapping — every value keyed back to its name as a string — and
 * that string-valued reverse index is why the enum object itself cannot flow
 * into {@link buildZxingHints}'s `Record<string, number>` parameters.
 * Copying only the numeric-valued keys yields exactly the plain table the
 * helper indexes, with the plain shape its signature declares.
 *
 * @param source - The zxing enum object.
 * @returns The numeric name → value table.
 */
function numericEnumTable(source: Record<string, number | string>): Record<string, number> {
  const table: Record<string, number> = {}
  for (const [name, value] of Object.entries(source)) {
    if (typeof value === 'number') table[name] = value
  }
  return table
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

/** The acquisition dependencies one scan run is started with (React's effect closure). */
interface ScanDeps {
  continuous: boolean
  scanIntervalMs: number
  width: number
  height: number
  formatsKey: string
  detectorCtor: BarcodeDetectorConstructor | null | undefined
  loader: ZxingLoader | null | undefined
}

/**
 * BarcodeScanner component.
 *
 * Browser-side barcode scanner: acquires a rear-facing camera via
 * `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`,
 * then drives a detection loop using the native `BarcodeDetector` API
 * when available and falling back to `@zxing/library` otherwise. The
 * Angular counterpart of `@molecule/app-feature-barcode-scanner-react`:
 * the same props (React names), the same ClassMap tokens, the same i18n
 * keys and the same DOM for the same input.
 *
 * React's root element is a `<div role="region">`, so the host IS that
 * element (`div[mol-barcode-scanner]`) — exactly React's root.
 *
 * The acquisition restarts when an input that React's effect depends on
 * changes (`ngOnChanges`) and when the active locale changes (React's
 * `t` identity changes with it), gated on a joined key so an
 * equal-content `formats` array and a `dedupeMs` change — which React's
 * dependency list does not carry — never re-acquire.
 *
 * All styling routes through `getClassMap()` (no raw class names). All
 * user-visible text routes through `t()` so the scanner translates via
 * the companion `@molecule/app-locales-feature-barcode-scanner` locale bond.
 */
@Component({
  selector: 'div[mol-barcode-scanner]',
  standalone: true,
  inputs: [
    'formats',
    'onScan',
    'onError',
    'continuous',
    'scanIntervalMs',
    'dedupeMs',
    'width',
    'height',
    'className',
    'barcodeDetector',
    'loadZxing',
  ],
  host: {
    role: 'region',
    'data-mol-id': 'barcode-scanner',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-status]': 'status()',
    '[class]': 'classes()',
    '[style]': 'rootStyle()',
  },
  template: `<video
      #videoEl
      data-mol-id="barcode-scanner-video"
      [muted]="true"
      playsinline
      style="width: 100%; height: 100%; object-fit: cover; display: block"
    ></video>
    @if (statusLabel(); as label) {
      <div
        role="status"
        aria-live="polite"
        data-mol-id="barcode-scanner-status"
        style="position: absolute; left: 0px; right: 0px; bottom: 0px; padding: 8px; text-align: center; pointer-events: none"
      >
        <span [class]="statusTextClasses()">{{ label }}</span>
      </div>
    }`,
})
export class BarcodeScanner {
  /** Symbologies the scanner should accept; defaults to `DEFAULT_FORMATS`. */
  formats?: BarcodeFormat[]
  /** Fired with the decoded result on every successful scan. */
  onScan?: BarcodeScannerProps['onScan']
  /** Fired when camera acquisition or detection fails. */
  onError?: BarcodeScannerProps['onError']
  /** Keep scanning after each detection (see `BarcodeScannerProps`). */
  continuous?: boolean
  /** Polling interval between detector frames, in milliseconds. */
  scanIntervalMs?: number
  /** Dedupe cooldown, in milliseconds (read live, not a dependency). */
  dedupeMs?: number
  /** Pixel width hint passed as the camera constraint. */
  width?: number
  /** Pixel height hint passed as the camera constraint. */
  height?: number
  /** Extra classes merged onto the root element. */
  className?: string
  /** Injected native `BarcodeDetector` constructor (a class or `null`). */
  barcodeDetector?: BarcodeDetectorConstructor | null
  /** Injected `@zxing/library` fallback loader (a function or `null`). */
  loadZxing?: ZxingLoader | null

  /**
   * The live `<video>` element (React's `videoRef`). A static query: it is
   * resolved before the first `ngOnChanges`, which starts the first run.
   */
  @ViewChild('videoEl', { static: true })
  private videoRef?: ElementRef<HTMLVideoElement>

  /** Scanner status (React's `status` state). */
  readonly status = signal<'idle' | 'starting' | 'scanning' | 'stopped' | 'error'>('idle')
  /** The active error code (React's `errorCode` state). */
  readonly errorCode = signal<BarcodeScannerErrorCode | null>(null)

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The acquisition key the running scan was started with (null = none yet). */
  private lastAcquisitionKey: string | null = null

  /** Restarts the acquisition when the active locale changes (React's `t` dep). */
  private readonly localeEffect = effect((): void => {
    void this.i18n.locale()
    this.restartIfAcquisitionChanged()
  })

  /**
   * Restarts the acquisition when an input React's effect depends on
   * changes. Angular reports a change only when a binding's value moved,
   * so a re-pass of equal props never reaches here; the joined key gates
   * the equal-content `formats` array (a new array, the same key) and the
   * `dedupeMs` change, which React's dependency list does not carry.
   */
  ngOnChanges(): void {
    this.restartIfAcquisitionChanged()
  }

  /** Tears the camera down when the host is destroyed (React's effect cleanup). */
  ngOnDestroy(): void {
    this.stopScanning()
  }

  /**
   * The scan dependencies of a run started right now (React reads its
   * defaulted deps from the effect closure; these are the live inputs
   * with React's defaults applied).
   *
   * @returns The acquisition dependencies.
   */
  private currentDeps(): ScanDeps {
    return {
      continuous: this.continuous ?? false,
      scanIntervalMs: this.scanIntervalMs ?? 200,
      width: this.width ?? 640,
      height: this.height ?? 480,
      formatsKey: (this.formats ?? DEFAULT_FORMATS).join('|'),
      detectorCtor: this.barcodeDetector,
      loader: this.loadZxing,
    }
  }

  /**
   * React's effect dependency list collapsed to one comparable string:
   * the cadence props, the joined `formats` key, the injected
   * detector/loader markers (`null` and `undefined` stay distinct) and
   * the active locale.
   *
   * @returns The joined acquisition key.
   */
  private acquisitionKey(deps: ScanDeps): string {
    const detector = deps.detectorCtor
    const loader = deps.loader
    return [
      deps.continuous,
      deps.scanIntervalMs,
      deps.width,
      deps.height,
      deps.formatsKey,
      detector === undefined
        ? 'detector:undefined'
        : detector === null
          ? 'detector:null'
          : String(detector),
      loader === undefined ? 'loader:undefined' : loader === null ? 'loader:null' : String(loader),
      this.i18n.locale(),
    ].join('\n')
  }

  /**
   * Stops the running scan and starts a new one, unless the acquisition
   * key has not moved since the running one started.
   */
  private restartIfAcquisitionChanged(): void {
    const deps = this.currentDeps()
    const key = this.acquisitionKey(deps)
    if (key === this.lastAcquisitionKey) return
    this.lastAcquisitionKey = key
    this.stopScanning()
    void this.start(deps)
  }

  /**
   * The requested format list of one run, read back from its stable key.
   *
   * @param formatsKey - The joined `formats` key.
   * @returns The split list.
   */
  private formatListOf(formatsKey: string): BarcodeFormat[] {
    return formatsKey === '' ? [] : (formatsKey.split('|') as BarcodeFormat[])
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Localize a `BarcodeScannerErrorCode` and dispatch it through
   * `onError` exactly once per failure.
   *
   * @param code - The error code.
   * @param cause - Original underlying error.
   */
  private dispatchError(code: BarcodeScannerErrorCode, cause?: unknown): void {
    const message = this.localizedErrorMessage(code)
    this.status.set('error')
    this.errorCode.set(code)
    this.onError?.({ code, message, cause })
  }

  /**
   * Stop the active stream and clear the polling handle. Idempotent
   * — safe to call from cleanup and from the first-scan fast path.
   */
  private stopScanning(): void {
    this.cancelled = true
    if (this.pollHandle !== null) {
      clearTimeout(this.pollHandle)
      this.pollHandle = null
    }
    if (this.zxingReader !== null) {
      try {
        this.zxingReader.reset()
      } catch (_error) {
        // best-effort teardown — reader may already be disposed; safe to ignore
      }
      this.zxingReader = null
    }
    if (this.stream !== null) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
    const video = this.videoRef?.nativeElement ?? null
    if (video !== null) {
      try {
        video.pause()
      } catch (_error) {
        // best-effort teardown — video element may already be detached; safe to ignore
      }
      video.srcObject = null
    }
  }

  // Acquisition state, shared between restarts exactly as React's refs are:
  // a later stop must be able to release an earlier run's stream.
  private cancelled = false
  private pollHandle: ReturnType<typeof setTimeout> | null = null
  private zxingReader: ZxingReader | null = null
  private stream: MediaStream | null = null
  private lastValue: string | null = null
  private lastValueAt = 0

  /**
   * Deliver a scan and stop the loop if `continuous` is `false`.
   * Dedupe is time-bounded by the live `dedupeMs` input (React reads
   * its ref the same way), so the SAME code can be re-scanned after
   * the window and a DIFFERENT code is never suppressed.
   *
   * @param result - The decoded result.
   * @param isContinuous - The `continuous` value of this run.
   */
  private handleResult(result: BarcodeScanResult, isContinuous: boolean): void {
    const now = Date.now()
    const isDuplicate =
      this.lastValue === result.value && now - this.lastValueAt < (this.dedupeMs ?? 1500)
    if (isDuplicate) return
    this.lastValue = result.value
    this.lastValueAt = now
    this.onScan?.(result)
    if (!isContinuous) {
      this.status.set('stopped')
      this.stopScanning()
    }
  }

  /**
   * Start the camera, then dispatch to the detector loop or
   * fallback loop based on platform support. Every acquisition
   * dependency arrives from the run that started it, exactly as
   * React's effect closure captures them.
   *
   * @param deps - The acquisition dependencies of this run.
   */
  private async start(deps: ScanDeps): Promise<void> {
    this.cancelled = false
    this.status.set('starting')
    this.errorCode.set(null)

    if (
      typeof navigator === 'undefined' ||
      navigator.mediaDevices === undefined ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      this.dispatchError('unsupported')
      return
    }

    let acquired: MediaStream
    try {
      acquired = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: deps.width },
          height: { ideal: deps.height },
        },
        audio: false,
      })
    } catch (cause) {
      this.dispatchError(mapMediaErrorCode(cause), cause)
      return
    }

    if (this.cancelled) {
      acquired.getTracks().forEach((track) => track.stop())
      return
    }

    this.stream = acquired
    const video = this.videoRef?.nativeElement ?? null
    if (video === null) {
      // Effect ran but the element is detached — tear the stream
      // back down and bail without dispatching, since this is a
      // benign mount/unmount race rather than an error condition.
      acquired.getTracks().forEach((track) => track.stop())
      this.stream = null
      return
    }

    video.srcObject = acquired
    video.setAttribute('playsinline', 'true')
    try {
      await video.play()
    } catch (cause) {
      // Autoplay policies can reject silent video plays; surface as
      // detector_failure so callers can show a tap-to-start hint.
      this.dispatchError('detector_failure', cause)
      return
    }

    const ctor = resolveDetectorCtor(deps.detectorCtor)
    if (ctor !== null) {
      await this.runNativeDetectorLoop(ctor, deps)
    } else {
      await this.runFallbackLoop(deps)
    }
  }

  /**
   * Native-detector poll loop. Re-uses one detector instance across
   * frames; bails on cancellation.
   *
   * @param ctor - The active detector constructor.
   * @param deps - The acquisition dependencies of this run.
   */
  private async runNativeDetectorLoop(
    ctor: BarcodeDetectorConstructor,
    deps: ScanDeps,
  ): Promise<void> {
    let detector: BarcodeDetectorLike
    try {
      detector = new ctor({ formats: this.formatListOf(deps.formatsKey) })
    } catch (cause) {
      this.dispatchError('detector_failure', cause)
      return
    }

    this.status.set('scanning')
    const tick = async (): Promise<void> => {
      if (this.cancelled) return
      const video = this.videoRef?.nativeElement ?? null
      if (video === null) return
      try {
        const matches = await detector.detect(video)
        if (this.cancelled) return
        if (matches.length > 0) {
          const first = matches[0]
          this.handleResult({ format: first.format, value: first.rawValue }, deps.continuous)
          if (!deps.continuous) return
        }
      } catch (cause) {
        this.dispatchError('detector_failure', cause)
        return
      }
      if (!this.cancelled) {
        this.pollHandle = setTimeout(() => {
          void tick()
        }, deps.scanIntervalMs)
      }
    }
    await tick()
  }

  /**
   * Fallback poll loop driven by `@zxing/library`'s
   * `BrowserMultiFormatReader#decodeOnceFromVideoElement`. The
   * reader resolves on a hit and rejects with a `NotFoundException`
   * on misses — both are normal and drive the next tick.
   *
   * @param deps - The acquisition dependencies of this run.
   */
  private async runFallbackLoop(deps: ScanDeps): Promise<void> {
    const loader = resolveZxingLoader(deps.loader)
    if (loader === null) {
      this.dispatchError('fallback_unavailable')
      return
    }
    try {
      this.zxingReader = await loader(this.formatListOf(deps.formatsKey))
    } catch (cause) {
      this.dispatchError('fallback_unavailable', cause)
      return
    }

    this.status.set('scanning')
    const tick = async (): Promise<void> => {
      if (this.cancelled) return
      const video = this.videoRef?.nativeElement ?? null
      const reader = this.zxingReader
      if (video === null || reader === null) return
      try {
        const result = await reader.decodeOnceFromVideoElement(video)
        if (this.cancelled) return
        if (result !== null && result.text !== '') {
          this.handleResult(
            { format: result.format ?? 'unknown', value: result.text },
            deps.continuous,
          )
          if (!deps.continuous) return
        }
      } catch (_error) {
        // NotFoundException and friends are normal misses from zxing; safe to
        // ignore — the loop continues to the next tick regardless.
      }
      if (!this.cancelled) {
        this.pollHandle = setTimeout(() => {
          void tick()
        }, deps.scanIntervalMs)
      }
    }
    await tick()
  }

  /**
   * Localize a `BarcodeScannerErrorCode` under its LITERAL key — one
   * `t()` call per code — so the i18n gate can verify every key this
   * component can ask for against the locale bond, and the inline
   * `defaultValue` matches the bond's English text exactly.
   *
   * @param code - The error code to localize.
   * @returns The localized message.
   */
  private localizedErrorMessage(code: BarcodeScannerErrorCode): string {
    switch (code) {
      case 'permission_denied':
        return this.i18n.t(
          'barcodeScanner.error.permission_denied',
          {},
          {
            defaultValue: 'Camera permission denied',
          },
        )
      case 'no_camera':
        return this.i18n.t(
          'barcodeScanner.error.no_camera',
          {},
          { defaultValue: 'No camera found' },
        )
      case 'unsupported':
        return this.i18n.t(
          'barcodeScanner.error.unsupported',
          {},
          {
            defaultValue: 'Camera not supported in this browser',
          },
        )
      case 'detector_failure':
        return this.i18n.t(
          'barcodeScanner.error.detector_failure',
          {},
          { defaultValue: 'Barcode detector failed' },
        )
      case 'fallback_unavailable':
        return this.i18n.t(
          'barcodeScanner.error.fallback_unavailable',
          {},
          { defaultValue: 'Barcode scanner library could not be loaded' },
        )
    }
  }

  /**
   * The translated region label (React's `ariaLabel`).
   * @returns The label.
   */
  ariaLabel(): string {
    return this.i18n.t(
      'barcodeScanner.aria.region',
      {},
      { defaultValue: 'Barcode scanner camera view' },
    )
  }

  /**
   * The status overlay's text (React's `statusLabel`).
   * @returns The label, or an empty string when nothing is shown.
   */
  statusLabel(): string {
    if (this.status() === 'starting')
      return this.i18n.t('barcodeScanner.status.starting', {}, { defaultValue: 'Starting camera…' })
    if (this.status() === 'scanning')
      return this.i18n.t('barcodeScanner.status.scanning', {}, { defaultValue: 'Scanning…' })
    if (this.status() === 'stopped')
      return this.i18n.t('barcodeScanner.status.stopped', {}, { defaultValue: 'Scan complete' })
    if (this.status() === 'error' && this.errorCode() !== null)
      return this.localizedErrorMessage(this.errorCode()!)
    return ''
  }

  /**
   * The root class list (`className` passthrough).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The status text's class list (`cm.textSize('sm')` + `cm.fontWeight('medium')`).
   * @returns The class string.
   */
  statusTextClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('medium'))
  }

  /**
   * The root region's inline geometry (React's `rootStyle`).
   * @returns The style string.
   */
  rootStyle(): string {
    const width = this.width ?? 640
    const height = this.height ?? 480
    return [
      'position: relative',
      'width: 100%',
      `max-width: ${width}px`,
      `aspect-ratio: ${width} / ${height}`,
      'overflow: hidden',
      'background: currentColor',
    ].join('; ')
  }
}
