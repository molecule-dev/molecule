/**
 * Svelte transport bar — play / pause / stop / record / skip / loop controls
 * for editor playback (music DAW, video editor, animation tool).
 *
 * Exports `TransportBar`. All styling routes through `getClassMap()`
 * and all button labels translate via the companion
 * `@molecule/app-locales-feature-transport-bar` locale bond. It is the Svelte
 * counterpart of `@molecule/app-feature-transport-bar-react`: the same props,
 * the same DOM for the same input, and the same callbacks.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { TransportBar } from '@molecule/app-feature-transport-bar-svelte'
 *
 *   let playing = $state(false)
 *   let recording = $state(false)
 *   let loop = $state(false)
 * </script>
 *
 * <TransportBar
 *   isPlaying={playing}
 *   isRecording={recording}
 *   {loop}
 *   onPlayToggle={() => (playing = !playing)}
 *   onStop={() => (playing = false)}
 *   onRecordToggle={() => (recording = !recording)}
 *   onLoopToggle={() => (loop = !loop)}
 *   timeDisplay="0:42 / 3:10"
 * />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise).
 * - All user-visible text (button labels) routes through `t()` via the
 *   companion `@molecule/app-locales-feature-transport-bar` locale bond.
 * - `timeDisplay` is React's optional time-display slot; it takes precedence
 *   over the default content (`children`), which fills the same slot when
 *   `timeDisplay` is omitted.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
