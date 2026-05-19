/**
 * Transport bar — play / pause / stop / record / skip / loop controls
 * for editor playback (music DAW, video editor, animation tool).
 *
 * Exports `<TransportBar>`. All styling routes through `getClassMap()`
 * and all button labels translate via the companion
 * `@molecule/app-locales-feature-transport-bar` locale bond.
 *
 * @example
 * ```tsx
 * import { TransportBar } from '@molecule/app-feature-transport-bar-react'
 *
 * <TransportBar
 *   isPlaying={state.playing}
 *   isRecording={state.recording}
 *   loop={state.loop}
 *   onPlayToggle={() => setPlaying(!state.playing)}
 *   onStop={() => stop()}
 *   onSkipBack={() => seek(0)}
 *   onSkipForward={() => seek(end)}
 *   onRecordToggle={() => setRecording(!state.recording)}
 *   onLoopToggle={() => setLoop(!state.loop)}
 *   timeDisplay={`${fmt(state.t)} / ${fmt(state.duration)}`}
 * />
 * ```
 *
 * @module
 */

export * from './TransportBar.js'
