/**
 * HTML5 video player chrome.
 *
 * Exports `<VideoPlayer>` — a `<video>` element wrapped with custom
 * ClassMap-styled controls: play/pause, scrub bar, elapsed/total time,
 * mute toggle, fullscreen, captions track.
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
 * UI. Buttons use emoji glyphs (▶ ⏸ 🔇 🔊 ⛶). Every accessible name goes
 * through i18n — `t('video.play')` / `t('video.pause')`, `t('video.seek')`,
 * `t('video.mute')` / `t('video.unmute')`, `t('video.fullscreen')` and
 * `t('video.captions')` — with inline English defaults (the on-disk
 * `@molecule/app-locales-video-player` bond carries only the two play/pause
 * keys and is not registered yet). `autoPlay` also forces the
 * initial state to muted (browser autoplay policy); `captionsLang`
 * defaults to 'en', and the captions `<track>` renders on every `<video>`
 * (with no `captionsSrc` it is a captions track with no source yet), its
 * accessible name through `t('video.captions')`. Single `src` URL only —
 * no multi-source/quality list.
 * Props (documented on the exported `VideoPlayerProps` interface): src,
 * poster, captionsSrc, captionsLang, captionsLabel, autoPlay,
 * defaultMuted, onPlay, onPause, onEnded, className.
 *
 * @module
 */

export * from './VideoPlayer.js'
