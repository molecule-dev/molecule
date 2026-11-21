/**
 * Solid channel-strip mixer console for music-DAW and similar audio tools.
 *
 * Renders one column per channel — name header, vertical fader, pan
 * knob, mute/solo buttons, optional sends row — plus an optional
 * master column. Pure UI: callers wire the emitted change patches
 * back to a real audio engine (Tone.js, the Web Audio API, native
 * `AudioContext`, etc.).
 *
 * Exports `AudioMixer`, the `Channel` / `Send` / `ChannelChangePatch`
 * shapes consumed by callers, the `MIN_LEVEL` / `MAX_LEVEL` / `MIN_PAN`
 * / `MAX_PAN` constants, and the `clampLevel` / `clampPan` helpers
 * used internally to constrain user input.
 *
 * It is the Solid counterpart of `@molecule/app-feature-audio-mixer-react`:
 * the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { AudioMixer } from '@molecule/app-feature-audio-mixer-solid'
 *
 * export function Mixer() {
 *   const engine = useEngine()
 *   return (
 *     <AudioMixer
 *       channels={[
 *         { id: 'drums', name: 'Drums', level: 0.8, pan: -0.2, muted: false, solo: false },
 *         { id: 'bass', name: 'Bass', level: 0.7, pan: 0, muted: false, solo: false },
 *       ]}
 *       master={{ id: 'master', name: 'Master', level: 0.9, pan: 0, muted: false, solo: false }}
 *       onChannelChange={(patch) => engine.applyChannelPatch(patch)}
 *       onMasterChange={(patch) => engine.applyChannelPatch(patch)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * All user-visible text routes through the companion locale bond
 * `@molecule/app-locales-feature-audio-mixer`. Styling routes
 * through `getClassMap()` from `@molecule/app-ui` — no utility class
 * names appear in this package.
 *
 * @module
 */

export * from './AudioMixer.jsx'
export * from './types.js'
export * from './utilities.js'
