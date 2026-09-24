/**
 * Horizontal track-lane primitive for multi-track timelines (music DAW,
 * video editor, animation tool). Renders one lane row of draggable +
 * resizable clip blocks on a `pixelsPerSecond` time axis.
 *
 * Exports `<TrackLane>` and the `Clip` type, plus the pure-function
 * helpers `clipToPixels`, `pixelsToTime`, and `clampClipMove` that
 * back the pointer-event drag/resize math.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type Clip, TrackLane } from '@molecule/app-feature-track-lane-react'
 *
 * export function DrumTrack() {
 *   const [clips, setClips] = useState<Clip[]>([
 *     { id: 'kick', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
 *     { id: 'snare', startTime: 4, duration: 1.5, label: 'Snare' },
 *   ])
 *   const [selectedId, setSelectedId] = useState<string>()
 *   const updateClip = (id: string, patch: Partial<Clip>) =>
 *     setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
 *   return (
 *     <TrackLane
 *       name="Drums"
 *       clips={clips}
 *       pixelsPerSecond={20}
 *       onClipMove={(id, startTime) => updateClip(id, { startTime })}
 *       onClipResize={(id, duration) => updateClip(id, { duration })}
 *       onClipClick={setSelectedId}
 *       selectedClipId={selectedId}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - The package name is `@molecule/app-feature-track-lane-react` (note the
 *   `feature-` segment).
 * - It is CONTROLLED: dragging only CALLS `onClipMove(id, startTime)` /
 *   `onClipResize(id, duration)` (repeatedly, during the drag) — write the
 *   value back into your `clips` state or the clip snaps back. Selection is
 *   likewise yours (`selectedClipId` + `onClipClick`).
 * - Times are SECONDS (not ms or beats); `pixelsPerSecond` (default 20)
 *   sets the zoom. Moves clamp at 0 and resizes at
 *   `MIN_CLIP_DURATION_SECONDS` (0.05); there is no upper bound, no snapping
 *   and no overlap/collision prevention — enforce those in your handlers.
 * - It renders ONE lane with no time ruler or playhead; stack several
 *   `<TrackLane lane="…">` rows yourself (the `lane` id is passed back to
 *   every handler). Clips are pointer-only — no keyboard move/resize.
 * - Must render inside `<I18nProvider>` / `<MoleculeProvider>`
 *   (`useTranslation()` throws otherwise) with a ClassMap bond wired
 *   (`setClassMap(classMap)` from `@molecule/app-ui`). Aria labels use
 *   `trackLane.*` keys (companion bond:
 *   `@molecule/app-locales-feature-track-lane`).
 *
 * @module
 */

export * from './TrackLane.js'
