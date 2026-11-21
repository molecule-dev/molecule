/**
 * Solid piano roll — MIDI note-grid editor for music-daw and other DAW-style
 * surfaces. Renders a vertical piano keyboard on the left, a horizontal time
 * grid on the right, and draggable / resizable note rectangles on top.
 *
 * Solid counterpart of `@molecule/app-feature-piano-roll-react`: the same props
 * (React names), the same DOM for the same input, and the same callback calls,
 * so an app switches framework by changing only the package name it imports.
 *
 * @example
 * ```tsx
 * import { createSignal, For } from 'solid-js'
 * import { PianoRoll, type MidiNote } from '@molecule/app-feature-piano-roll-solid'
 *
 * export function Roll() {
 *   const [notes, setNotes] = createSignal<MidiNote[]>([])
 *
 *   return (
 *     <PianoRoll
 *       notes={notes()}
 *       snap="1/16"
 *       onNoteAdd={(note) => setNotes((all) => [...all, note])}
 *       onNoteMove={(noteId, startBeat, pitch) =>
 *         setNotes((all) => all.map((n) => (n.id === noteId ? { ...n, startBeat, pitch } : n)))
 *       }
 *       onNoteResize={(noteId, durationBeats) =>
 *         setNotes((all) => all.map((n) => (n.id === noteId ? { ...n, durationBeats } : n)))
 *       }
 *       onNoteDelete={(noteId) => setNotes((all) => all.filter((n) => n.id !== noteId))}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`cm.cn`, `cm.cursorPointer`, …) — rendering
 *   throws otherwise. No router dependency.
 * - Every visible string comes from `useTranslation()` (`pianoRoll.aria.*`)
 *   via the companion `@molecule/app-locales-feature-piano-roll` locale bond,
 *   so a locale switch re-renders it.
 * - The grid is focusable and paints from the keyboard (arrow keys move the
 *   cell cursor, Enter / Space paints), exactly as React's.
 *
 * @module
 */

export * from './geometry.js'
export * from './PianoRoll.jsx'
export * from './types.js'
