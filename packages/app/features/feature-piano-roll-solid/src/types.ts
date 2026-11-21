/**
 * Types of the Solid piano roll — the same props (React names) and the same DOM
 * for the same input as `@molecule/app-feature-piano-roll-react`.
 *
 * @module
 */

/**
 * A single MIDI note rendered on the piano roll. `pitch` is a standard MIDI
 * pitch number in the closed interval `[0, 127]` where `60` represents middle C
 * (`C4`). `startBeat` is the note's start position on the time grid, and
 * `durationBeats` is its length in beats. `id` is a stable identifier used as
 * the row key and as the argument passed back to all event handlers.
 * `velocity` is an optional MIDI velocity in the closed interval `[0, 127]`
 * (defaults to a neutral mid-range).
 */
export interface MidiNote {
  /** Stable identifier for the note (used as the row key + handler arg). */
  id: string
  /** MIDI pitch number, `0..127`. `60` is middle C. */
  pitch: number
  /** Start beat on the timeline (>= 0). */
  startBeat: number
  /** Duration in beats (always positive — minimum is enforced). */
  durationBeats: number
  /** Optional MIDI velocity, `0..127`. */
  velocity?: number
}

/**
 * Snap resolution for note placement / movement / resize. Each value is a
 * fraction of a beat: `'1/16'` is sixteenth-notes (a quarter of a beat), `'1/4'`
 * is quarter-notes (one beat), `'1'` snaps to whole beats with no
 * sub-divisions, etc.
 */
export type PianoRollSnap = '1/16' | '1/8' | '1/4' | '1/2' | '1'

/** Props accepted by the {@link PianoRoll} component. */
export interface PianoRollProps {
  /** MIDI notes rendered on the grid. Order is preserved as-is. */
  notes: MidiNote[]
  /** Horizontal scale: pixels rendered per musical beat. Defaults to `80`. */
  pixelsPerBeat?: number
  /** Vertical row height per pitch in pixels. Defaults to `20`. */
  noteHeight?: number
  /** Lowest visible pitch (top-most row excluded — see `highestPitch`). Defaults to `21` (A0). */
  lowestPitch?: number
  /** Highest visible pitch (top-most row inclusive). Defaults to `108` (C8). */
  highestPitch?: number
  /** Snap resolution applied to clicks, drags, and resizes. Defaults to `'1/16'`. */
  snap?: PianoRollSnap
  /**
   * Total beats rendered in the time grid. When omitted, the grid extends to
   * cover all notes plus a small trailing pad (minimum 16 beats so empty rolls
   * are still usable).
   */
  beatsCount?: number
  /**
   * Called with a freshly-created note when the user paints an empty cell — by
   * clicking it, or via the keyboard cell cursor (arrow keys to move, Enter /
   * Space to paint).
   */
  onNoteAdd?: (note: MidiNote) => void
  /** Called with the updated note when a note is dragged horizontally / vertically. */
  onNoteMove?: (noteId: string, startBeat: number, pitch: number) => void
  /** Called with the updated duration when a note's right-edge handle is dragged. */
  onNoteResize?: (noteId: string, durationBeats: number) => void
  /** Called when the user right-clicks a note. */
  onNoteDelete?: (noteId: string) => void
  /** Extra classes merged onto the root element. */
  className?: string
}
