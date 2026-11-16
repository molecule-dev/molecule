<!--
  BarcodeScanner: the Svelte counterpart of
  `@molecule/app-feature-barcode-scanner-react`'s `BarcodeScanner` — a browser
  barcode scanner that acquires a rear-facing camera via `getUserMedia` and
  decodes frames with the native `BarcodeDetector` API, falling back to
  `@zxing/library`. Same props (React names), same ClassMap tokens, same i18n
  keys, same DOM for the same input, same callback calls.

  The acquisition effect's reads mirror React's dependency list: the cadence
  props, the joined `formats` key (an equal-content array does not
  re-acquire), the injected `barcodeDetector` / `loadZxing` markers, and the
  LOCALE (React's `t` identity changes with it). `dedupeMs` is read live — a
  change never re-acquires.
-->
<script lang="ts">
  import { onDestroy } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { mapMediaErrorCode, resolveDetectorCtor, resolveZxingLoader } from './detector.js'
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
  import { DEFAULT_FORMATS } from './zxing.js'

  let {
    formats,
    onScan,
    onError,
    continuous,
    scanIntervalMs,
    dedupeMs,
    width,
    height,
    className,
    barcodeDetector,
    loadZxing,
  }: BarcodeScannerProps = $props()

  const cm = $derived(getClassMap())
  const { t, locale } = useTranslation()

  let status = $state<'idle' | 'starting' | 'scanning' | 'stopped' | 'error'>('idle')
  let errorCode = $state<BarcodeScannerErrorCode | null>(null)

  /** The live `<video>` element (React's `videoRef`). */
  let videoEl: HTMLVideoElement | null = null

  const widthValue = $derived(width ?? 640)
  const heightValue = $derived(height ?? 480)
  const scanIntervalValue = $derived(scanIntervalMs ?? 200)
  const continuousValue = $derived(continuous ?? false)
  const formatsKey = $derived((formats ?? DEFAULT_FORMATS).join('|'))

  // Acquisition state, shared between restarts exactly as React's refs are:
  // a later stop must be able to release an earlier run's stream.
  let cancelled = false
  let pollHandle: ReturnType<typeof setTimeout> | null = null
  let zxingReader: ZxingReader | null = null
  let stream: MediaStream | null = null
  let lastValue: string | null = null
  let lastValueAt = 0

  /**
   * The requested format list of one run, read back from its stable key.
   *
   * @param key - The joined `formats` key.
   * @returns The split list.
   */
  function formatListOf(key: string): BarcodeFormat[] {
    return key === '' ? [] : (key.split('|') as BarcodeFormat[])
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
  function localizedErrorMessage(code: BarcodeScannerErrorCode): string {
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
   * Localize a `BarcodeScannerErrorCode` and dispatch it through
   * `onError` exactly once per failure.
   *
   * @param code - The error code.
   * @param cause - Original underlying error.
   */
  function dispatchError(code: BarcodeScannerErrorCode, cause?: unknown): void {
    const message = localizedErrorMessage(code)
    status = 'error'
    errorCode = code
    onError?.({ code, message, cause })
  }

  /**
   * Stop the active stream and clear the polling handle. Idempotent
   * — safe to call from cleanup and from the first-scan fast path.
   */
  function stopScanning(): void {
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
    if (videoEl !== null) {
      try {
        videoEl.pause()
      } catch (_error) {
        // best-effort teardown — video element may already be detached; safe to ignore
      }
      videoEl.srcObject = null
    }
  }

  /**
   * Deliver a scan and stop the loop if `continuous` is `false`.
   * Dedupe is time-bounded by the live `dedupeMs` prop (React reads
   * its ref the same way), so the SAME code can be re-scanned after
   * the window and a DIFFERENT code is never suppressed.
   *
   * @param result - The decoded result.
   * @param isContinuous - The `continuous` value of this run.
   */
  function handleResult(result: BarcodeScanResult, isContinuous: boolean): void {
    const now = Date.now()
    const isDuplicate = lastValue === result.value && now - lastValueAt < (dedupeMs ?? 1500)
    if (isDuplicate) return
    lastValue = result.value
    lastValueAt = now
    onScan?.(result)
    if (!isContinuous) {
      status = 'stopped'
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
  async function start(deps: ScanDeps): Promise<void> {
    cancelled = false
    status = 'starting'
    errorCode = null

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
    const video = videoEl
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
  async function runNativeDetectorLoop(
    ctor: BarcodeDetectorConstructor,
    deps: ScanDeps,
  ): Promise<void> {
    let detector: BarcodeDetectorLike
    try {
      detector = new ctor({ formats: formatListOf(deps.formatsKey) })
    } catch (cause) {
      dispatchError('detector_failure', cause)
      return
    }

    status = 'scanning'
    const tick = async (): Promise<void> => {
      if (cancelled) return
      const video = videoEl
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
  async function runFallbackLoop(deps: ScanDeps): Promise<void> {
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

    status = 'scanning'
    const tick = async (): Promise<void> => {
      if (cancelled) return
      const video = videoEl
      if (video === null || zxingReader === null) return
      try {
        const result = await zxingReader.decodeOnceFromVideoElement(video)
        if (cancelled) return
        if (result !== null && result.text !== '') {
          handleResult({ format: result.format ?? 'unknown', value: result.text }, deps.continuous)
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

  // React's effect dependency list collapsed to one comparable string: the
  // cadence props, the joined `formats` key, the injected detector/loader
  // markers (`null` and `undefined` stay distinct), and the LOCALE (React's
  // `t` identity changes with it). The effect below gates its restart on
  // this key, so a Svelte re-render that re-passes equal props never
  // re-acquires — exactly React's dependency-array semantics.
  const acquisitionKey = $derived.by((): string => {
    const detector = barcodeDetector
    const loader = loadZxing
    return [
      continuousValue,
      scanIntervalValue,
      widthValue,
      heightValue,
      formatsKey,
      detector === undefined
        ? 'detector:undefined'
        : detector === null
          ? 'detector:null'
          : String(detector),
      loader === undefined ? 'loader:undefined' : loader === null ? 'loader:null' : String(loader),
      $locale,
    ].join('\n')
  })

  /** The acquisition key the running scan was started with (null = none yet). */
  let lastAcquisitionKey: string | null = null

  $effect(() => {
    const key = acquisitionKey
    if (key !== lastAcquisitionKey) {
      lastAcquisitionKey = key
      if (videoEl !== null) {
        // React sets the `muted` DOM property; no attribute is written.
        videoEl.muted = true
      }
      stopScanning()
      void start({
        continuous: continuousValue,
        scanIntervalMs: scanIntervalValue,
        width: widthValue,
        height: heightValue,
        formatsKey: formatsKey,
        detectorCtor: barcodeDetector,
        loader: loadZxing,
      })
    }
  })

  onDestroy(() => stopScanning())

  const ariaLabel = $derived(
    t('barcodeScanner.aria.region', {}, { defaultValue: 'Barcode scanner camera view' }),
  )

  const statusLabel = $derived.by((): string => {
    if (status === 'starting')
      return t('barcodeScanner.status.starting', {}, { defaultValue: 'Starting camera…' })
    if (status === 'scanning')
      return t('barcodeScanner.status.scanning', {}, { defaultValue: 'Scanning…' })
    if (status === 'stopped')
      return t('barcodeScanner.status.stopped', {}, { defaultValue: 'Scan complete' })
    if (status === 'error' && errorCode !== null) return localizedErrorMessage(errorCode)
    return ''
  })

  const rootStyle = $derived(
    [
      'position: relative',
      'width: 100%',
      `max-width: ${widthValue}px`,
      `aspect-ratio: ${widthValue} / ${heightValue}`,
      'overflow: hidden',
      'background: currentColor',
    ].join('; '),
  )
</script>

<div
  role="region"
  aria-label={ariaLabel}
  data-mol-id="barcode-scanner"
  data-status={status}
  class={cm.cn(className)}
  style={rootStyle}
>
  <video
    bind:this={videoEl}
    data-mol-id="barcode-scanner-video"
    style="width: 100%; height: 100%; object-fit: cover; display: block"
    playsinline
  ></video>
  {#if statusLabel !== ''}
    <div
      role="status"
      aria-live="polite"
      data-mol-id="barcode-scanner-status"
      style="position: absolute; left: 0px; right: 0px; bottom: 0px; padding: 8px; text-align: center; pointer-events: none"
    >
      <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{statusLabel}</span>
    </div>
  {/if}
</div>
