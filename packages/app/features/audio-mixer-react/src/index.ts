/**
 * Channel-strip mixer console for music-DAW and similar audio tools.
 *
 * Renders one column per channel — name header, vertical fader, pan
 * knob, mute/solo buttons, optional sends row — plus an optional
 * master column. Pure UI: callers wire the emitted change patches
 * back to a real audio engine (Tone.js, the Web Audio API, native
 * `AudioContext`, etc.).
 *
 * Exports `<AudioMixer>`, the `Channel` / `Send` / `ChannelChangePatch`
 * shapes consumed by callers, the `MIN_LEVEL` / `MAX_LEVEL` / `MIN_PAN`
 * / `MAX_PAN` constants, and the `clampLevel` / `clampPan` helpers
 * used internally to constrain user input.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import {
 *   AudioMixer,
 *   type Channel,
 *   type ChannelChangePatch,
 * } from '@molecule/app-feature-audio-mixer-react'
 *
 * export function MixerPanel() {
 *   const [channels, setChannels] = useState<Channel[]>([
 *     { id: 'drums', name: 'Drums', level: 0.8, pan: -0.2, muted: false, solo: false },
 *     { id: 'bass', name: 'Bass', level: 0.7, pan: 0, muted: false, solo: false },
 *   ])
 *   const [master, setMaster] = useState<Channel>(
 *     { id: 'master', name: 'Master', level: 0.9, pan: 0, muted: false, solo: false },
 *   )
 *   const applyPatch = (patch: ChannelChangePatch) =>
 *     setChannels((list) => list.map((ch) => (ch.id === patch.id ? { ...ch, ...patch } : ch)))
 *   return (
 *     <AudioMixer
 *       channels={channels}
 *       master={master}
 *       onChannelChange={applyPatch}
 *       onMasterChange={(patch) => setMaster((m) => ({ ...m, ...patch }))}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * All user-visible text routes through the companion locale bond
 * `@molecule/app-locales-feature-audio-mixer`. Styling routes
 * through `getClassMap()` from `@molecule/app-ui` — no Tailwind
 * utility class names appear in this package.
 *
 * - **Pure UI, fully controlled.** It makes NO sound and stores nothing: every
 *   fader / pan / mute / solo move only fires `onChannelChange` (or
 *   `onMasterChange` for the master strip) with a PATCH such as
 *   `{ id, level }` — merge it into your state (and audio engine) or the
 *   control snaps back. A send move is `{ id, sendId, sendLevel }`, which you
 *   must apply to the matching entry in `channel.sends` yourself.
 * - `level` and send levels are linear `0..1` gain (not dB); `pan` is
 *   `-1..1`. Emitted values are clamped to those ranges.
 * - Solo/mute are just flags — the mixer does not silence other channels when
 *   one is solo'd; implement solo logic in your engine.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 *   inside `<I18nProvider>` / `<MoleculeProvider>`; `getClassMap()` throws
 *   unless `setClassMap(classMap)` ran at startup.
 *
 * @module
 */

export * from './AudioMixer.js'
