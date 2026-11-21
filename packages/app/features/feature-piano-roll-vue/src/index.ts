/**
 * Vue piano roll — MIDI note-grid editor for music-daw and other DAW-style
 * surfaces. Renders a vertical piano keyboard on the left, a horizontal time
 * grid on the right, and draggable / resizable note rectangles on top.
 *
 * - Click an empty grid cell to paint a new note (snapped to the configured
 *   grid resolution).
 * - Drag a note body to move it horizontally (time) and vertically (pitch);
 *   both axes snap.
 * - Drag the right-edge handle on a note to resize it.
 * - Right-click a note to delete it.
 *
 * Vue counterpart of `@molecule/app-feature-piano-roll-react`: the same props
 * (React names), the same DOM for the same input, and the same callback calls,
 * so an app switches framework by changing only the package name it imports.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { PianoRoll, type MidiNote } from '@molecule/app-feature-piano-roll-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const notes = ref<MidiNote[]>([])
 *     return () =>
 *       h(PianoRoll, {
 *         notes: notes.value,
 *         snap: '1/16',
 *         onNoteAdd: (note: MidiNote) => {
 *           notes.value = [...notes.value, note]
 *         },
 *         onNoteMove: (noteId: string, startBeat: number, pitch: number) => {
 *           notes.value = notes.value.map((note) =>
 *             note.id === noteId ? { ...note, startBeat, pitch } : note,
 *           )
 *         },
 *         onNoteResize: (noteId: string, durationBeats: number) => {
 *           notes.value = notes.value.map((note) =>
 *             note.id === noteId ? { ...note, durationBeats } : note,
 *           )
 *         },
 *         onNoteDelete: (noteId: string) => {
 *           notes.value = notes.value.filter((note) => note.id !== noteId)
 *         },
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
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
export * from './PianoRoll.js'
export * from './types.js'
