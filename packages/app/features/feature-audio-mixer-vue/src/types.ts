/**
 * Types of the Vue channel-strip mixer — the same shapes
 * `@molecule/app-feature-audio-mixer-react` exports, so a consumer switches
 * framework by changing only the package name.
 *
 * @module
 */

/**
 * A single send target on a channel — points at another channel/bus by
 * id and carries a 0..1 send level. The mixer renders sends as a small
 * row of compact level controls under the channel strip.
 */
export interface Send {
  /** Stable identifier for the send (used as a list key + handler arg). */
  id: string
  /**
   * Optional human-readable target label. When omitted the mixer falls
   * back to the send id for accessibility. Locale bonds typically don't
   * translate this — it's user-authored bus naming.
   */
  label?: string
  /** Send level in the closed interval `[0, 1]`. Out-of-range clamps. */
  level: number
}

/**
 * One channel strip on the mixer console. The mixer is purely
 * presentational — `level` and `pan` are projected onto a fader and
 * pan knob, and the caller is expected to wire `onChannelChange`
 * callbacks back to a real audio engine (e.g. Tone.js, the Web Audio
 * API, native `AudioContext`).
 */
export interface Channel {
  /** Stable identifier for the channel (used as a list key + handler arg). */
  id: string
  /** Channel display name (already localized by the caller, if needed). */
  name: string
  /** Fader level in the closed interval `[0, 1]`. */
  level: number
  /** Pan position in the closed interval `[-1, 1]` (left to right). */
  pan: number
  /** Whether the channel is currently muted. */
  muted: boolean
  /** Whether the channel is currently solo'd. */
  solo: boolean
  /** Optional sends row (post-fader auxiliary sends). */
  sends?: Send[]
  /**
   * Optional accent color for the channel header strip. When omitted
   * the header uses an inherited text color so it adapts to themes.
   */
  color?: string
}

/**
 * Patch describing the changed fields for a single channel-change
 * event. Always carries the channel id; the touched field is set to
 * its new value and the rest are absent. `sendId` + `sendLevel` are
 * used together when a send fader moved.
 */
export interface ChannelChangePatch {
  /** Channel that changed. */
  id: string
  /** New fader level (only set when the main fader moved). */
  level?: number
  /** New pan position (only set when the pan knob moved). */
  pan?: number
  /** New mute state (only set when the mute button toggled). */
  muted?: boolean
  /** New solo state (only set when the solo button toggled). */
  solo?: boolean
  /** Send id (only set together with `sendLevel`). */
  sendId?: string
  /** New send level (only set together with `sendId`). */
  sendLevel?: number
}

/** Props accepted by the {@link AudioMixer} component. */
export interface AudioMixerProps {
  /** Channels rendered as columns from left to right. Order is preserved. */
  channels: Channel[]
  /**
   * Called for every user-initiated change with a partial patch
   * describing which field moved. Faders/knobs emit a stream of
   * patches as the user drags; mute/solo emit a single patch on
   * click.
   */
  onChannelChange?: (patch: ChannelChangePatch) => void
  /**
   * Optional master channel — rendered as a final, visually-separated
   * column. The master strip omits the sends row but otherwise
   * behaves like a regular channel.
   */
  master?: Channel
  /**
   * Called when the master channel changes (only fires when `master`
   * is supplied). Same patch shape as `onChannelChange`.
   */
  onMasterChange?: (patch: ChannelChangePatch) => void
  /** Pixel height of the fader column. Defaults to 180. */
  faderHeight?: number
  /** Extra classes merged onto the root element. */
  className?: string
}
