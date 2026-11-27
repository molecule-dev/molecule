/**
 * Types of `@molecule/app-audio-player-angular` — the Angular counterpart of
 * `@molecule/app-audio-player-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link AudioPlayer} — the same props
 * `@molecule/app-audio-player-react` accepts. Node props (`title`, `subtitle`,
 * `visualizer`) are projected content in Angular (an input cannot carry a
 * node), so they are typed `unknown`: pass them in the host template as
 * `[slot=title]` / `[slot=subtitle]` / `[slot=visualizer]` content, or a plain
 * string as the input.
 */
export interface AudioPlayerProps {
  /** Audio source URL (a file, a stream or a data URI). */
  src: string
  /** Optional title / track name, projected as `[slot=title]` content or a plain string. */
  title?: unknown
  /** Optional artist / source label, projected as `[slot=subtitle]` content or a plain string. */
  subtitle?: unknown
  /** Optional waveform / visualizer, projected as `[slot=visualizer]` content. */
  visualizer?: unknown
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
