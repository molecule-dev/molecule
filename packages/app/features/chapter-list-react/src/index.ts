/**
 * Chapter list — scrollable list of chapters with seek-to-on-click and a
 * progress highlight for the chapter the playhead is currently inside.
 *
 * Used by podcast and video-streaming surfaces for in-episode chapter
 * navigation.
 *
 * @example
 * ```tsx
 * import { ChapterList } from '@molecule/app-feature-chapter-list-react'
 *
 * <ChapterList
 *   chapters={[
 *     { id: 'c1', title: 'Intro', startTime: 0 },
 *     { id: 'c2', title: 'Topic A', startTime: 120, thumbnail: '/a.jpg' },
 *     { id: 'c3', title: 'Outro', startTime: 1800 },
 *   ]}
 *   currentTime={150}
 *   onSeek={(s) => audio.currentTime = s}
 * />
 * ```
 *
 * @module
 */

export * from './ChapterList.js'
