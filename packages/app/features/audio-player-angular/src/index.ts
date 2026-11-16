/**
 * Angular HTML5 audio player chrome — play/pause, scrub bar, elapsed/total
 * time, and a mute toggle, over a hidden `<audio>` element. Use for podcasts,
 * voice notes, music previews, narrated lessons.
 *
 * Exports `<AudioPlayer>` — the Angular counterpart of
 * `@molecule/app-audio-player-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AudioPlayer } from '@molecule/app-audio-player-angular'
 *
 * @Component({
 *   selector: 'app-player',
 *   standalone: true,
 *   imports: [AudioPlayer],
 *   template: `
 *     <div
 *       mol-audio-player
 *       src="/audio/episode-42.mp3"
 *       title="Episode 42: Getting Started"
 *       subtitle="The Molecule Podcast"
 *       (onPlay)="log('playing')"
 *       (onEnded)="log('finished')"
 *     ></div>
 *   `,
 * })
 * export class Player {}
 * ```
 *
 * @remarks
 * There is NO volume slider — only a mute toggle; and no playback-rate
 * or skip controls. The optional `visualizer` is projected `[slot=visualizer]`
 * content rendered above the controls (bring your own waveform). `autoPlay` is
 * passed to the `<audio>` element and is routinely blocked by browsers until
 * user interaction — never rely on it. Duration renders `0:00` until
 * `loadedmetadata` fires (`preload="metadata"`). Translations come from the
 * companion `@molecule/app-locales-audio-player` locale bond. Node props
 * (`title`, `subtitle`, `visualizer`) are projected content: `[slot=title]`,
 * `[slot=subtitle]`, `[slot=visualizer]`.
 *
 * @module
 */

export * from './audio-player.component.js'
export * from './types.js'
