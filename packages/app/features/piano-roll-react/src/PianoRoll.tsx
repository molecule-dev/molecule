import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * A single MIDI note rendered on the piano roll. `pitch` is a standard
 * MIDI pitch number in the closed interval `[0, 127]` where `60`
 * represents middle C (`C4`). `startBeat` is the note's start position
 * on the time grid, and `durationBeats` is its length in beats. `id` is
 * a stable identifier used as the React key and as the argument passed
 * back to all event handlers. `velocity` is an optional MIDI velocity
 * in the closed interval `[0, 127]` (defaults to a neutral mid-range).
 */
export interface MidiNote {
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

/**
 * Snap resolution for note placement / movement / resize. Each value is
 * a fraction of a beat: `'1/16'` is sixteenth-notes (a quarter of a
 * beat), `'1/4'` is quarter-notes (one beat), `'1'` snaps to whole
 * beats with no sub-divisions, etc.
 */
export type PianoRollSnap = '1/16' | '1/8' | '1/4' | '1/2' | '1'

/** Props for `<PianoRoll>`. */
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

/** Pixel width of the leading piano-keys column. */
export const PIANO_KEYS_WIDTH_PX = 56

/** Minimum note duration in beats — notes can't be resized below this. */
export const MIN_NOTE_DURATION_BEATS = 1 / 32

/** Pointer-distance threshold (px) before a press becomes a drag. */
export const DRAG_DISTANCE_THRESHOLD_PX = 3

/** Default MIDI velocity assigned to freshly-painted notes. */
export const DEFAULT_NOTE_VELOCITY = 96

/** Pitch class indices (0..11) that correspond to black keys on a piano. */
const BLACK_KEY_PITCH_CLASSES = new Set<number>([1, 3, 6, 8, 10])

/** Note names for the 12-tone chromatic scale, anchored at C. */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/**
 * Convert a snap setting to its size in beats.
 *
 * @param snap - Snap resolution.
 * @returns Snap step size in beats.
 */
export function snapToBeats(snap: PianoRollSnap): number {
  switch (snap) {
    case '1/16':
      return 0.25
    case '1/8':
      return 0.5
    case '1/4':
      return 1
    case '1/2':
      return 2
    case '1':
      return 4
    default:
      return 0.25
  }
}

/**
 * Snap a beat value to the nearest multiple of the snap step (rounding
 * down — typical piano-roll behavior so a click at the start of a cell
 * paints a note that starts on that cell).
 *
 * @param beat - Raw beat value (may be fractional).
 * @param snap - Snap resolution.
 * @returns The floored snapped beat (>= 0).
 */
export function snapBeat(beat: number, snap: PianoRollSnap): number {
  if (!Number.isFinite(beat)) return 0
  const step = snapToBeats(snap)
  if (step <= 0) return Math.max(0, beat)
  const snapped = Math.floor(beat / step) * step
  return snapped < 0 ? 0 : snapped
}

/**
 * Round a beat value to the nearest snap step (typical drag-move
 * behavior so drags feel symmetric around grid lines).
 *
 * @param beat - Raw beat value (may be fractional).
 * @param snap - Snap resolution.
 * @returns The rounded snapped beat (>= 0).
 */
export function snapBeatRound(beat: number, snap: PianoRollSnap): number {
  if (!Number.isFinite(beat)) return 0
  const step = snapToBeats(snap)
  if (step <= 0) return Math.max(0, beat)
  const snapped = Math.round(beat / step) * step
  return snapped < 0 ? 0 : snapped
}

/**
 * Convert a pixel offset into beats given the horizontal scale.
 *
 * @param pixels - Offset in pixels.
 * @param pixelsPerBeat - Horizontal scale.
 * @returns Beats represented by the offset (may be negative).
 */
export function pixelsToBeats(pixels: number, pixelsPerBeat: number): number {
  const safeScale = pixelsPerBeat > 0 ? pixelsPerBeat : 1
  return pixels / safeScale
}

/**
 * Convert a beat value into pixels given the horizontal scale.
 *
 * @param beats - Beat value.
 * @param pixelsPerBeat - Horizontal scale.
 * @returns Pixel offset.
 */
export function beatsToPixels(beats: number, pixelsPerBeat: number): number {
  const safeScale = pixelsPerBeat > 0 ? pixelsPerBeat : 1
  return beats * safeScale
}

/**
 * Convert a vertical pixel offset (relative to the top of the grid)
 * into a MIDI pitch. Higher pitches sit at the top, so `y = 0` maps to
 * `highestPitch` and `y` increases as pitch decreases.
 *
 * @param y - Vertical pixel offset from the top of the grid.
 * @param noteHeight - Row height per pitch.
 * @param highestPitch - Top-most pitch in the visible range.
 * @param lowestPitch - Bottom-most pitch in the visible range.
 * @returns A MIDI pitch clamped into `[lowestPitch, highestPitch]`.
 */
export function yToPitch(
  y: number,
  noteHeight: number,
  highestPitch: number,
  lowestPitch: number,
): number {
  const safeHeight = noteHeight > 0 ? noteHeight : 1
  const row = Math.floor(y / safeHeight)
  const pitch = highestPitch - row
  if (pitch > highestPitch) return highestPitch
  if (pitch < lowestPitch) return lowestPitch
  return pitch
}

/**
 * Convert a MIDI pitch into a vertical pixel offset (top of the row
 * the pitch sits in).
 *
 * @param pitch - MIDI pitch number.
 * @param noteHeight - Row height per pitch.
 * @param highestPitch - Top-most pitch in the visible range.
 * @returns Vertical pixel offset for the pitch's row.
 */
export function pitchToY(pitch: number, noteHeight: number, highestPitch: number): number {
  return (highestPitch - pitch) * noteHeight
}

/**
 * Determine whether a MIDI pitch corresponds to a black key on a
 * piano keyboard.
 *
 * @param pitch - MIDI pitch number.
 * @returns `true` if the pitch is a black key.
 */
export function isBlackKey(pitch: number): boolean {
  const pc = ((pitch % 12) + 12) % 12
  return BLACK_KEY_PITCH_CLASSES.has(pc)
}

/**
 * Format a MIDI pitch as a scientific-pitch-notation label, e.g. `60`
 * becomes `'C4'` and `61` becomes `'C#4'`.
 *
 * @param pitch - MIDI pitch number.
 * @returns Formatted label.
 */
export function pitchLabel(pitch: number): string {
  const pc = ((pitch % 12) + 12) % 12
  // Standard MIDI octave numbering: C4 = 60. (C-1 = 0.)
  const octave = Math.floor(pitch / 12) - 1
  return `${NOTE_NAMES[pc]}${octave}`
}

interface DragState {
  noteId: string
  mode: 'move' | 'resize'
  pointerId: number
  startX: number
  startY: number
  originStartBeat: number
  originDurationBeats: number
  originPitch: number
  moved: boolean
}

/**
 * MIDI piano-roll editor. Renders a vertical piano keyboard on the
 * left, a horizontal time grid on the right, and draggable / resizable
 * note rectangles on top. Click an empty cell to paint a new note,
 * drag a note body to move it (snapped), drag the right-edge handle to
 * resize, right-click a note to delete it.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text routes through `t()` so the roll
 * translates via the companion
 * `@molecule/app-locales-feature-piano-roll` locale bond.
 *
 * @param props - Component props.
 * @returns The piano-roll element.
 */
export function PianoRoll(props: PianoRollProps) {
  const {
    notes,
    pixelsPerBeat = 80,
    noteHeight = 20,
    lowestPitch = 21,
    highestPitch = 108,
    snap = '1/16',
    beatsCount,
    onNoteAdd,
    onNoteMove,
    onNoteResize,
    onNoteDelete,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()

  const gridRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [, forceRerender] = useState(0)
  const bumpDragTick = useCallback(() => forceRerender((n) => n + 1), [])

  // Derive grid dimensions. Highest pitch sits in the top row, so the
  // total row count is `highestPitch - lowestPitch + 1`.
  const safeHighest = Math.max(highestPitch, lowestPitch)
  const safeLowest = Math.min(highestPitch, lowestPitch)
  const rowCount = safeHighest - safeLowest + 1
  const gridHeight = rowCount * noteHeight

  // Auto-size the grid width to fit the longest note when `beatsCount`
  // is omitted; pad to a sensible minimum so empty rolls are usable.
  const computedBeats =
    beatsCount ??
    Math.max(
      16,
      Math.ceil(
        notes.reduce((max, n) => Math.max(max, (n.startBeat ?? 0) + (n.durationBeats ?? 0)), 0) + 4,
      ),
    )
  const gridWidth = beatsToPixels(computedBeats, pixelsPerBeat)

  const rollLabel = t('pianoRoll.aria.roll', {}, { defaultValue: 'Piano roll' })
  const keysLabel = t('pianoRoll.aria.keys', {}, { defaultValue: 'Piano keys' })
  const gridLabel = t('pianoRoll.aria.grid', {}, { defaultValue: 'Note grid' })
  const resizeLabel = t('pianoRoll.aria.resize', {}, { defaultValue: 'Resize note' })
  const noteAria = (n: MidiNote) =>
    t(
      'pianoRoll.aria.note',
      {
        pitch: pitchLabel(n.pitch),
        startBeat: n.startBeat.toFixed(2),
        durationBeats: n.durationBeats.toFixed(2),
      },
      { defaultValue: 'Note {{pitch}} starting at beat {{startBeat}} for {{durationBeats}} beats' },
    )

  // Global pointer listeners during an active drag so the gesture
  // survives the cursor leaving the note element.
  useEffect(() => {
    /**
     * Native pointermove handler used during an active drag.
     *
     * @param event - Native pointer event.
     */
    function onMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (
        !drag.moved &&
        Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX &&
        Math.abs(dy) < DRAG_DISTANCE_THRESHOLD_PX
      ) {
        return
      }
      drag.moved = true
      if (drag.mode === 'move') {
        const beatDelta = pixelsToBeats(dx, pixelsPerBeat)
        const nextStart = snapBeatRound(drag.originStartBeat + beatDelta, snap)
        const rowDelta = Math.round(dy / Math.max(noteHeight, 1))
        // Higher rows on screen = higher pitch numbers. Dragging down
        // (positive dy) decreases pitch.
        const proposedPitch = drag.originPitch - rowDelta
        const nextPitch = Math.max(safeLowest, Math.min(safeHighest, proposedPitch))
        onNoteMove?.(drag.noteId, nextStart, nextPitch)
      } else {
        const beatDelta = pixelsToBeats(dx, pixelsPerBeat)
        const nextDuration = Math.max(
          MIN_NOTE_DURATION_BEATS,
          snapBeatRound(drag.originDurationBeats + beatDelta, snap) || MIN_NOTE_DURATION_BEATS,
        )
        onNoteResize?.(drag.noteId, nextDuration)
      }
      bumpDragTick()
    }
    /**
     * Native pointerup handler that closes the drag gesture.
     *
     * @param event - Native pointer event.
     */
    function onUp(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      dragRef.current = null
      bumpDragTick()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [
    pixelsPerBeat,
    noteHeight,
    snap,
    safeHighest,
    safeLowest,
    onNoteMove,
    onNoteResize,
    bumpDragTick,
  ])

  /**
   * Begin a drag gesture on a note body or a resize handle.
   *
   * @param event - React pointer event from the note element.
   * @param note - The note being dragged.
   * @param mode - `'move'` for body drags, `'resize'` for handle drags.
   */
  function beginDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    note: MidiNote,
    mode: DragState['mode'],
  ) {
    if (event.button !== undefined && event.button !== 0) return
    event.stopPropagation()
    dragRef.current = {
      noteId: note.id,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originStartBeat: note.startBeat,
      originDurationBeats: note.durationBeats,
      originPitch: note.pitch,
      moved: false,
    }
  }

  /**
   * Click handler on the empty grid: paints a new note at the snapped
   * cell under the cursor with the configured snap-step duration.
   *
   * @param event - React click event from the grid surface.
   */
  function handleGridClick(event: ReactMouseEvent<HTMLDivElement>) {
    // Suppress synthetic clicks fired at the end of a drag.
    if (dragRef.current && dragRef.current.moved) return
    if (!onNoteAdd) return
    const node = gridRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
    const startBeat = snapBeat(pixelsToBeats(x, pixelsPerBeat), snap)
    const pitch = yToPitch(y, noteHeight, safeHighest, safeLowest)
    const durationBeats = snapToBeats(snap)
    const id = `note-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
    onNoteAdd({
      id,
      pitch,
      startBeat,
      durationBeats,
      velocity: DEFAULT_NOTE_VELOCITY,
    })
  }

  /**
   * Right-click handler on a note: deletes it.
   *
   * @param event - React mouse event.
   * @param note - The note to delete.
   */
  function handleNoteContextMenu(event: ReactMouseEvent<HTMLDivElement>, note: MidiNote) {
    if (!onNoteDelete) return
    event.preventDefault()
    event.stopPropagation()
    onNoteDelete(note.id)
  }

  // Build the list of pitch rows top-to-bottom (highest first).
  const rows: number[] = []
  for (let pitch = safeHighest; pitch >= safeLowest; pitch--) rows.push(pitch)

  const rootStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    width: '100%',
    overflow: 'auto',
    position: 'relative',
  }

  const keysColumnStyle: CSSProperties = {
    width: PIANO_KEYS_WIDTH_PX,
    minWidth: PIANO_KEYS_WIDTH_PX,
    height: gridHeight,
    position: 'sticky',
    left: 0,
    zIndex: 2,
    background: 'var(--mol-piano-roll-keys-bg, #f6f6f8)',
    color: 'currentColor',
  }

  const gridSurfaceStyle: CSSProperties = {
    position: 'relative',
    width: gridWidth,
    minWidth: gridWidth,
    height: gridHeight,
    background: 'var(--mol-piano-roll-grid-bg, #ffffff)',
    cursor: onNoteAdd ? 'crosshair' : 'default',
    touchAction: 'pan-y',
    userSelect: 'none',
  }

  return (
    <div
      role="region"
      aria-label={rollLabel}
      data-mol-id="piano-roll"
      className={cm.cn(className)}
      style={rootStyle}
    >
      {/* Vertical piano keyboard. */}
      <div role="list" aria-label={keysLabel} data-mol-id="piano-roll-keys" style={keysColumnStyle}>
        {rows.map((pitch) => {
          const black = isBlackKey(pitch)
          const isC = ((pitch % 12) + 12) % 12 === 0
          const keyStyle: CSSProperties = {
            position: 'relative',
            height: noteHeight,
            boxSizing: 'border-box',
            background: black
              ? 'var(--mol-piano-roll-key-black, #2b2b34)'
              : 'var(--mol-piano-roll-key-white, #ffffff)',
            color: black
              ? 'var(--mol-piano-roll-key-black-fg, #f6f6f8)'
              : 'var(--mol-piano-roll-key-white-fg, #2b2b34)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            paddingLeft: 6,
            paddingRight: 6,
            display: 'flex',
            alignItems: 'center',
            fontSize: 10,
            lineHeight: 1,
          }
          return (
            <div
              key={pitch}
              role="listitem"
              data-mol-id="piano-roll-key"
              data-pitch={pitch}
              data-key-color={black ? 'black' : 'white'}
              style={keyStyle}
            >
              {isC && (
                <span data-mol-id="piano-roll-key-label" className={cm.cn(cm.textSize('xs'))}>
                  {pitchLabel(pitch)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Note grid + drawn notes. */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={gridLabel}
        data-mol-id="piano-roll-grid"
        data-snap={snap}
        style={gridSurfaceStyle}
        onClick={handleGridClick}
      >
        {/* Horizontal pitch rows — alternate row tint for black keys. */}
        {rows.map((pitch) => {
          const black = isBlackKey(pitch)
          const rowStyle: CSSProperties = {
            position: 'absolute',
            left: 0,
            right: 0,
            top: pitchToY(pitch, noteHeight, safeHighest),
            height: noteHeight,
            background: black ? 'rgba(0,0,0,0.04)' : 'transparent',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            pointerEvents: 'none',
          }
          return (
            <div
              key={`row-${pitch}`}
              data-mol-id="piano-roll-row"
              data-pitch={pitch}
              data-key-color={black ? 'black' : 'white'}
              style={rowStyle}
            />
          )
        })}

        {/* Vertical beat gridlines — one line per beat (slightly heavier
            on the bar boundary every 4 beats). */}
        {Array.from({ length: Math.max(0, computedBeats) + 1 }, (_, beat) => {
          const isBar = beat % 4 === 0
          const lineStyle: CSSProperties = {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: beatsToPixels(beat, pixelsPerBeat),
            width: 1,
            background: isBar ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.06)',
            pointerEvents: 'none',
          }
          return (
            <div
              key={`beat-${beat}`}
              data-mol-id="piano-roll-beat-line"
              data-beat={beat}
              data-bar={isBar ? 'true' : 'false'}
              style={lineStyle}
            />
          )
        })}

        {/* Notes — drawn on top of the grid. */}
        {notes.map((note) => {
          const left = beatsToPixels(note.startBeat, pixelsPerBeat)
          const width = Math.max(2, beatsToPixels(note.durationBeats, pixelsPerBeat))
          const top = pitchToY(note.pitch, noteHeight, safeHighest)
          const velocity = Math.max(0, Math.min(127, note.velocity ?? DEFAULT_NOTE_VELOCITY))
          const opacity = 0.45 + (velocity / 127) * 0.55
          const noteStyle: CSSProperties = {
            position: 'absolute',
            left,
            width,
            top: top + 1,
            height: Math.max(2, noteHeight - 2),
            background: `var(--mol-piano-roll-note-bg, #5b8def)`,
            opacity,
            borderRadius: 3,
            boxSizing: 'border-box',
            cursor: 'grab',
            touchAction: 'none',
          }
          const handleStyle: CSSProperties = {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 6,
            cursor: 'ew-resize',
            touchAction: 'none',
          }
          return (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              aria-label={noteAria(note)}
              data-mol-id="piano-roll-note"
              data-note-id={note.id}
              data-pitch={note.pitch}
              data-start-beat={note.startBeat}
              data-duration-beats={note.durationBeats}
              className={cm.cn(cm.cursorPointer)}
              style={noteStyle}
              onPointerDown={(e) => beginDrag(e, note, 'move')}
              onContextMenu={(e) => handleNoteContextMenu(e, note)}
            >
              <div
                role="separator"
                aria-label={resizeLabel}
                data-mol-id="piano-roll-note-handle"
                style={handleStyle}
                onPointerDown={(e) => beginDrag(e, note, 'resize')}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
