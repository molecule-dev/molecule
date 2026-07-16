/**
 * HTML5 video player chrome.
 *
 * Exports `<VideoPlayer>` — a `<video>` element wrapped with custom
 * ClassMap-styled controls: play/pause, scrub bar, elapsed/total time,
 * mute toggle, fullscreen, optional caption track.
 *
 * @example
 * ```tsx
 * import { VideoPlayer } from '@molecule/app-video-player-react'
 *
 * <VideoPlayer
 *   src="https://cdn.example.com/intro.mp4"
 *   poster="https://cdn.example.com/intro-thumb.jpg"
 *   captionsSrc="https://cdn.example.com/intro.vtt"
 *   onEnded={() => console.log('watched to the end')}
 * />
 * ```
 *
 * @remarks
 * Renders its own `<video>` element directly — it does NOT use
 * `@molecule/app-video`'s provider system; reach for that package when you
 * need an imperative, provider-swappable player. Volume control is a MUTE
 * TOGGLE only (no slider), and there is no PiP / playback-rate / quality
 * UI. Buttons use emoji glyphs (▶ ⏸ 🔇 🔊 ⛶). Only the Play/Pause labels
 * go through `t('video.play')` / `t('video.pause')`; the 'Seek',
 * 'Mute'/'Unmute' and 'Fullscreen' aria-labels are hardcoded English (the
 * on-disk `@molecule/app-locales-video-player` bond carries only the two
 * play/pause keys and is not registered yet). `autoPlay` also forces the
 * initial state to muted (browser autoplay policy); `captionsLang`
 * defaults to 'en'. Single `src` URL only — no multi-source/quality list.
 * Props (documented on the exported `VideoPlayerProps` interface): src,
 * poster, captionsSrc, captionsLang, autoPlay, defaultMuted, onPlay,
 * onPause, onEnded, className.
 *
 * @module
 */

export * from './VideoPlayer.js'
