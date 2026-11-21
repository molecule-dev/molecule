/**
 * Types for the Svelte HTML5 video player.
 *
 * @module
 */

/** Props accepted by the {@link VideoPlayer} component. */
export interface VideoPlayerProps {
  /** Video URL. */
  src: string
  /** Optional poster image URL. */
  poster?: string
  /** Caption track URL (.vtt). */
  captionsSrc?: string
  /** Caption language code. */
  captionsLang?: string
  /**
   * Human-readable name of the captions track (the track's `label`, which
   * screen readers and the browser's caption menu announce). Defaults
   * through i18n (`video.captions`, English "Captions").
   */
  captionsLabel?: string
  /** Autoplay (must be muted to work in most browsers). */
  autoPlay?: boolean
  /** Initial muted state. */
  defaultMuted?: boolean
  /** Called when the media starts playing. */
  onPlay?: () => void
  /** Called when the media is paused. */
  onPause?: () => void
  /** Called when the media reaches its end. */
  onEnded?: () => void
  /** Extra classes. */
  className?: string
}
