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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-piano-roll`.
