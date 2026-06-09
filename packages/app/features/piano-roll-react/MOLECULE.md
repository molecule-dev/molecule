# @molecule/app-feature-piano-roll-react

Piano roll — MIDI note-grid editor for music-daw and other DAW-style
surfaces. Renders a vertical piano keyboard on the left, a horizontal
time grid on the right, and draggable / resizable note rectangles
on top.

- Click an empty grid cell to paint a new note (snapped to the
  configured grid resolution).
- Drag a note body to move it horizontally (time) and vertically
  (pitch); both axes snap.
- Drag the right-edge handle on a note to resize it.
- Right-click a note to delete it.

## Quick Start

```tsx
import { PianoRoll, type MidiNote } from '@molecule/app-feature-piano-roll-react'

const [notes, setNotes] = useState<MidiNote[]>([])

<PianoRoll
  notes={notes}
  onNoteAdd={(n) => setNotes((all) => [...all, n])}
  onNoteMove={(id, startBeat, pitch) =>
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, startBeat, pitch } : n)))
  }
  onNoteResize={(id, durationBeats) =>
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, durationBeats } : n)))
  }
  onNoteDelete={(id) => setNotes((all) => all.filter((n) => n.id !== id))}
  snap="1/16"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-piano-roll-react
```

## API

### Interfaces

#### `MidiNote`

A single MIDI note rendered on the piano roll. `pitch` is a standard
MIDI pitch number in the closed interval `[0, 127]` where `60`
represents middle C (`C4`). `startBeat` is the note's start position
on the time grid, and `durationBeats` is its length in beats. `id` is
a stable identifier used as the React key and as the argument passed
back to all event handlers. `velocity` is an optional MIDI velocity
in the closed interval `[0, 127]` (defaults to a neutral mid-range).

```typescript
interface MidiNote {
  /** Stable identifier for the note (used as a React key + handler arg). */
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
```

#### `PianoRollProps`

Props for `<PianoRoll>`.

```typescript
interface PianoRollProps {
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
   * Total beats rendered in the time grid. When omitted, the grid
   * extends to cover all notes plus a small trailing pad (minimum 16
   * beats so empty rolls are still usable).
   */
  beatsCount?: number
  /** Called with a freshly-created note when the user clicks an empty cell. */
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
```

### Types

#### `PianoRollSnap`

Snap resolution for note placement / movement / resize. Each value is
a fraction of a beat: `'1/16'` is sixteenth-notes (a quarter of a
beat), `'1/4'` is quarter-notes (one beat), `'1'` snaps to whole
beats with no sub-divisions, etc.

```typescript
type PianoRollSnap = '1/16' | '1/8' | '1/4' | '1/2' | '1'
```

### Functions

#### `beatsToPixels(beats, pixelsPerBeat)`

Convert a beat value into pixels given the horizontal scale.

```typescript
function beatsToPixels(beats: number, pixelsPerBeat: number): number
```

- `beats` — Beat value.
- `pixelsPerBeat` — Horizontal scale.

**Returns:** Pixel offset.

#### `isBlackKey(pitch)`

Determine whether a MIDI pitch corresponds to a black key on a
piano keyboard.

```typescript
function isBlackKey(pitch: number): boolean
```

- `pitch` — MIDI pitch number.

**Returns:** `true` if the pitch is a black key.

#### `PianoRoll(props)`

MIDI piano-roll editor. Renders a vertical piano keyboard on the
left, a horizontal time grid on the right, and draggable / resizable
note rectangles on top. Click an empty cell to paint a new note,
drag a note body to move it (snapped), drag the right-edge handle to
resize, right-click a note to delete it.

All styling routes through `getClassMap()` (no Tailwind / raw class
names). All user-visible text routes through `t()` so the roll
translates via the companion
`@molecule/app-locales-feature-piano-roll` locale bond.

```typescript
function PianoRoll(props: PianoRollProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The piano-roll element.

#### `pitchLabel(pitch)`

Format a MIDI pitch as a scientific-pitch-notation label, e.g. `60`
becomes `'C4'` and `61` becomes `'C#4'`.

```typescript
function pitchLabel(pitch: number): string
```

- `pitch` — MIDI pitch number.

**Returns:** Formatted label.

#### `pitchToY(pitch, noteHeight, highestPitch)`

Convert a MIDI pitch into a vertical pixel offset (top of the row
the pitch sits in).

```typescript
function pitchToY(pitch: number, noteHeight: number, highestPitch: number): number
```

- `pitch` — MIDI pitch number.
- `noteHeight` — Row height per pitch.
- `highestPitch` — Top-most pitch in the visible range.

**Returns:** Vertical pixel offset for the pitch's row.

#### `pixelsToBeats(pixels, pixelsPerBeat)`

Convert a pixel offset into beats given the horizontal scale.

```typescript
function pixelsToBeats(pixels: number, pixelsPerBeat: number): number
```

- `pixels` — Offset in pixels.
- `pixelsPerBeat` — Horizontal scale.

**Returns:** Beats represented by the offset (may be negative).

#### `snapBeat(beat, snap)`

Snap a beat value to the nearest multiple of the snap step (rounding
down — typical piano-roll behavior so a click at the start of a cell
paints a note that starts on that cell).

```typescript
function snapBeat(beat: number, snap: PianoRollSnap): number
```

- `beat` — Raw beat value (may be fractional).
- `snap` — Snap resolution.

**Returns:** The floored snapped beat (>= 0).

#### `snapBeatRound(beat, snap)`

Round a beat value to the nearest snap step (typical drag-move
behavior so drags feel symmetric around grid lines).

```typescript
function snapBeatRound(beat: number, snap: PianoRollSnap): number
```

- `beat` — Raw beat value (may be fractional).
- `snap` — Snap resolution.

**Returns:** The rounded snapped beat (>= 0).

#### `snapToBeats(snap)`

Convert a snap setting to its size in beats.

```typescript
function snapToBeats(snap: PianoRollSnap): number
```

- `snap` — Snap resolution.

**Returns:** Snap step size in beats.

#### `yToPitch(y, noteHeight, highestPitch, lowestPitch)`

Convert a vertical pixel offset (relative to the top of the grid)
into a MIDI pitch. Higher pitches sit at the top, so `y = 0` maps to
`highestPitch` and `y` increases as pitch decreases.

```typescript
function yToPitch(y: number, noteHeight: number, highestPitch: number, lowestPitch: number): number
```

- `y` — Vertical pixel offset from the top of the grid.
- `noteHeight` — Row height per pitch.
- `highestPitch` — Top-most pitch in the visible range.
- `lowestPitch` — Bottom-most pitch in the visible range.

**Returns:** A MIDI pitch clamped into `[lowestPitch, highestPitch]`.

### Constants

#### `DEFAULT_NOTE_VELOCITY`

Default MIDI velocity assigned to freshly-painted notes.

```typescript
const DEFAULT_NOTE_VELOCITY: 96
```

#### `DRAG_DISTANCE_THRESHOLD_PX`

Pointer-distance threshold (px) before a press becomes a drag.

```typescript
const DRAG_DISTANCE_THRESHOLD_PX: 3
```

#### `MIN_NOTE_DURATION_BEATS`

Minimum note duration in beats — notes can't be resized below this.

```typescript
const MIN_NOTE_DURATION_BEATS: number
```

#### `PIANO_KEYS_WIDTH_PX`

Pixel width of the leading piano-keys column.

```typescript
const PIANO_KEYS_WIDTH_PX: 56
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-piano-roll`.
