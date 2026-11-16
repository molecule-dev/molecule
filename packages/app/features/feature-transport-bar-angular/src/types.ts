/**
 * Types of `@molecule/app-feature-transport-bar-angular` — the Angular
 * counterpart of `@molecule/app-feature-transport-bar-react`, same props and
 * DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link TransportBar} — the same props
 * `@molecule/app-feature-transport-bar-react` accepts. Node props
 * (`timeDisplay`, `children`) are projected content in Angular (an input
 * cannot carry a node), so they are typed `unknown`: pass them in the host
 * template, not as values.
 */
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
   * renders but is `disabled`. Defaults to `true` when omitted.
   */
  canStop?: boolean
  /**
   * Whether the skip-back / skip-forward buttons are enabled. When `false`,
   * the buttons still render but are `disabled`. Defaults to `true` when
   * omitted. Skip buttons only render when their respective `onSkipBack` /
   * `onSkipForward` handlers are provided.
   */
  canSkip?: boolean
  /**
   * Whether loop playback is currently engaged. Drives the loop button's
   * `aria-pressed` state. The loop button itself renders only when
   * `onLoopToggle` is provided.
   */
  loop?: boolean
  /** Toggle play / pause. Required. */
  onPlayToggle: (event: Event) => void
  /** Stop playback (resets to start). Required. */
  onStop: (event: Event) => void
  /** Skip to the previous marker / start of clip. Optional. */
  onSkipBack?: (event: Event) => void
  /** Skip to the next marker / end of clip. Optional. */
  onSkipForward?: (event: Event) => void
  /** Toggle record mode. Optional — when omitted no record button is rendered. */
  onRecordToggle?: (event: Event) => void
  /** Toggle loop mode. Optional — when omitted no loop button is rendered. */
  onLoopToggle?: (event: Event) => void
  /**
   * Optional time-display slot, projected as `[slot=timeDisplay]` content (or
   * passed as a `TemplateRef` / text input). Takes precedence over
   * `children`.
   */
  timeDisplay?: unknown
  /** Optional time-display slot, projected as the element's default content. */
  children?: unknown
  /** Extra classes merged onto the root element. */
  className?: string
}
