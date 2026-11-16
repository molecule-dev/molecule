/**
 * Types for the Vue playback transport bar.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Transport-bar component props. */
export interface TransportBarProps {
  /**
   * Whether playback is currently running. Drives the play / pause toggle
   * button's icon, label, and `aria-pressed` state.
   */
  isPlaying: boolean
  /**
   * Whether recording is currently armed / running. Drives the record
   * button's icon, label, and `aria-pressed` state. The record button
   * itself renders only when `onRecordToggle` is provided.
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
   * Whether loop playback is currently engaged. Drives the loop
   * button's `aria-pressed` state. The loop button itself renders only
   * when `onLoopToggle` is provided.
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
   * use: `current / total` time). Takes precedence over `children`. Passed
   * as a prop or as the same-named slot — both work.
   */
  timeDisplay?: VNodeChild
  /**
   * Optional time-display slot — the DEFAULT slot. Equivalent to
   * `timeDisplay`; ignored when `timeDisplay` is set.
   */
  children?: VNodeChild
  /** Extra classes merged onto the root element. */
  className?: string
}
