import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { AudioRecorderProps, AudioRecorderState } from './types.js'

/**
 * Format a duration (seconds) as `m:ss`.
 *
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
 *
 * @returns The runtime MediaRecorder constructor or `undefined` when the
 *   browser environment lacks support.
 */
function getMediaRecorder(): typeof MediaRecorder | undefined {
  if (typeof globalThis === 'undefined') return undefined
  return (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder
}

/**
 * Mic-permission + MediaRecorder UI primitive — emits a `Blob` once the user
 * finishes recording. Pure browser API; no upload, no transcription. Wire to
 * any backend by listening to `onRecorded` and POST-ing the blob.
 *
 * Renders a status badge, an elapsed-time readout, and three buttons:
 * Record (idle/processed) → Pause/Resume + Stop (recording/paused).
 * All button labels and status text flow through `t()` with English
 * `defaultValue` fallbacks; drop in a companion locale bond to translate.
 *
 * Styling is delegated to `getClassMap()` — no Tailwind / raw class names.
 *
 * @param props - Component props.
 * @returns The rendered recorder element.
 *
 * @example
 * ```tsx
 * <AudioRecorder
 *   maxDurationSeconds={120}
 *   onRecorded={({ blob, mimeType }) => uploadVoiceNote(blob, mimeType)}
 * />
 * ```
 */
export function AudioRecorder({
  onRecorded,
  onError,
  mimeType,
  maxDurationSeconds = 0,
  dataMolId,
  className,
}: AudioRecorderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const [state, setState] = useState<AudioRecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)
  const pausedAccumRef = useRef<number>(0)
  const pausedAtRef = useRef<number | null>(null)

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const startTick = useCallback(() => {
    stopTick()
    tickRef.current = setInterval(() => {
      const now = Date.now()
      const totalPaused =
        pausedAccumRef.current + (pausedAtRef.current ? now - pausedAtRef.current : 0)
      const sec = Math.floor((now - startedAtRef.current - totalPaused) / 1000)
      setElapsed(sec)
      if (maxDurationSeconds > 0 && sec >= maxDurationSeconds) {
        // Auto-stop.
        try {
          recorderRef.current?.stop()
        } catch {
          /* ignore */
        }
      }
    }, 250)
  }, [maxDurationSeconds, stopTick])

  const handleStart = useCallback(async () => {
    setErrorMessage(null)
    chunksRef.current = []
    pausedAccumRef.current = 0
    pausedAtRef.current = null

    const Ctor = getMediaRecorder()
    if (!Ctor) {
      const err = new Error('MediaRecorder is not supported in this environment')
      setErrorMessage(
        t(
          'audioRecorder.unsupported',
          {},
          { defaultValue: 'Audio recording is not supported in this browser' },
        ),
      )
      setState('error')
      onError?.(err)
      return
    }

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
      const stream = await md.getUserMedia({ audio: true })
      streamRef.current = stream

      const opts: MediaRecorderOptions | undefined = mimeType ? { mimeType } : undefined
      const rec = new Ctor(stream, opts)
      recorderRef.current = rec

      rec.addEventListener('dataavailable', (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      })
      rec.addEventListener('stop', () => {
        stopTick()
        const finalMime = rec.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalMime })
        const dur = elapsedFromRefs(startedAtRef, pausedAccumRef, pausedAtRef)
        // Tear down stream tracks so the OS mic indicator turns off.
        streamRef.current?.getTracks().forEach((tr) => tr.stop())
        streamRef.current = null
        recorderRef.current = null
        setState('processed')
        onRecorded({ blob, mimeType: finalMime, durationSeconds: dur })
      })
      rec.addEventListener('error', () => {
        const err = new Error('Recording failed')
        setErrorMessage(
          t('audioRecorder.error', {}, { defaultValue: 'Recording failed. Please try again.' }),
        )
        setState('error')
        stopTick()
        onError?.(err)
      })

      startedAtRef.current = Date.now()
      setElapsed(0)
      rec.start()
      startTick()
      setState('recording')
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Microphone permission denied')
      setErrorMessage(
        t(
          'audioRecorder.permissionDenied',
          {},
          { defaultValue: 'Microphone permission denied. Allow access and try again.' },
        ),
      )
      setState('error')
      onError?.(e)
    }
  }, [mimeType, onError, onRecorded, startTick, stopTick, t])

  const handlePause = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state !== 'recording') return
    try {
      rec.pause()
      pausedAtRef.current = Date.now()
      setState('paused')
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Pause failed'))
    }
  }, [onError])

  const handleResume = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state !== 'paused') return
    try {
      rec.resume()
      if (pausedAtRef.current) {
        pausedAccumRef.current += Date.now() - pausedAtRef.current
        pausedAtRef.current = null
      }
      setState('recording')
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Resume failed'))
    }
  }, [onError])

  const handleStop = useCallback(() => {
    const rec = recorderRef.current
    if (!rec) return
    if (rec.state === 'inactive') return
    try {
      rec.stop()
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Stop failed'))
    }
  }, [onError])

  const recordLabel = t('audioRecorder.record', {}, { defaultValue: 'Record' })
  const pauseLabel = t('audioRecorder.pause', {}, { defaultValue: 'Pause' })
  const resumeLabel = t('audioRecorder.resume', {}, { defaultValue: 'Resume' })
  const stopLabel = t('audioRecorder.stop', {}, { defaultValue: 'Stop' })
  const elapsedLabel = t(
    'audioRecorder.elapsed',
    { time: formatDuration(elapsed) },
    { defaultValue: 'Elapsed {{time}}' },
  )
  const stateLabel =
    state === 'recording'
      ? t('audioRecorder.statusRecording', {}, { defaultValue: 'Recording' })
      : state === 'paused'
        ? t('audioRecorder.statusPaused', {}, { defaultValue: 'Paused' })
        : state === 'processed'
          ? t('audioRecorder.statusProcessed', {}, { defaultValue: 'Recorded' })
          : state === 'error'
            ? t('audioRecorder.statusError', {}, { defaultValue: 'Error' })
            : t('audioRecorder.statusIdle', {}, { defaultValue: 'Ready to record' })

  // Inline styles only for things ClassMap can't express: the live red
  // dot, the bare button reset, and the disabled cursor.
  const dotStyle: CSSProperties = {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background:
      state === 'recording'
        ? 'var(--mol-color-error, #e11)'
        : 'var(--mol-color-on-surface-variant, #888)',
    marginRight: 8,
    verticalAlign: 'middle',
    animation: state === 'recording' ? 'mol-pulse 1.2s ease-in-out infinite' : undefined,
  }
  const buttonBase: CSSProperties = {
    background: 'none',
    border: '1px solid currentColor',
    padding: '0.4rem 0.9rem',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'inherit',
    fontSize: 'inherit',
    lineHeight: 1.2,
  }

  const showRecord = state === 'idle' || state === 'processed' || state === 'error'
  const showPause = state === 'recording'
  const showResume = state === 'paused'
  const showStop = state === 'recording' || state === 'paused'

  const wrapperClass = cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), className)

  return (
    <div
      className={wrapperClass}
      data-mol-id={dataMolId ?? 'audio-recorder'}
      data-state={state}
      role="group"
      aria-label={t('audioRecorder.group', {}, { defaultValue: 'Audio recorder' })}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <span aria-hidden style={dotStyle} />
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          data-mol-id="audio-recorder-status"
          aria-live="polite"
        >
          {stateLabel}
        </span>
        <span
          className={cm.textSize('sm')}
          data-mol-id="audio-recorder-elapsed"
          aria-label={elapsedLabel}
        >
          {formatDuration(elapsed)}
        </span>
      </div>

      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {showRecord && (
          <button
            type="button"
            onClick={handleStart}
            aria-label={recordLabel}
            data-action="record"
            style={buttonBase}
          >
            {recordLabel}
          </button>
        )}
        {showPause && (
          <button
            type="button"
            onClick={handlePause}
            aria-label={pauseLabel}
            data-action="pause"
            style={buttonBase}
          >
            {pauseLabel}
          </button>
        )}
        {showResume && (
          <button
            type="button"
            onClick={handleResume}
            aria-label={resumeLabel}
            data-action="resume"
            style={buttonBase}
          >
            {resumeLabel}
          </button>
        )}
        {showStop && (
          <button
            type="button"
            onClick={handleStop}
            aria-label={stopLabel}
            data-action="stop"
            style={buttonBase}
          >
            {stopLabel}
          </button>
        )}
      </div>

      {errorMessage && (
        <div
          className={cm.textSize('sm')}
          role="alert"
          data-mol-id="audio-recorder-error"
          style={{ color: 'var(--mol-color-error, #e11)' }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  )
}

/**
 * Compute final recording duration from refs at stop time.
 *
 * @param startedAtRef - Ref holding the recording start timestamp.
 * @param pausedAccumRef - Ref holding accumulated paused milliseconds.
 * @param pausedAtRef - Ref holding the current pause start (or null).
 * @returns Duration in whole seconds.
 */
function elapsedFromRefs(
  startedAtRef: { current: number },
  pausedAccumRef: { current: number },
  pausedAtRef: { current: number | null },
): number {
  const now = Date.now()
  const pausedNow = pausedAtRef.current ? now - pausedAtRef.current : 0
  const totalPaused = pausedAccumRef.current + pausedNow
  return Math.max(0, Math.floor((now - startedAtRef.current - totalPaused) / 1000))
}
