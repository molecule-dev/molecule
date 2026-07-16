/**
 * Persistent now-playing bar — track artwork, title/artist, transport
 * controls (prev/play-pause/next), scrubber, and volume slider.
 *
 * Used by music-streaming, podcast, and audiobook apps as a sticky
 * dock at the bottom of the page (or panel) showing what's currently
 * playing.
 *
 * Sticky positioning is intentionally NOT enforced inside the component —
 * the caller wraps `<NowPlayingBar>` in their own `position: sticky` /
 * `position: fixed` container at whatever scope makes sense (page,
 * layout shell, panel).
 *
 * @example
 * ```tsx
 * import { NowPlayingBar } from '@molecule/app-now-playing-bar-react'
 *
 * <div style={{ position: 'sticky', bottom: 0 }}>
 *   <NowPlayingBar
 *     track={{ id: 't1', title: 'Untitled', artist: 'Various' }}
 *     isPlaying={playing}
 *     onPlay={() => setPlaying(true)}
 *     onPause={() => setPlaying(false)}
 *     currentTime={time}
 *     duration={duration}
 *     onSeek={setTime}
 *     volume={vol}
 *     onVolumeChange={setVol}
 *   />
 * </div>
 * ```
 *
 * @remarks
 * Pair with `@molecule/app-locales-now-playing-bar` for translations
 * in 79 languages. All styling routes through `getClassMap()`; all
 * user-facing text routes through `t()`.
 *
 * `track` is REQUIRED — hide the bar (conditional render) when nothing
 * is playing; the component does not accept null. Requires a wired
 * ClassMap bond and a React `I18nProvider` ancestor — `getClassMap()`
 * and `useTranslation()` both throw before wiring. Transport buttons
 * render text glyphs (not an icon set), so their size tracks the app
 * font.
 *
 * @module
 */

export * from './NowPlayingBar.js'
