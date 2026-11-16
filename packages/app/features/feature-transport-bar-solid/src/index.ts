/**
 * Solid transport bar — play / pause / stop / record / skip / loop controls
 * for editor playback (music DAW, video editor, animation tool).
 *
 * Exports `TransportBar`. All styling routes through `getClassMap()`
 * and all button labels translate via the companion
 * `@molecule/app-locales-feature-transport-bar` locale bond. It is the Solid
 * counterpart of `@molecule/app-feature-transport-bar-react`: the same props,
 * the same DOM for the same input, and the same callbacks.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { TransportBar } from '@molecule/app-feature-transport-bar-solid'
 *
 * export function EditorTransport() {
 *   const [playing, setPlaying] = createSignal(false)
 *   const [recording, setRecording] = createSignal(false)
 *   const [loop, setLoop] = createSignal(false)
 *   return (
 *     <TransportBar
 *       isPlaying={playing()}
 *       isRecording={recording()}
 *       loop={loop()}
 *       onPlayToggle={() => setPlaying(!playing())}
 *       onStop={() => setPlaying(false)}
 *       onRecordToggle={() => setRecording(!recording())}
 *       onLoopToggle={() => setLoop(!loop())}
 *       timeDisplay="0:42 / 3:10"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise).
 * - All user-visible text (button labels) routes through `t()` via the
 *   companion `@molecule/app-locales-feature-transport-bar` locale bond.
 * - `timeDisplay` is React's optional time-display slot; it takes precedence
 *   over `children`, which fills the same slot when `timeDisplay` is omitted.
 *
 * @module
 */

export * from './TransportBar.jsx'
export * from './types.js'
