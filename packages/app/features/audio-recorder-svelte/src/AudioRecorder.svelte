<!--
  AudioRecorder: the Svelte counterpart of `@molecule/app-audio-recorder-react`'s
  `AudioRecorder` — mic-permission + MediaRecorder wrapper with a status badge,
  an elapsed-time readout, the transport buttons and an error line. Same props,
  same DOM for the same input, same callbacks.
-->
<script lang="ts">
  import { onMount } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AudioRecorderProps, AudioRecorderState } from './types.js'

  let {
    onRecorded,
    onError,
    mimeType,
    maxDurationSeconds = 0,
    dataMolId,
    className,
  }: AudioRecorderProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let recorderState = $state<AudioRecorderState>('idle')
  let elapsed = $state(0)
  let errorMessage = $state<string | null>(null)

  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let tick: ReturnType<typeof setInterval> | null = null
  let startedAt = 0
  let pausedAccum = 0
  let pausedAt: number | null = null

  /**
   * Format a duration (seconds) as `m:ss`.
   * @param seconds - Duration to format.
   * @returns A short `m:ss` string.
   */
  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  /**
   * Resolve the MediaRecorder constructor at call time so jsdom + tests can
   * stub `globalThis.MediaRecorder` without leaking through static imports.
   * @returns The runtime MediaRecorder constructor or `undefined` when the
   *   browser environment lacks support.
   */
  function getMediaRecorder(): typeof MediaRecorder | undefined {
    if (typeof globalThis === 'undefined') return undefined
    return (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder
  }

  /**
   * Computes the final recording duration from the refs at stop time (React's
   * `elapsedFromRefs`).
   * @returns Duration in whole seconds.
   */
  function elapsedFromRefs(): number {
    const now = Date.now()
    const pausedNow = pausedAt ? now - pausedAt : 0
    const totalPaused = pausedAccum + pausedNow
    return Math.max(0, Math.floor((now - startedAt - totalPaused) / 1000))
  }

  /** Stops the elapsed-time interval, if one is running. */
  function stopTick(): void {
    if (tick) {
      clearInterval(tick)
      tick = null
    }
  }

  /**
   * Starts the elapsed-time interval (React's `startTick`), auto-stopping the
   * recorder once the limit is reached.
   * @param limit - The max duration captured when the recording started.
   */
  function startTick(limit: number): void {
    stopTick()
    tick = setInterval(() => {
      const now = Date.now()
      const totalPaused = pausedAccum + (pausedAt ? now - pausedAt : 0)
      const sec = Math.floor((now - startedAt - totalPaused) / 1000)
      elapsed = sec
      if (limit > 0 && sec >= limit) {
        // Auto-stop.
        try {
          recorder?.stop()
        } catch (_error) {
          // Best-effort auto-stop at max duration; recorder may have already stopped or been torn down.
        }
      }
    }, 250)
  }

  /** Starts a recording (React's `handleStart`): mic permission, then MediaRecorder. */
  async function handleStart(): Promise<void> {
    errorMessage = null
    chunks = []
    pausedAccum = 0
    pausedAt = null

    const Ctor = getMediaRecorder()
    if (!Ctor) {
      const err = new Error('MediaRecorder is not supported in this environment')
      errorMessage = t(
        'audioRecorder.unsupported',
        {},
        { defaultValue: 'Audio recording is not supported in this browser' },
      )
      recorderState = 'error'
      onError?.(err)
      return
    }

    const requestedMime = mimeType
    try {
      const md = (
        globalThis as {
          navigator?: {
            mediaDevices?: { getUserMedia?: typeof navigator.mediaDevices.getUserMedia }
          }
        }
      ).navigator?.mediaDevices
      if (!md?.getUserMedia) {
        throw new Error('Microphone access (getUserMedia) is not available')
      }
      const nextStream = await md.getUserMedia({ audio: true })
      stream = nextStream

      const opts: MediaRecorderOptions | undefined = requestedMime
        ? { mimeType: requestedMime }
        : undefined
      const rec = new Ctor(nextStream, opts)
      recorder = rec

      rec.addEventListener('dataavailable', (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      })
      rec.addEventListener('stop', () => {
        stopTick()
        const finalMime = rec.mimeType || requestedMime || 'audio/webm'
        const blob = new Blob(chunks, { type: finalMime })
        const dur = elapsedFromRefs()
        // Tear down stream tracks so the OS mic indicator turns off.
        stream?.getTracks().forEach((tr) => tr.stop())
        stream = null
        recorder = null
        recorderState = 'processed'
        onRecorded({ blob, mimeType: finalMime, durationSeconds: dur })
      })
      rec.addEventListener('error', () => {
        const err = new Error('Recording failed')
        errorMessage = t(
          'audioRecorder.error',
          {},
          {
            defaultValue: 'Recording failed. Please try again.',
          },
        )
        recorderState = 'error'
        stopTick()
        onError?.(err)
      })

      startedAt = Date.now()
      elapsed = 0
      rec.start()
      startTick(maxDurationSeconds)
      recorderState = 'recording'
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Microphone permission denied')
      errorMessage = t(
        'audioRecorder.permissionDenied',
        {},
        { defaultValue: 'Microphone permission denied. Allow access and try again.' },
      )
      recorderState = 'error'
      onError?.(e)
    }
  }

  /** Pauses a recording (React's `handlePause`). */
  function handlePause(): void {
    const rec = recorder
    if (!rec || rec.state !== 'recording') return
    try {
      rec.pause()
      pausedAt = Date.now()
      recorderState = 'paused'
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Pause failed'))
    }
  }

  /** Resumes a paused recording (React's `handleResume`). */
  function handleResume(): void {
    const rec = recorder
    if (!rec || rec.state !== 'paused') return
    try {
      rec.resume()
      if (pausedAt) {
        pausedAccum += Date.now() - pausedAt
        pausedAt = null
      }
      recorderState = 'recording'
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Resume failed'))
    }
  }

  /** Stops a recording (React's `handleStop`). */
  function handleStop(): void {
    const rec = recorder
    if (!rec) return
    if (rec.state === 'inactive') return
    try {
      rec.stop()
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Stop failed'))
    }
  }

  onMount(() => {
    return () => {
      stopTick()
      stream?.getTracks().forEach((tr) => tr.stop())
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch (_error) {
          // Best-effort cleanup on unmount; recorder may already be inactive or torn down.
        }
      }
    }
  })

  /**
   * The recording dot's inline style — only what ClassMap cannot express
   * (React's `dotStyle`).
   * @returns The dot's style declarations.
   */
  function dotStyle(): string {
    const background =
      recorderState === 'recording'
        ? 'var(--mol-color-error, #e11)'
        : 'var(--mol-color-on-surface-variant, #888)'
    const animation =
      recorderState === 'recording' ? 'animation: mol-pulse 1.2s ease-in-out infinite; ' : ''
    return `${animation}background: ${background}; border-radius: 50%; display: inline-block; height: 10px; margin-right: 8px; vertical-align: middle; width: 10px`
  }

  /** The status badge's text (React's `stateLabel`). */
  function stateLabel(): string {
    return recorderState === 'recording'
      ? t('audioRecorder.statusRecording', {}, { defaultValue: 'Recording' })
      : recorderState === 'paused'
        ? t('audioRecorder.statusPaused', {}, { defaultValue: 'Paused' })
        : recorderState === 'processed'
          ? t('audioRecorder.statusProcessed', {}, { defaultValue: 'Recorded' })
          : recorderState === 'error'
            ? t('audioRecorder.statusError', {}, { defaultValue: 'Error' })
            : t('audioRecorder.statusIdle', {}, { defaultValue: 'Ready to record' })
  }

  /** The elapsed readout's accessible name (React's `elapsedLabel`). */
  function elapsedLabel(): string {
    return t(
      'audioRecorder.elapsed',
      { time: formatDuration(elapsed) },
      { defaultValue: 'Elapsed {{time}}' },
    )
  }

  // Transport actions go through the design system so they match every other
  // labelled action in the app: Record is the one coloured call to action
  // (record-red), the rest are equal-weight outline controls.
  const recordClass = $derived(
    cm.cn(cm.button({ variant: 'solid', color: 'error', size: 'sm' }), cm.touchTargetCompact),
  )
  const transportClass = $derived(
    cm.cn(cm.button({ variant: 'outline', size: 'sm' }), cm.touchTargetCompact),
  )
  const wrapperClass = $derived(cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), className))
  const rowClass = $derived(cm.flex({ align: 'center', gap: 'sm' }))
  const statusClass = $derived(cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')))
</script>

<div
  class={wrapperClass}
  data-mol-id={dataMolId ?? 'audio-recorder'}
  data-state={recorderState}
  role="group"
  aria-label={t('audioRecorder.group', {}, { defaultValue: 'Audio recorder' })}
>
  <div class={rowClass}>
    <span aria-hidden="true" style={dotStyle()}></span>
    <span class={statusClass} data-mol-id="audio-recorder-status" aria-live="polite"
      >{stateLabel()}</span
    >
    <span class={cm.textSize('sm')} data-mol-id="audio-recorder-elapsed" aria-label={elapsedLabel()}
      >{formatDuration(elapsed)}</span
    >
  </div>
  <div class={rowClass}>
    {#if recorderState === 'idle' || recorderState === 'processed' || recorderState === 'error'}
      <button
        type="button"
        onclick={() => void handleStart()}
        aria-label={t('audioRecorder.record', {}, { defaultValue: 'Record' })}
        data-action="record"
        data-mol-id="audio-recorder-record"
        class={recordClass}>{t('audioRecorder.record', {}, { defaultValue: 'Record' })}</button
      >
    {/if}
    {#if recorderState === 'recording'}
      <button
        type="button"
        onclick={handlePause}
        aria-label={t('audioRecorder.pause', {}, { defaultValue: 'Pause' })}
        data-action="pause"
        data-mol-id="audio-recorder-pause"
        class={transportClass}>{t('audioRecorder.pause', {}, { defaultValue: 'Pause' })}</button
      >
    {/if}
    {#if recorderState === 'paused'}
      <button
        type="button"
        onclick={handleResume}
        aria-label={t('audioRecorder.resume', {}, { defaultValue: 'Resume' })}
        data-action="resume"
        data-mol-id="audio-recorder-resume"
        class={transportClass}>{t('audioRecorder.resume', {}, { defaultValue: 'Resume' })}</button
      >
    {/if}
    {#if recorderState === 'recording' || recorderState === 'paused'}
      <button
        type="button"
        onclick={handleStop}
        aria-label={t('audioRecorder.stop', {}, { defaultValue: 'Stop' })}
        data-action="stop"
        data-mol-id="audio-recorder-stop"
        class={transportClass}>{t('audioRecorder.stop', {}, { defaultValue: 'Stop' })}</button
      >
    {/if}
  </div>
  {#if errorMessage}
    <div
      class={cm.textSize('sm')}
      role="alert"
      data-mol-id="audio-recorder-error"
      style="color: var(--mol-color-error, #e11)"
    >
      {errorMessage}
    </div>
  {/if}
</div>
