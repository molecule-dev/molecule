/**
 * HTML5 audio player chrome — play/pause, scrub bar, elapsed/total time,
 * and a mute toggle, over a hidden `<audio>` element. Use for podcasts,
 * voice notes, music previews, narrated lessons.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { AudioPlayer } from '@molecule/app-audio-player-react'
 * import { useTranslation } from '@molecule/app-react'
 *
 * export function EpisodePlayer() {
 *   const { t } = useTranslation()
 *   const [finished, setFinished] = useState(false)
 *   return (
 *     <section>
 *       <AudioPlayer
 *         src="/audio/episode-42.mp3"
 *         title="Episode 42: Getting Started"
 *         subtitle="The Molecule Podcast"
 *         onPlay={() => setFinished(false)}
 *         onEnded={() => setFinished(true)}
 *       />
 *       {finished && <p>{t('common.completed', undefined, { defaultValue: 'Completed' })}</p>}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * There is NO volume slider — only a mute toggle; and no playback-rate
 * or skip controls. The optional `visualizer` prop is a free-form node
 * slot rendered above the controls (bring your own waveform). `autoPlay`
 * is passed to the `<audio>` element and is routinely blocked by
 * browsers until user interaction — never rely on it. Duration renders
 * `0:00` until `loadedmetadata` fires (`preload="metadata"`).
 * Translations come from the companion `@molecule/app-locales-audio-player`
 * locale bond.
 *
 * It calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 * inside `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise);
 * `getClassMap()` throws unless `setClassMap(classMap)` ran at startup, and the
 * buttons are `Button` from `@molecule/app-ui-react`. Playback state is
 * internal — there is no `playing`/`currentTime` prop to control it from
 * outside; react to `onPlay` / `onPause` / `onEnded` instead. `src` must be a
 * URL the browser can fetch directly (it does not sign or proxy uploads).
 *
 * @module
 */

export * from './AudioPlayer.js'
