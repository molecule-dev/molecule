/**
 * Vue mic-permission + MediaRecorder wrapper: a status badge, an elapsed-time
 * readout and the transport buttons, emitting a `Blob` once recording
 * finishes.
 *
 * Vue counterpart of `@molecule/app-audio-recorder-react`'s `AudioRecorder` —
 * the same props (React names), the same DOM for the same input, and the same
 * callbacks.
 *
 * @module
 */

import { defineComponent, h, onBeforeUnmount, type PropType, ref, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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
 * Record (idle/processed) → Pause/Resume + Stop (recording/paused). All button
 * labels and status text flow through `t()` with English `defaultValue`
 * fallbacks; drop in a companion locale bond to translate.
 *
 * Styling is delegated to `getClassMap()` — no Tailwind / raw class names.
 *
 * @param props - Component props (see {@link AudioRecorderProps}).
 * @returns The audio recorder component.
 */
export const AudioRecorder = defineComponent({
  name: 'AudioRecorder',
  props: {
    onRecorded: {
      type: Function as PropType<AudioRecorderProps['onRecorded']>,
      required: true,
    },
    onError: Function as PropType<AudioRecorderProps['onError']>,
    mimeType: String,
    maxDurationSeconds: {
      type: Number as PropType<number | undefined>,
      default: 0,
    },
    dataMolId: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    const state = ref<AudioRecorderState>('idle')
    const elapsed = ref(0)
    const errorMessage = ref<string | null>(null)

    let recorder: MediaRecorder | null = null
    let stream: MediaStream | null = null
    let chunks: Blob[] = []
    let tick: ReturnType<typeof setInterval> | null = null
    let startedAt = 0
    let pausedAccum = 0
    let pausedAt: number | null = null

    /**
     * Computes the final recording duration from the refs at stop time
     * (React's `elapsedFromRefs`).
     *
     * @returns Duration in whole seconds.
     */
    const elapsedFromRefs = (): number => {
      const now = Date.now()
      const pausedNow = pausedAt ? now - pausedAt : 0
      const totalPaused = pausedAccum + pausedNow
      return Math.max(0, Math.floor((now - startedAt - totalPaused) / 1000))
    }

    /** Stops the elapsed-time interval, if one is running. */
    const stopTick = (): void => {
      if (tick) {
        clearInterval(tick)
        tick = null
      }
    }

    /**
     * Starts the elapsed-time interval (React's `startTick`), auto-stopping
     * the recorder once the limit is reached.
     *
     * @param limit - The max duration captured when the recording started.
     */
    const startTick = (limit: number): void => {
      stopTick()
      tick = setInterval(() => {
        const now = Date.now()
        const totalPaused = pausedAccum + (pausedAt ? now - pausedAt : 0)
        const sec = Math.floor((now - startedAt - totalPaused) / 1000)
        elapsed.value = sec
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
    const handleStart = async (): Promise<void> => {
      errorMessage.value = null
      chunks = []
      pausedAccum = 0
      pausedAt = null

      const Ctor = getMediaRecorder()
      if (!Ctor) {
        const err = new Error('MediaRecorder is not supported in this environment')
        errorMessage.value = t(
          'audioRecorder.unsupported',
          {},
          { defaultValue: 'Audio recording is not supported in this browser' },
        )
        state.value = 'error'
        props.onError?.(err)
        return
      }

      const requestedMime = props.mimeType
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
          state.value = 'processed'
          props.onRecorded({ blob, mimeType: finalMime, durationSeconds: dur })
        })
        rec.addEventListener('error', () => {
          const err = new Error('Recording failed')
          errorMessage.value = t(
            'audioRecorder.error',
            {},
            {
              defaultValue: 'Recording failed. Please try again.',
            },
          )
          state.value = 'error'
          stopTick()
          props.onError?.(err)
        })

        startedAt = Date.now()
        elapsed.value = 0
        rec.start()
        startTick(props.maxDurationSeconds ?? 0)
        state.value = 'recording'
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Microphone permission denied')
        errorMessage.value = t(
          'audioRecorder.permissionDenied',
          {},
          { defaultValue: 'Microphone permission denied. Allow access and try again.' },
        )
        state.value = 'error'
        props.onError?.(e)
      }
    }

    /** Pauses a recording (React's `handlePause`). */
    const handlePause = (): void => {
      const rec = recorder
      if (!rec || rec.state !== 'recording') return
      try {
        rec.pause()
        pausedAt = Date.now()
        state.value = 'paused'
      } catch (err) {
        props.onError?.(err instanceof Error ? err : new Error('Pause failed'))
      }
    }

    /** Resumes a paused recording (React's `handleResume`). */
    const handleResume = (): void => {
      const rec = recorder
      if (!rec || rec.state !== 'paused') return
      try {
        rec.resume()
        if (pausedAt) {
          pausedAccum += Date.now() - pausedAt
          pausedAt = null
        }
        state.value = 'recording'
      } catch (err) {
        props.onError?.(err instanceof Error ? err : new Error('Resume failed'))
      }
    }

    /** Stops a recording (React's `handleStop`). */
    const handleStop = (): void => {
      const rec = recorder
      if (!rec) return
      if (rec.state === 'inactive') return
      try {
        rec.stop()
      } catch (err) {
        props.onError?.(err instanceof Error ? err : new Error('Stop failed'))
      }
    }

    // Cleanup on unmount.
    onBeforeUnmount(() => {
      stopTick()
      stream?.getTracks().forEach((tr) => tr.stop())
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch (_error) {
          // Best-effort cleanup on unmount; recorder may already be inactive or torn down.
        }
      }
    })

    /**
     * The recording dot's inline style — only what ClassMap cannot express
     * (React's `dotStyle`).
     *
     * @returns The dot's style declarations.
     */
    const dotStyle = (): Record<string, string> => ({
      display: 'inline-block',
      width: '10px',
      height: '10px',
      'border-radius': '50%',
      background:
        state.value === 'recording'
          ? 'var(--mol-color-error, #e11)'
          : 'var(--mol-color-on-surface-variant, #888)',
      'margin-right': '8px',
      'vertical-align': 'middle',
      ...(state.value === 'recording' ? { animation: 'mol-pulse 1.2s ease-in-out infinite' } : {}),
    })

    return (): VNode => {
      const recordLabel = t('audioRecorder.record', {}, { defaultValue: 'Record' })
      const pauseLabel = t('audioRecorder.pause', {}, { defaultValue: 'Pause' })
      const resumeLabel = t('audioRecorder.resume', {}, { defaultValue: 'Resume' })
      const stopLabel = t('audioRecorder.stop', {}, { defaultValue: 'Stop' })
      const elapsedLabel = t(
        'audioRecorder.elapsed',
        { time: formatDuration(elapsed.value) },
        { defaultValue: 'Elapsed {{time}}' },
      )
      const stateLabel =
        state.value === 'recording'
          ? t('audioRecorder.statusRecording', {}, { defaultValue: 'Recording' })
          : state.value === 'paused'
            ? t('audioRecorder.statusPaused', {}, { defaultValue: 'Paused' })
            : state.value === 'processed'
              ? t('audioRecorder.statusProcessed', {}, { defaultValue: 'Recorded' })
              : state.value === 'error'
                ? t('audioRecorder.statusError', {}, { defaultValue: 'Error' })
                : t('audioRecorder.statusIdle', {}, { defaultValue: 'Ready to record' })

      // Transport actions go through the design system so they match every
      // other labelled action in the app: Record is the one coloured call to
      // action (record-red), the rest are equal-weight outline controls.
      const recordClass = cm.cn(
        cm.button({ variant: 'solid', color: 'error', size: 'sm' }),
        cm.touchTargetCompact,
      )
      const transportClass = cm.cn(
        cm.button({ variant: 'outline', size: 'sm' }),
        cm.touchTargetCompact,
      )

      const showRecord =
        state.value === 'idle' || state.value === 'processed' || state.value === 'error'
      const showPause = state.value === 'recording'
      const showResume = state.value === 'paused'
      const showStop = state.value === 'recording' || state.value === 'paused'

      const wrapperClass = cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), props.className)

      const transport: VNode[] = []
      if (showRecord) {
        transport.push(
          h(
            'button',
            {
              type: 'button',
              onClick: () => void handleStart(),
              'aria-label': recordLabel,
              'data-action': 'record',
              'data-mol-id': 'audio-recorder-record',
              class: recordClass,
            },
            [recordLabel],
          ),
        )
      }
      if (showPause) {
        transport.push(
          h(
            'button',
            {
              type: 'button',
              onClick: handlePause,
              'aria-label': pauseLabel,
              'data-action': 'pause',
              'data-mol-id': 'audio-recorder-pause',
              class: transportClass,
            },
            [pauseLabel],
          ),
        )
      }
      if (showResume) {
        transport.push(
          h(
            'button',
            {
              type: 'button',
              onClick: handleResume,
              'aria-label': resumeLabel,
              'data-action': 'resume',
              'data-mol-id': 'audio-recorder-resume',
              class: transportClass,
            },
            [resumeLabel],
          ),
        )
      }
      if (showStop) {
        transport.push(
          h(
            'button',
            {
              type: 'button',
              onClick: handleStop,
              'aria-label': stopLabel,
              'data-action': 'stop',
              'data-mol-id': 'audio-recorder-stop',
              class: transportClass,
            },
            [stopLabel],
          ),
        )
      }

      return h(
        'div',
        {
          class: wrapperClass,
          'data-mol-id': props.dataMolId ?? 'audio-recorder',
          'data-state': state.value,
          role: 'group',
          'aria-label': t('audioRecorder.group', {}, { defaultValue: 'Audio recorder' }),
        },
        [
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            h('span', { 'aria-hidden': true, style: dotStyle() }),
            h(
              'span',
              {
                class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
                'data-mol-id': 'audio-recorder-status',
                'aria-live': 'polite',
              },
              [stateLabel],
            ),
            h(
              'span',
              {
                class: cm.textSize('sm'),
                'data-mol-id': 'audio-recorder-elapsed',
                'aria-label': elapsedLabel,
              },
              [formatDuration(elapsed.value)],
            ),
          ]),
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, transport),
          errorMessage.value
            ? h(
                'div',
                {
                  class: cm.textSize('sm'),
                  role: 'alert',
                  'data-mol-id': 'audio-recorder-error',
                  style: { color: 'var(--mol-color-error, #e11)' },
                },
                [errorMessage.value],
              )
            : null,
        ],
      )
    }
  },
})
