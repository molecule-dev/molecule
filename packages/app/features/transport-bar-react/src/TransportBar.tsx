import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Transport-bar component props. */
export interface TransportBarProps {
  /**
   * Whether playback is currently running. Drives the play / pause toggle
   * button's icon, label, and `aria-pressed` state.
   */
  isPlaying: boolean
  /**
   * Whether recording is currently armed / running. When defined, the
   * record button is rendered. Drives the record button's icon, label,
   * and `aria-pressed` state.
   */
  isRecording?: boolean
  /**
   * Whether the stop button is enabled. When `false`, the button still
   * renders but is `disabled` (use this to communicate that there is
   * nothing to stop). Defaults to `true` when omitted.
   */
  canStop?: boolean
  /**
   * Whether the skip-back / skip-forward buttons are enabled. When
   * `false`, the buttons still render but are `disabled`. Defaults to
   * `true` when omitted. Skip buttons only render when their respective
   * `onSkipBack` / `onSkipForward` handlers are provided.
   */
  canSkip?: boolean
  /**
   * Whether loop playback is currently engaged. When defined, the loop
   * toggle button is rendered. Drives the loop button's `aria-pressed`
   * state.
   */
  loop?: boolean
  /** Toggle play / pause. Required. */
  onPlayToggle: () => void
  /** Stop playback (resets to start). Required. */
  onStop: () => void
  /** Skip to the previous marker / start of clip. Optional. */
  onSkipBack?: () => void
  /** Skip to the next marker / end of clip. Optional. */
  onSkipForward?: () => void
  /** Toggle record mode. Optional — when omitted no record button is rendered. */
  onRecordToggle?: () => void
  /** Toggle loop mode. Optional — when omitted no loop button is rendered. */
  onLoopToggle?: () => void
  /**
   * Optional time-display slot rendered alongside the controls (typical
   * use: `current / total` time). Takes precedence over `children`.
   */
  timeDisplay?: ReactNode
  /**
   * Optional time-display slot. Equivalent to `timeDisplay` — provided
   * for ergonomic JSX nesting. Ignored when `timeDisplay` is set.
   */
  children?: ReactNode
  /** Extra classes merged onto the root element. */
  className?: string
}

/**
 * Transport-control bar (play / pause / stop / record / skip / loop)
 * used by music-daw + video-editor surfaces for editor playback
 * control. Renders a horizontal bar of buttons with semantic icons and
 * fully translated `aria-label`s; an optional time-display slot lets
 * callers render the current playhead position / total duration without
 * coupling the bar to any specific time-format library.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text (button labels) routes through `t()`
 * via the companion `@molecule/app-locales-feature-transport-bar`
 * locale bond.
 *
 * @param props - Component props.
 * @returns The transport-bar element.
 */
export function TransportBar(props: TransportBarProps): JSX.Element {
  const {
    isPlaying,
    isRecording,
    canStop = true,
    canSkip = true,
    loop,
    onPlayToggle,
    onStop,
    onSkipBack,
    onSkipForward,
    onRecordToggle,
    onLoopToggle,
    timeDisplay,
    children,
    className,
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const regionLabel = t(
    'transportBar.aria.region',
    {},
    { defaultValue: 'Playback transport controls' },
  )
  const skipBackLabel = t('transportBar.aria.skipBack', {}, { defaultValue: 'Skip backward' })
  const skipForwardLabel = t('transportBar.aria.skipForward', {}, { defaultValue: 'Skip forward' })
  const playLabel = t('transportBar.aria.play', {}, { defaultValue: 'Play' })
  const pauseLabel = t('transportBar.aria.pause', {}, { defaultValue: 'Pause' })
  const stopLabel = t('transportBar.aria.stop', {}, { defaultValue: 'Stop' })
  const recordLabel = t('transportBar.aria.record', {}, { defaultValue: 'Record' })
  const stopRecordingLabel = t(
    'transportBar.aria.stopRecording',
    {},
    { defaultValue: 'Stop recording' },
  )
  const loopOnLabel = t('transportBar.aria.loopOn', {}, { defaultValue: 'Disable loop' })
  const loopOffLabel = t('transportBar.aria.loopOff', {}, { defaultValue: 'Enable loop' })

  const slot = timeDisplay ?? children

  // Plain button shell — neutralizes browser chrome so cm classes drive
  // the visual look. Inline styles are limited to properties ClassMap
  // does not expose (background:transparent, border:none) per the
  // architecture rule about not duplicating ClassMap-managed properties.
  const buttonBaseStyle = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  } as const

  return (
    <div
      role="toolbar"
      aria-label={regionLabel}
      data-mol-id="transport-bar"
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 2), className)}
    >
      {onSkipBack && (
        <button
          type="button"
          onClick={onSkipBack}
          disabled={!canSkip}
          aria-label={skipBackLabel}
          data-mol-id="transport-bar-skip-back"
          className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
          style={buttonBaseStyle}
        >
          <span aria-hidden="true">{'⏮'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={onPlayToggle}
        aria-label={isPlaying ? pauseLabel : playLabel}
        aria-pressed={isPlaying}
        data-mol-id="transport-bar-play-toggle"
        data-state={isPlaying ? 'playing' : 'paused'}
        className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
        style={buttonBaseStyle}
      >
        <span aria-hidden="true">{isPlaying ? '⏸' : '▶'}</span>
      </button>

      <button
        type="button"
        onClick={onStop}
        disabled={!canStop}
        aria-label={stopLabel}
        data-mol-id="transport-bar-stop"
        className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
        style={buttonBaseStyle}
      >
        <span aria-hidden="true">{'⏹'}</span>
      </button>

      {onSkipForward && (
        <button
          type="button"
          onClick={onSkipForward}
          disabled={!canSkip}
          aria-label={skipForwardLabel}
          data-mol-id="transport-bar-skip-forward"
          className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
          style={buttonBaseStyle}
        >
          <span aria-hidden="true">{'⏭'}</span>
        </button>
      )}

      {onRecordToggle && (
        <button
          type="button"
          onClick={onRecordToggle}
          aria-label={isRecording ? stopRecordingLabel : recordLabel}
          aria-pressed={!!isRecording}
          data-mol-id="transport-bar-record-toggle"
          data-state={isRecording ? 'recording' : 'idle'}
          className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
          style={buttonBaseStyle}
        >
          <span aria-hidden="true">{'●'}</span>
        </button>
      )}

      {onLoopToggle && (
        <button
          type="button"
          onClick={onLoopToggle}
          aria-label={loop ? loopOnLabel : loopOffLabel}
          aria-pressed={!!loop}
          data-mol-id="transport-bar-loop-toggle"
          data-state={loop ? 'on' : 'off'}
          className={cm.cn(cm.cursorPointer, cm.sp('p', 1))}
          style={buttonBaseStyle}
        >
          <span aria-hidden="true">{'↻'}</span>
        </button>
      )}

      {slot && (
        <div
          data-mol-id="transport-bar-time-display"
          className={cm.cn(cm.textSize('sm'), cm.sp('px', 2))}
        >
          {slot}
        </div>
      )}
    </div>
  )
}
