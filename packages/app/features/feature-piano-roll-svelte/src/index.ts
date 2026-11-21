/**
 * Svelte piano roll — MIDI note-grid editor for music-daw and other DAW-style
 * surfaces. Renders a vertical piano keyboard on the left, a horizontal time
 * grid on the right, and draggable / resizable note rectangles on top.
 *
 * Svelte counterpart of `@molecule/app-feature-piano-roll-react`: the same props
 * (React names), the same DOM for the same input, and the same callback calls,
 * so an app switches framework by changing only the package name it imports.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { PianoRoll, type MidiNote } from '@molecule/app-feature-piano-roll-svelte'
 *
 *   let notes = $state<MidiNote[]>([])
 * </script>
 *
 * <PianoRoll
 *   {notes}
 *   snap="1/16"
 *   onNoteAdd={(note) => (notes = [...notes, note])}
 *   onNoteMove={(noteId, startBeat, pitch) =>
 *     (notes = notes.map((n) => (n.id === noteId ? { ...n, startBeat, pitch } : n)))}
 *   onNoteResize={(noteId, durationBeats) =>
 *     (notes = notes.map((n) => (n.id === noteId ? { ...n, durationBeats } : n)))}
 *   onNoteDelete={(noteId) => (notes = notes.filter((n) => n.id !== noteId))}
 * />
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

export * from './components.js'
export * from './geometry.js'
export * from './types.js'
