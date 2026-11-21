/**
 * Angular piano roll — MIDI note-grid editor for music-daw and other
 * DAW-style surfaces. Renders a vertical piano keyboard on the left, a
 * horizontal time grid on the right, and draggable / resizable note rectangles
 * on top.
 *
 * Angular counterpart of `@molecule/app-feature-piano-roll-react`: the same
 * props (React names), the same DOM for the same input, and the same callback
 * calls, so an app switches framework by changing only the package name it
 * imports.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { PianoRoll, type MidiNote } from '@molecule/app-feature-piano-roll-angular'
 *
 * @Component({
 *   selector: 'app-roll',
 *   standalone: true,
 *   imports: [PianoRoll],
 *   template: `
 *     <div
 *       mol-piano-roll
 *       [notes]="notes"
 *       snap="1/16"
 *       [onNoteAdd]="addNote"
 *       [onNoteMove]="moveNote"
 *       [onNoteResize]="resizeNote"
 *       [onNoteDelete]="deleteNote"
 *     ></div>
 *   `,
 * })
 * export class Roll {
 *   notes: MidiNote[] = []
 *   addNote = (note: MidiNote): void => {
 *     this.notes = [...this.notes, note]
 *   }
 *   moveNote = (noteId: string, startBeat: number, pitch: number): void => {
 *     this.notes = this.notes.map((n) => (n.id === noteId ? { ...n, startBeat, pitch } : n))
 *   }
 *   resizeNote = (noteId: string, durationBeats: number): void => {
 *     this.notes = this.notes.map((n) => (n.id === noteId ? { ...n, durationBeats } : n))
 *   }
 *   deleteNote = (noteId: string): void => {
 *     this.notes = this.notes.filter((n) => n.id !== noteId)
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`cm.cn`, `cm.cursorPointer`, …) — rendering
 *   throws otherwise. No router dependency.
 * - The host IS React's root `<div>` (`div[mol-piano-roll]`).
 * - Every visible string comes from `useTranslation()` (`pianoRoll.aria.*`)
 *   via the companion `@molecule/app-locales-feature-piano-roll` locale bond,
 *   so a locale switch re-renders it.
 * - The grid is focusable and paints from the keyboard (arrow keys move the
 *   cell cursor, Enter / Space paints), exactly as React's.
 *
 * @module
 */

export * from './geometry.js'
export * from './piano-roll.component.js'
export * from './types.js'
