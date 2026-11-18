/**
 * AudioRecorder component (React parity).
 *
 * @module
 */

import { ChangeDetectorRef, Component, inject, type OnDestroy, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
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
 * finishes recording. Pure browser API; no upload, no transcription.
 *
 * The host IS the outer `<div>` (`div[mol-audio-recorder]`), matching React's
 * root exactly, so the wrapper's ClassMap classes and the `data-mol-id`,
 * `data-state`, `role` and `aria-label` attributes are the host's. The status
 * row, the transport buttons and the error line render inside it, in React's
 * order.
 *
 * State lives in signals so the async paths (the interval tick, the recorder's
 * `stop` / `error` events) re-render the host without a zone, exactly as
 * React's `useState` does.
 */
@Component({
  selector: 'div[mol-audio-recorder]',
  standalone: true,
  inputs: ['onRecorded', 'onError', 'mimeType', 'maxDurationSeconds', 'dataMolId', 'className'],
  host: {
    role: 'group',
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? "audio-recorder"',
    '[attr.data-state]': 'state()',
    '[attr.aria-label]': 'groupLabel()',
  },
  // prettier-ignore
  template: `<div [class]="rowClasses()"><span aria-hidden="true" [style]="dotStyle()"></span><span [class]="statusClasses()" data-mol-id="audio-recorder-status" aria-live="polite">{{ stateLabel() }}</span><span [class]="elapsedClasses()" data-mol-id="audio-recorder-elapsed" [attr.aria-label]="elapsedLabel()">{{ elapsedText() }}</span></div><div [class]="rowClasses()">@if (showRecord()) {<button type="button" (click)="handleStart()" [attr.aria-label]="recordLabel()" data-action="record" data-mol-id="audio-recorder-record" [class]="recordClass()">{{ recordLabel() }}</button>}@if (showPause()) {<button type="button" (click)="handlePause()" [attr.aria-label]="pauseLabel()" data-action="pause" data-mol-id="audio-recorder-pause" [class]="transportClass()">{{ pauseLabel() }}</button>}@if (showResume()) {<button type="button" (click)="handleResume()" [attr.aria-label]="resumeLabel()" data-action="resume" data-mol-id="audio-recorder-resume" [class]="transportClass()">{{ resumeLabel() }}</button>}@if (showStop()) {<button type="button" (click)="handleStop()" [attr.aria-label]="stopLabel()" data-action="stop" data-mol-id="audio-recorder-stop" [class]="transportClass()">{{ stopLabel() }}</button>}</div>@if (errorMessage()) {<div [class]="errorClasses()" role="alert" data-mol-id="audio-recorder-error" [style]="errorStyle()">{{ errorMessage() }}</div>}`,
})
export class AudioRecorder implements OnDestroy {
  /** Called once the user stops recording and a Blob is ready. */
  onRecorded?: AudioRecorderProps['onRecorded']
  /** Called whenever a recording error occurs. */
  onError?: AudioRecorderProps['onError']
  /** Optional MIME type to request from MediaRecorder. */
  mimeType?: string
  /** Maximum recording duration (seconds); `0` (the default) means unlimited. */
  maxDurationSeconds?: number
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes on the outer wrapper (the host element). */
  className?: string

  /** The recorder lifecycle state (React's `state`). */
  readonly state = signal<AudioRecorderState>('idle')
  /** The elapsed recording time in whole seconds (React's `elapsed`). */
  readonly elapsed = signal(0)
  /** The translated error text, or null (React's `errorMessage`). */
  readonly errorMessage = signal<string | null>(null)

  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private tick: ReturnType<typeof setInterval> | null = null
  private startedAt = 0
  private pausedAccum = 0
  private pausedAt: number | null = null

  private readonly cd = inject(ChangeDetectorRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale notifications, so the view re-renders the labels on a switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /** Stops the interval and releases the mic stream (React's unmount cleanup). */
  ngOnDestroy(): void {
    this.stopTick()
    this.stream?.getTracks().forEach((tr) => tr.stop())
    if (this.recorder && this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop()
      } catch (_error) {
        // Best-effort cleanup on unmount; recorder may already be inactive or torn down.
      }
    }
  }

  /**
   * Computes the wrapper class list (React's
   * `cn(flex({ direction: 'col', gap: 'xs' }), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ direction: 'col', gap: 'xs' }), this.className)
  }

  /**
   * A row's class list (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The status badge's classes (React's
   * `cn(textSize('sm'), fontWeight('semibold'))`).
   * @returns The class string.
   */
  statusClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The elapsed readout's classes (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  elapsedClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The error line's classes (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  errorClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The Record button's classes (React's
   * `cn(button({ variant: 'solid', color: 'error', size: 'sm' }), touchTargetCompact)`).
   * @returns The class string.
   */
  recordClass(): string {
    return this.cm().cn(
      this.cm().button({ variant: 'solid', color: 'error', size: 'sm' }),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * A transport button's classes (React's
   * `cn(button({ variant: 'outline', size: 'sm' }), touchTargetCompact)`).
   * @returns The class string.
   */
  transportClass(): string {
    return this.cm().cn(
      this.cm().button({ variant: 'outline', size: 'sm' }),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * The recording dot's inline style — only what ClassMap cannot express
   * (React's `dotStyle`).
   * @returns The dot's style declarations.
   */
  dotStyle(): Record<string, string> {
    const recording = this.state() === 'recording'
    return {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      'border-radius': '50%',
      background: recording
        ? 'var(--mol-color-error, #e11)'
        : 'var(--mol-color-on-surface-variant, #888)',
      'margin-right': '8px',
      'vertical-align': 'middle',
      ...(recording ? { animation: 'mol-pulse 1.2s ease-in-out infinite' } : {}),
    }
  }

  /**
   * The error line's inline style (React's `style={{ color: ... }}`).
   * @returns The style declarations.
   */
  errorStyle(): Record<string, string> {
    return { color: 'var(--mol-color-error, #e11)' }
  }

  /**
   * Whether the Record button shows (React's `showRecord`).
   * @returns True in idle, processed and error states.
   */
  showRecord(): boolean {
    const state = this.state()
    return state === 'idle' || state === 'processed' || state === 'error'
  }

  /**
   * Whether the Pause button shows (React's `showPause`).
   * @returns True while recording.
   */
  showPause(): boolean {
    return this.state() === 'recording'
  }

  /**
   * Whether the Resume button shows (React's `showResume`).
   * @returns True while paused.
   */
  showResume(): boolean {
    return this.state() === 'paused'
  }

  /**
   * Whether the Stop button shows (React's `showStop`).
   * @returns True while recording or paused.
   */
  showStop(): boolean {
    const state = this.state()
    return state === 'recording' || state === 'paused'
  }

  /**
   * The wrapper's accessible name (React's `t('audioRecorder.group')`).
   * @returns The translated label.
   */
  groupLabel(): string {
    return this.i18n.t('audioRecorder.group', {}, { defaultValue: 'Audio recorder' })
  }

  /**
   * The Record button's label.
   * @returns The translated label.
   */
  recordLabel(): string {
    return this.i18n.t('audioRecorder.record', {}, { defaultValue: 'Record' })
  }

  /**
   * The Pause button's label.
   * @returns The translated label.
   */
  pauseLabel(): string {
    return this.i18n.t('audioRecorder.pause', {}, { defaultValue: 'Pause' })
  }

  /**
   * The Resume button's label.
   * @returns The translated label.
   */
  resumeLabel(): string {
    return this.i18n.t('audioRecorder.resume', {}, { defaultValue: 'Resume' })
  }

  /**
   * The Stop button's label.
   * @returns The translated label.
   */
  stopLabel(): string {
    return this.i18n.t('audioRecorder.stop', {}, { defaultValue: 'Stop' })
  }

  /**
   * The elapsed readout's accessible name (React's `elapsedLabel`).
   * @returns The translated label.
   */
  elapsedLabel(): string {
    return this.i18n.t(
      'audioRecorder.elapsed',
      { time: formatDuration(this.elapsed()) },
      { defaultValue: 'Elapsed {{time}}' },
    )
  }

  /**
   * The elapsed readout's text (React's `formatDuration(elapsed)`).
   * @returns The formatted elapsed time.
   */
  elapsedText(): string {
    return formatDuration(this.elapsed())
  }

  /**
   * The status badge's text (React's `stateLabel`).
   * @returns The translated status text.
   */
  stateLabel(): string {
    const state = this.state()
    return state === 'recording'
      ? this.i18n.t('audioRecorder.statusRecording', {}, { defaultValue: 'Recording' })
      : state === 'paused'
        ? this.i18n.t('audioRecorder.statusPaused', {}, { defaultValue: 'Paused' })
        : state === 'processed'
          ? this.i18n.t('audioRecorder.statusProcessed', {}, { defaultValue: 'Recorded' })
          : state === 'error'
            ? this.i18n.t('audioRecorder.statusError', {}, { defaultValue: 'Error' })
            : this.i18n.t('audioRecorder.statusIdle', {}, { defaultValue: 'Ready to record' })
  }

  /**
   * Computes the final recording duration from the refs at stop time (React's
   * `elapsedFromRefs`).
   * @returns Duration in whole seconds.
   */
  private elapsedFromRefs(): number {
    const now = Date.now()
    const pausedNow = this.pausedAt ? now - this.pausedAt : 0
    const totalPaused = this.pausedAccum + pausedNow
    return Math.max(0, Math.floor((now - this.startedAt - totalPaused) / 1000))
  }

  /** Stops the elapsed-time interval, if one is running. */
  private stopTick(): void {
    if (this.tick) {
      clearInterval(this.tick)
      this.tick = null
    }
  }

  /**
   * Starts the elapsed-time interval (React's `startTick`), auto-stopping the
   * recorder once the limit is reached.
   * @param limit - The max duration captured when the recording started.
   */
  private startTick(limit: number): void {
    this.stopTick()
    this.tick = setInterval(() => {
      const now = Date.now()
      const totalPaused = this.pausedAccum + (this.pausedAt ? now - this.pausedAt : 0)
      const sec = Math.floor((now - this.startedAt - totalPaused) / 1000)
      this.elapsed.set(sec)
      if (limit > 0 && sec >= limit) {
        // Auto-stop.
        try {
          this.recorder?.stop()
        } catch (_error) {
          // Best-effort auto-stop at max duration; recorder may have already stopped or been torn down.
        }
      }
    }, 250)
  }

  /** Starts a recording (React's `handleStart`): mic permission, then MediaRecorder. */
  async handleStart(): Promise<void> {
    this.errorMessage.set(null)
    this.chunks = []
    this.pausedAccum = 0
    this.pausedAt = null

    const Ctor = getMediaRecorder()
    if (!Ctor) {
      const err = new Error('MediaRecorder is not supported in this environment')
      this.errorMessage.set(
        this.i18n.t(
          'audioRecorder.unsupported',
          {},
          { defaultValue: 'Audio recording is not supported in this browser' },
        ),
      )
      this.state.set('error')
      this.onError?.(err)
      return
    }

    const requestedMime = this.mimeType
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
      this.stream = nextStream

      const opts: MediaRecorderOptions | undefined = requestedMime
        ? { mimeType: requestedMime }
        : undefined
      const rec = new Ctor(nextStream, opts)
      this.recorder = rec

      rec.addEventListener('dataavailable', (e: BlobEvent) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data)
      })
      rec.addEventListener('stop', () => {
        this.stopTick()
        const finalMime = rec.mimeType || requestedMime || 'audio/webm'
        const blob = new Blob(this.chunks, { type: finalMime })
        const dur = this.elapsedFromRefs()
        // Tear down stream tracks so the OS mic indicator turns off.
        this.stream?.getTracks().forEach((tr) => tr.stop())
        this.stream = null
        this.recorder = null
        this.state.set('processed')
        this.onRecorded?.({ blob, mimeType: finalMime, durationSeconds: dur })
      })
      rec.addEventListener('error', () => {
        const err = new Error('Recording failed')
        this.errorMessage.set(
          this.i18n.t(
            'audioRecorder.error',
            {},
            {
              defaultValue: 'Recording failed. Please try again.',
            },
          ),
        )
        this.state.set('error')
        this.stopTick()
        this.onError?.(err)
      })

      this.startedAt = Date.now()
      this.elapsed.set(0)
      rec.start()
      this.startTick(this.maxDurationSeconds ?? 0)
      this.state.set('recording')
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Microphone permission denied')
      this.errorMessage.set(
        this.i18n.t(
          'audioRecorder.permissionDenied',
          {},
          { defaultValue: 'Microphone permission denied. Allow access and try again.' },
        ),
      )
      this.state.set('error')
      this.onError?.(e)
    }
    this.cd.markForCheck()
  }

  /** Pauses a recording (React's `handlePause`). */
  handlePause(): void {
    const rec = this.recorder
    if (!rec || rec.state !== 'recording') return
    try {
      rec.pause()
      this.pausedAt = Date.now()
      this.state.set('paused')
    } catch (err) {
      this.onError?.(err instanceof Error ? err : new Error('Pause failed'))
    }
  }

  /** Resumes a paused recording (React's `handleResume`). */
  handleResume(): void {
    const rec = this.recorder
    if (!rec || rec.state !== 'paused') return
    try {
      rec.resume()
      if (this.pausedAt) {
        this.pausedAccum += Date.now() - this.pausedAt
        this.pausedAt = null
      }
      this.state.set('recording')
    } catch (err) {
      this.onError?.(err instanceof Error ? err : new Error('Resume failed'))
    }
  }

  /** Stops a recording (React's `handleStop`). */
  handleStop(): void {
    const rec = this.recorder
    if (!rec) return
    if (rec.state === 'inactive') return
    try {
      rec.stop()
    } catch (err) {
      this.onError?.(err instanceof Error ? err : new Error('Stop failed'))
    }
  }
}
