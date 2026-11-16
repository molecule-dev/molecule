/**
 * Vue browser barcode scanner component.
 *
 * Vue counterpart of `@molecule/app-feature-barcode-scanner-react`'s
 * `BarcodeScanner` — the same props (React names), the same ClassMap tokens,
 * the same i18n keys and the same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  type VNode,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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
 * The `t` function shape `useTranslation()` hands this component.
 */
type Translate = ReturnType<typeof useTranslation>['t']

/**
 * Resolve the active `BarcodeDetector` constructor: the injected
 * `barcodeDetector` prop takes precedence, then the browser's
 * `globalThis.BarcodeDetector` (the W3C Shape Detection API, present
 * only in Chromium / WebView). Returns `null` when neither is
 * available — the caller runs the `@zxing/library` fallback.
 *
 * @param injected - The `barcodeDetector` prop: a constructor, `null`
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
 * Resolve the active fallback loader: the injected `loadZxing` prop
 * takes precedence; otherwise callers get a real dynamic import of
 * `@zxing/library`'s `BrowserMultiFormatReader`, constructed with a
 * `POSSIBLE_FORMATS` hint derived from the requested `formats`.
 *
 * @param injected - The `loadZxing` prop: a loader, `null` to make the
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

/**
 * Localize a `BarcodeScannerErrorCode` under its LITERAL key — one
 * `t()` call per code — so the i18n gate can verify every key this
 * component can ask for against the locale bond, and the inline
 * `defaultValue` matches the bond's English text exactly.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param code - The error code to localize.
 * @returns The localized message.
 */
function localizedErrorMessage(t: Translate, code: BarcodeScannerErrorCode): string {
  switch (code) {
    case 'permission_denied':
      return t(
        'barcodeScanner.error.permission_denied',
        {},
        {
          defaultValue: 'Camera permission denied',
        },
      )
    case 'no_camera':
      return t('barcodeScanner.error.no_camera', {}, { defaultValue: 'No camera found' })
    case 'unsupported':
      return t(
        'barcodeScanner.error.unsupported',
        {},
        {
          defaultValue: 'Camera not supported in this browser',
        },
      )
    case 'detector_failure':
      return t(
        'barcodeScanner.error.detector_failure',
        {},
        { defaultValue: 'Barcode detector failed' },
      )
    case 'fallback_unavailable':
      return t(
        'barcodeScanner.error.fallback_unavailable',
        {},
        { defaultValue: 'Barcode scanner library could not be loaded' },
      )
  }
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
 * The watcher's sources mirror React's effect dependency list: the
 * cadence props, the joined `formats` key (an equal-content array does
 * not re-acquire), the injected detector/loader markers, and the LOCALE
 * (React's `t` identity changes with it). `dedupeMs` is read live —
 * a change never re-acquires.
 *
 * @param props - Component props (see `BarcodeScannerProps`).
 * @returns The scanner component.
 */
export const BarcodeScanner = defineComponent({
  name: 'BarcodeScanner',
  props: {
    /** Symbologies the scanner should accept; defaults to `DEFAULT_FORMATS`. */
    formats: {
      type: Array as PropType<BarcodeFormat[] | undefined>,
      default: undefined,
    },
    /** Fired with the decoded result on every successful scan. */
    onScan: {
      type: Function as PropType<BarcodeScannerProps['onScan'] | undefined>,
      default: undefined,
    },
    /** Fired when camera acquisition or detection fails. */
    onError: {
      type: Function as PropType<BarcodeScannerProps['onError'] | undefined>,
      default: undefined,
    },
    /** Keep scanning after each detection (see `BarcodeScannerProps`). */
    continuous: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    /** Polling interval between detector frames, in milliseconds. */
    scanIntervalMs: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Dedupe cooldown, in milliseconds (read live, not a dependency). */
    dedupeMs: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Pixel width hint passed as the camera constraint. */
    width: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Pixel height hint passed as the camera constraint. */
    height: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Extra classes merged onto the root element. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    // The injected detector constructor and loader arrive as `null` (force
    // the fallback / fail it) or `undefined` (read the browser global) as
    // well as a function, so their runtime type is left unchecked (`type:
    // null`, Vue's any marker — the shapes live on `BarcodeScannerProps`).
    /** Injected native `BarcodeDetector` constructor (a class or `null`). */
    barcodeDetector: null,
    /** Injected `@zxing/library` fallback loader (a function or `null`). */
    loadZxing: null,
  },
  setup(props) {
    const cm = getClassMap()
    const { t, locale } = useTranslation()

    const videoRef = ref<HTMLVideoElement | null>(null)
    const status = ref<'idle' | 'starting' | 'scanning' | 'stopped' | 'error'>('idle')
    const errorCode = ref<BarcodeScannerErrorCode | null>(null)

    // Acquisition state, shared between restarts exactly as React's refs are:
    // a later stop must be able to release an earlier run's stream.
    let cancelled = false
    let pollHandle: ReturnType<typeof setTimeout> | null = null
    let zxingReader: ZxingReader | null = null
    let stream: MediaStream | null = null
    let lastValue: string | null = null
    let lastValueAt = 0

    /**
     * The scan dependencies of a run started right now.
     *
     * @returns The acquisition dependencies.
     */
    const currentDeps = (): ScanDeps => ({
      continuous: props.continuous ?? false,
      scanIntervalMs: props.scanIntervalMs ?? 200,
      width: props.width ?? 640,
      height: props.height ?? 480,
      formatsKey: (props.formats ?? DEFAULT_FORMATS).join('|'),
      detectorCtor: props.barcodeDetector,
      loader: props.loadZxing,
    })

    /**
     * Localize a `BarcodeScannerErrorCode` and dispatch it through
     * `onError` exactly once per failure.
     *
     * @param code - The error code.
     * @param cause - Original underlying error.
     */
    const dispatchError = (code: BarcodeScannerErrorCode, cause?: unknown): void => {
      const message = localizedErrorMessage(t, code)
      status.value = 'error'
      errorCode.value = code
      props.onError?.({ code, message, cause })
    }

    /**
     * Stop the active stream and clear the polling handle. Idempotent
     * — safe to call from cleanup and from the first-scan fast path.
     */
    const stopScanning = (): void => {
      cancelled = true
      if (pollHandle !== null) {
        clearTimeout(pollHandle)
        pollHandle = null
      }
      if (zxingReader !== null) {
        try {
          zxingReader.reset()
        } catch (_error) {
          // best-effort teardown — reader may already be disposed; safe to ignore
        }
        zxingReader = null
      }
      if (stream !== null) {
        stream.getTracks().forEach((track) => track.stop())
        stream = null
      }
      const video = videoRef.value
      if (video !== null) {
        try {
          video.pause()
        } catch (_error) {
          // best-effort teardown — video element may already be detached; safe to ignore
        }
        video.srcObject = null
      }
    }

    /**
     * Deliver a scan and stop the loop if `continuous` is `false`.
     * Dedupe is time-bounded by the live `dedupeMs` prop (React reads
     * its ref the same way), so the SAME code can be re-scanned after
     * the window and a DIFFERENT code is never suppressed.
     *
     * @param result - The decoded result.
     * @param continuousValue - The `continuous` value of this run.
     */
    const handleResult = (result: BarcodeScanResult, continuousValue: boolean): void => {
      const now = Date.now()
      const isDuplicate = lastValue === result.value && now - lastValueAt < (props.dedupeMs ?? 1500)
      if (isDuplicate) return
      lastValue = result.value
      lastValueAt = now
      props.onScan?.(result)
      if (!continuousValue) {
        status.value = 'stopped'
        stopScanning()
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
    const start = async (deps: ScanDeps): Promise<void> => {
      cancelled = false
      status.value = 'starting'
      errorCode.value = null

      if (
        typeof navigator === 'undefined' ||
        navigator.mediaDevices === undefined ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        dispatchError('unsupported')
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
        dispatchError(mapMediaErrorCode(cause), cause)
        return
      }

      if (cancelled) {
        acquired.getTracks().forEach((track) => track.stop())
        return
      }

      stream = acquired
      const video = videoRef.value
      if (video === null) {
        // Effect ran but the element is detached — tear the stream
        // back down and bail without dispatching, since this is a
        // benign mount/unmount race rather than an error condition.
        acquired.getTracks().forEach((track) => track.stop())
        stream = null
        return
      }

      video.srcObject = acquired
      video.setAttribute('playsinline', 'true')
      try {
        await video.play()
      } catch (cause) {
        // Autoplay policies can reject silent video plays; surface as
        // detector_failure so callers can show a tap-to-start hint.
        dispatchError('detector_failure', cause)
        return
      }

      const ctor = resolveDetectorCtor(deps.detectorCtor)
      if (ctor !== null) {
        await runNativeDetectorLoop(ctor, deps)
      } else {
        await runFallbackLoop(deps)
      }
    }

    /**
     * Native-detector poll loop. Re-uses one detector instance across
     * frames; bails on cancellation.
     *
     * @param ctor - The active detector constructor.
     * @param deps - The acquisition dependencies of this run.
     */
    const runNativeDetectorLoop = async (
      ctor: BarcodeDetectorConstructor,
      deps: ScanDeps,
    ): Promise<void> => {
      let detector: BarcodeDetectorLike
      try {
        detector = new ctor({ formats: formatListOf(deps.formatsKey) })
      } catch (cause) {
        dispatchError('detector_failure', cause)
        return
      }

      status.value = 'scanning'
      const tick = async (): Promise<void> => {
        if (cancelled) return
        const video = videoRef.value
        if (video === null) return
        try {
          const matches = await detector.detect(video)
          if (cancelled) return
          if (matches.length > 0) {
            const first = matches[0]
            handleResult({ format: first.format, value: first.rawValue }, deps.continuous)
            if (!deps.continuous) return
          }
        } catch (cause) {
          dispatchError('detector_failure', cause)
          return
        }
        if (!cancelled) {
          pollHandle = setTimeout(() => {
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
    const runFallbackLoop = async (deps: ScanDeps): Promise<void> => {
      const loader = resolveZxingLoader(deps.loader)
      if (loader === null) {
        dispatchError('fallback_unavailable')
        return
      }
      try {
        zxingReader = await loader(formatListOf(deps.formatsKey))
      } catch (cause) {
        dispatchError('fallback_unavailable', cause)
        return
      }

      status.value = 'scanning'
      const tick = async (): Promise<void> => {
        if (cancelled) return
        const video = videoRef.value
        if (video === null || zxingReader === null) return
        try {
          const result = await zxingReader.decodeOnceFromVideoElement(video)
          if (cancelled) return
          if (result !== null && result.text !== '') {
            handleResult(
              { format: result.format ?? 'unknown', value: result.text },
              deps.continuous,
            )
            if (!deps.continuous) return
          }
        } catch (_error) {
          // NotFoundException and friends are normal misses from zxing; safe to
          // ignore — the loop continues to the next tick regardless.
        }
        if (!cancelled) {
          pollHandle = setTimeout(() => {
            void tick()
          }, deps.scanIntervalMs)
        }
      }
      await tick()
    }

    onMounted(() => {
      void start(currentDeps())
    })

    // Every acquisition dependency in one watcher (React's effect
    // dependency list). Each source applies React's default, so an
    // `undefined` prop next to the default value does not re-acquire.
    watch(
      [
        () => props.continuous ?? false,
        () => props.scanIntervalMs ?? 200,
        () => props.width ?? 640,
        () => props.height ?? 480,
        () => (props.formats ?? DEFAULT_FORMATS).join('|'),
        () => locale.value,
        () => props.barcodeDetector,
        () => props.loadZxing,
      ],
      () => {
        stopScanning()
        void start(currentDeps())
      },
    )

    onBeforeUnmount(stopScanning)

    return (): VNode => {
      const width = props.width ?? 640
      const height = props.height ?? 480

      const rootStyle = {
        position: 'relative',
        width: '100%',
        maxWidth: `${width}px`,
        aspectRatio: `${width} / ${height}`,
        overflow: 'hidden',
        background: 'currentColor',
      }
      const videoStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      }
      const statusOverlayStyle = {
        position: 'absolute',
        left: '0px',
        right: '0px',
        bottom: '0px',
        padding: '8px',
        textAlign: 'center',
        pointerEvents: 'none',
      }

      const statusLabel = ((): string => {
        if (status.value === 'starting')
          return t('barcodeScanner.status.starting', {}, { defaultValue: 'Starting camera…' })
        if (status.value === 'scanning')
          return t('barcodeScanner.status.scanning', {}, { defaultValue: 'Scanning…' })
        if (status.value === 'stopped')
          return t('barcodeScanner.status.stopped', {}, { defaultValue: 'Scan complete' })
        if (status.value === 'error' && errorCode.value !== null)
          return localizedErrorMessage(t, errorCode.value)
        return ''
      })()

      const ariaLabel = t(
        'barcodeScanner.aria.region',
        {},
        { defaultValue: 'Barcode scanner camera view' },
      )

      return h(
        'div',
        {
          role: 'region',
          'aria-label': ariaLabel,
          'data-mol-id': 'barcode-scanner',
          'data-status': status.value,
          class: cm.cn(props.className),
          style: rootStyle,
        },
        [
          h('video', {
            ref: videoRef,
            'data-mol-id': 'barcode-scanner-video',
            style: videoStyle,
            muted: true,
            playsinline: '',
          }),
          statusLabel !== ''
            ? h(
                'div',
                {
                  role: 'status',
                  'aria-live': 'polite',
                  'data-mol-id': 'barcode-scanner-status',
                  style: statusOverlayStyle,
                },
                [
                  h('span', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')) }, [
                    statusLabel,
                  ]),
                ],
              )
            : null,
        ],
      )
    }
  },
})

/**
 * The requested format list of one run, read back from its stable key.
 *
 * @param formatsKey - The joined `formats` key.
 * @returns The split list.
 */
function formatListOf(formatsKey: string): BarcodeFormat[] {
  return formatsKey === '' ? [] : (formatsKey.split('|') as BarcodeFormat[])
}
