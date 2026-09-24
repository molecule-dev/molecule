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
 * import { useRef, useState } from 'react'
 *
 * import { NowPlayingBar, type NowPlayingTrack } from '@molecule/app-now-playing-bar-react'
 *
 * const queue: NowPlayingTrack[] = [
 *   { id: 't1', title: 'Morning Light', artist: 'The Aurora Band', artwork: '/covers/morning-light.jpg' },
 *   { id: 't2', title: 'Night Drive', artist: 'Neon Coast' },
 * ]
 *
 * export function Player() {
 *   const audioRef = useRef<HTMLAudioElement>(null)
 *   const [index, setIndex] = useState(0)
 *   const [isPlaying, setIsPlaying] = useState(false)
 *   const [time, setTime] = useState(0)
 *   const [duration, setDuration] = useState(0)
 *   const [volume, setVolume] = useState(0.8)
 *   const track = queue[index] ?? null
 *   return (
 *     <>
 *       <audio
 *         ref={audioRef}
 *         src={track ? `/audio/${track.id}.mp3` : undefined}
 *         onPlay={() => setIsPlaying(true)}
 *         onPause={() => setIsPlaying(false)}
 *         onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
 *         onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
 *       />
 *       <NowPlayingBar
 *         track={track}
 *         isPlaying={isPlaying}
 *         onPlay={() => audioRef.current?.play().catch((error: unknown) => console.warn('Playback blocked', error))}
 *         onPause={() => audioRef.current?.pause()}
 *         onPrev={index > 0 ? () => setIndex(index - 1) : undefined}
 *         onNext={index < queue.length - 1 ? () => setIndex(index + 1) : undefined}
 *         currentTime={time} // seconds
 *         duration={duration} // seconds
 *         onSeek={(seconds) => { if (audioRef.current) audioRef.current.currentTime = seconds }}
 *         volume={volume} // 0..1
 *         onVolumeChange={(v) => { setVolume(v); if (audioRef.current) audioRef.current.volume = v }}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * Pair with `@molecule/app-locales-now-playing-bar` for translations
 * in 79 languages. All styling routes through `getClassMap()`; all
 * user-facing text routes through `t()`.
 *
 * It plays NOTHING itself — no `<audio>` element, no queue. Drive a media element (or player
 * SDK) yourself and feed its state back in: `isPlaying` should follow the element's
 * `play`/`pause` events, not the button press. `currentTime`/`duration` are SECONDS (not ms)
 * and `volume` is `0..1` (not 0..100). Prev/next buttons render only when `onPrev`/`onNext`
 * are passed; the volume slider only when BOTH `volume` and `onVolumeChange` are.
 *
 * `track` is optional: pass `null`/`undefined` (or omit it) when nothing
 * is playing and the bar renders a compact empty state ("Nothing
 * playing") instead of throwing, so you can leave it mounted rather than
 * conditionally unmounting it. Requires a wired ClassMap bond and a React
 * `I18nProvider` ancestor — `getClassMap()` and `useTranslation()` both
 * throw before wiring. Transport buttons render text glyphs (not an icon
 * set), so their size tracks the app font.
 *
 * @module
 */

export * from './NowPlayingBar.js'
