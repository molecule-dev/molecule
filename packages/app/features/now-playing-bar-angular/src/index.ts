/**
 * Angular persistent now-playing bar — track artwork, title/artist, transport
 * controls (prev/play-pause/next), scrubber, and volume slider.
 *
 * Angular counterpart of `@molecule/app-now-playing-bar-react`: the same
 * exports, the same props (React names), the same DOM for the same input. Used
 * by music-streaming, podcast, and audiobook apps as a sticky dock at the
 * bottom of the page (or panel) showing what's currently playing.
 *
 * Sticky positioning is intentionally NOT enforced inside the component — the
 * caller wraps `<div mol-now-playing-bar>` in their own `position: sticky` /
 * `position: fixed` container at whatever scope makes sense (page, layout
 * shell, panel).
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { NowPlayingBar } from '@molecule/app-now-playing-bar-angular'
 *
 * @Component({
 *   selector: 'app-player',
 *   standalone: true,
 *   imports: [NowPlayingBar],
 *   template: `
 *     <div style="position: sticky; bottom: 0">
 *       <div
 *         mol-now-playing-bar
 *         [track]="track"
 *         [isPlaying]="playing()"
 *         (onPlay)="playing.set(true)"
 *         (onPause)="playing.set(false)"
 *         [currentTime]="time()"
 *         [duration]="240"
 *         [onSeek]="setTime"
 *       ></div>
 *     </div>
 *   `,
 * })
 * export class Player {
 *   readonly track = { id: 't1', title: 'Untitled', artist: 'Various' }
 *   readonly playing = signal(false)
 *   readonly time = signal(0)
 *   readonly setTime = (seconds: number): void => this.time.set(seconds)
 * }
 * ```
 *
 * @remarks
 * Pair with `@molecule/app-locales-now-playing-bar` for translations in 79
 * languages. All styling routes through `getClassMap()`; all user-facing text
 * routes through `t()`.
 *
 * `track` is optional: leave it `null`/`undefined` when nothing is playing and
 * the bar renders a compact empty state ("Nothing playing") instead of
 * throwing, so you can leave it mounted rather than conditionally unmounting
 * it. Requires a wired ClassMap bond and the Angular binding's i18n provider —
 * `getClassMap()` and `useTranslation()` both throw before wiring. Transport
 * buttons render text glyphs (not an icon set), so their size tracks the app
 * font. The `trailing` node prop is projected content (`[slot=trailing]`).
 *
 * @module
 */

export * from './now-playing-bar.component.js'
export * from './types.js'
