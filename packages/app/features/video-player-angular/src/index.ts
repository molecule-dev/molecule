/**
 * Angular HTML5 video player chrome — the counterpart of
 * `@molecule/app-video-player-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `VideoPlayer` — a `<video>` element wrapped with custom
 * ClassMap-styled controls: play/pause, scrub bar, elapsed/total time, mute
 * toggle, fullscreen, optional caption track.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { VideoPlayer } from '@molecule/app-video-player-angular'
 *
 * @Component({
 *   selector: 'app-player',
 *   standalone: true,
 *   imports: [VideoPlayer],
 *   template: `
 *     <div
 *       mol-video-player
 *       src="https://cdn.example.com/intro.mp4"
 *       poster="https://cdn.example.com/intro-thumb.jpg"
 *       captionsSrc="https://cdn.example.com/intro.vtt"
 *     ></div>
 *   `,
 * })
 * export class Player {}
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
 * The host IS the root `<div>` (attribute selector `div[mol-video-player]`),
 * so the wrapper's classes and inline style are the host's.
 *
 * @module
 */

export * from './types.js'
export * from './video-player.component.js'
