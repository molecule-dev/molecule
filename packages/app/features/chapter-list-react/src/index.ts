/**
 * Chapter list — scrollable list of chapters with seek-to-on-click and a
 * progress highlight for the chapter the playhead is currently inside.
 *
 * Used by podcast and video-streaming surfaces for in-episode chapter
 * navigation.
 *
 * @example
 * ```tsx
 * import { useRef, useState } from 'react'
 *
 * import { ChapterList } from '@molecule/app-feature-chapter-list-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as chapterListLocales from '@molecule/app-locales-feature-chapter-list'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(chapterListLocales)
 *
 * const chapters = [
 *   { id: 'c1', title: 'Intro', startTime: 0 },
 *   { id: 'c2', title: 'Interview', startTime: 120, thumbnail: '/episodes/42/guest.jpg' },
 *   { id: 'c3', title: 'Listener questions', startTime: 1800 },
 * ]
 *
 * export function EpisodePlayer() {
 *   const audio = useRef<HTMLAudioElement>(null)
 *   const [currentTime, setCurrentTime] = useState(0)
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       <audio
 *         ref={audio}
 *         src="/episodes/42.mp3"
 *         controls
 *         onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
 *       />
 *       <ChapterList
 *         chapters={chapters}
 *         currentTime={currentTime}
 *         onSeek={(seconds) => {
 *           if (audio.current) audio.current.currentTime = seconds
 *         }}
 *       />
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **It does not play or seek anything.** `onSeek(startTime)` only reports
 *   the clicked chapter's start (in SECONDS, not ms); you set your player's
 *   position. It does not read the player either: feed `currentTime`
 *   (seconds) from the player's `timeupdate` or the highlight never moves.
 * - Chapters are NOT sorted — pass them in ascending `startTime` order; the
 *   active chapter is the last one with `startTime <= currentTime`.
 * - Without `onSeek` the rows are static (not buttons). An empty `chapters`
 *   array renders a translated "No chapters" message.
 * - It calls `useTranslation()` from `@molecule/app-react` (throws without an
 *   `I18nProvider` / `MoleculeProvider i18n` above it) and `getClassMap()`
 *   (throws until `setClassMap(...)` ran).
 *
 * @module
 */

export * from './ChapterList.js'
