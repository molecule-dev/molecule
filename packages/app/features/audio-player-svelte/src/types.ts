/**
 * Types for the Svelte HTML5 audio player.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A React-node-valued prop: a Svelte snippet (the same-named slot, or a node
 * list), or a plain value passed verbatim as text. Internal — the package's
 * public surface is the same as React's.
 */
type AudioPlayerNodeProp = Snippet | string | number | boolean | null | undefined

/** Props accepted by the {@link AudioPlayer} component. */
export interface AudioPlayerProps {
  /** Audio source URL (a file, a stream or a data URI). */
  src: string
  /** Optional title / track name. */
  title?: AudioPlayerNodeProp
  /** Optional artist / source label. */
  subtitle?: AudioPlayerNodeProp
  /** Optional waveform / visualizer slot rendered above the controls. */
  visualizer?: AudioPlayerNodeProp
  /**
   * WebVTT captions file URL. When set, the player loads it on the media
   * element's captions `<track>` and shows the current caption under the
   * controls, in a polite live region that screen readers announce. Without
   * it the track is empty and no caption line is shown.
   */
  captions?: string
  /** BCP 47 language of the captions (the track's `srclang`). */
  captionsLang?: string
  /**
   * Human-readable name of the captions track. Defaults through i18n
   * (`audio.captions`, English "Captions").
   */
  captionsLabel?: string
  /** Initial muted state. */
  defaultMuted?: boolean
  /** Autoplay (browser may block). Passed to the `<audio>` element. */
  autoPlay?: boolean
  /** Called when the media starts playing. */
  onPlay?: () => void
  /** Called when the media is paused. */
  onPause?: () => void
  /** Called when the media reaches its end. */
  onEnded?: () => void
  /** Extra classes on the outer wrapper. */
  className?: string
}
