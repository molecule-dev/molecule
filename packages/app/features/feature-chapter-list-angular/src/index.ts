/**
 * Angular chapter list — the counterpart of
 * `@molecule/app-feature-chapter-list-react`: the same exports, the same props
 * (React names) and the same DOM for the same input.
 *
 * Used by podcast and video-streaming surfaces for in-episode chapter
 * navigation. `<ChapterList>` (`mol-chapter-list`) renders a scrollable list of
 * chapters with seek-to-on-click and a progress highlight for the chapter the
 * playhead is currently inside.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ChapterList } from '@molecule/app-feature-chapter-list-angular'
 *
 * @Component({
 *   selector: 'app-player',
 *   standalone: true,
 *   imports: [ChapterList],
 *   template: `
 *     <mol-chapter-list
 *       [chapters]="chapters"
 *       [currentTime]="currentTime"
 *       [onSeek]="seek"
 *     ></mol-chapter-list>
 *   `,
 * })
 * export class Player {
 *   currentTime = 150
 *   chapters = [
 *     { id: 'c1', title: 'Intro', startTime: 0 },
 *     { id: 'c2', title: 'Topic A', startTime: 120, thumbnail: '/a.jpg' },
 *     { id: 'c3', title: 'Outro', startTime: 1800 },
 *   ]
 *
 *   seek = (startTime: number): void => {
 *     this.currentTime = startTime
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`setClassMap()` at startup) and an i18n
 *   provider (for the region, empty-state and row labels) or rendering throws.
 * - The active chapter is the last one whose `startTime` is `<= currentTime`;
 *   it carries `data-active="true"` and `aria-current="true"` plus the
 *   "Now playing" badge.
 * - When `onSeek` is omitted the rows render as static, non-interactive
 *   elements. `rowTrailing` is a `TemplateRef` whose context carries the row's
 *   chapter as `a0` (React's `rowTrailing(chapter)`), for a trailing slot such
 *   as a download button.
 * - Translations live in the companion
 *   `@molecule/app-locales-feature-chapter-list` bond.
 *
 * @module
 */

export * from './chapter-list.component.js'
export * from './timestamps.js'
export * from './types.js'
