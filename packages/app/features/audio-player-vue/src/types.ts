/**
 * Types for the Vue HTML5 audio player.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link AudioPlayer} component. */
export interface AudioPlayerProps {
  /** Audio source URL (a file, a stream or a data URI). */
  src: string
  /**
   * Optional title / track name. Passed as a prop or as the same-named slot —
   * both work.
   */
  title?: VNodeChild
  /**
   * Optional artist / source label. Passed as a prop or as the same-named slot
   * — both work.
   */
  subtitle?: VNodeChild
  /**
   * Optional waveform / visualizer slot rendered above the controls. Passed as
   * a prop or as the same-named slot — both work.
   */
  visualizer?: VNodeChild
  /**
   * WebVTT captions file URL. When set, the player loads it on the media
   * element's captions `<track>` and shows the current caption under the
   * controls, in a polite live region that screen readers announce. Without
   * it the track is empty and no caption line is shown.
   */
  captions?: string
  /** BCP 47 language for the captions track and the visible caption text. */
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
