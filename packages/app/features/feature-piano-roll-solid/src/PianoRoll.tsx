/**
 * Solid MIDI piano-roll editor: vertical piano keys + horizontal time grid +
 * draggable / resizable note rectangles.
 *
 * Solid counterpart of `@molecule/app-feature-piano-roll-react`'s `PianoRoll` —
 * the same props (React names), the same DOM for the same input, and the same
 * callback calls.
 *
 * @module
 */

import { type Component, createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import {
  beatsToPixels,
  DEFAULT_NOTE_VELOCITY,
  DRAG_DISTANCE_THRESHOLD_PX,
  isBlackKey,
  MIN_NOTE_DURATION_BEATS,
  PIANO_KEYS_WIDTH_PX,
  pitchLabel,
  pitchToY,
  pixelsToBeats,
  snapBeat,
  snapBeatRound,
  snapToBeats,
  yToPitch,
} from './geometry.js'
import type { MidiNote, PianoRollProps, PianoRollSnap } from './types.js'

/**
 * Next value of the module-wide grid-help id counter.
 *
 * React derives the note grid's `aria-describedby` id from `useId()`, which
 * numbers ids from one process-wide counter (`_r_<base32>_`). The id appears
 * in the `aria-describedby` attribute and the description element's `id`,
 * which the conformance normalizer renumbers in order of appearance, so the
 * port generates ids from the same kind of counter — unique per instance,
 * exactly React's format.
 */
let nextGridHelpId = 0

/**
 * A fresh grid-help id, in React `useId()`'s `_r_<base32>_` shape.
 *
 * @returns The id for one instance's grid description element.
 */
const gridHelpId = (): string => `_r_${(nextGridHelpId++).toString(32)}_`

/** The pointer state of one drag gesture, kept between the window listeners. */
interface DragState {
  /** The note being moved or resized. */
  noteId: string
  /** `'move'` for body drags, `'resize'` for handle drags. */
  mode: 'move' | 'resize'
  /** The pointer that started the gesture. */
  pointerId: number
  /** The pointer's client X at the press. */
  startX: number
  /** The pointer's client Y at the press. */
  startY: number
  /** The note's start beat at the press. */
  originStartBeat: number
  /** The note's duration at the press. */
  originDurationBeats: number
  /** The note's pitch at the press. */
  originPitch: number
  /** Whether the pointer has travelled past the drag threshold. */
  moved: boolean
}

/** The derived grid geometry of one render. */
interface Geometry {
  /** Pixels per beat in effect. */
  pixelsPerBeat: number
  /** Row height in pixels per pitch. */
  noteHeight: number
  /** Snap resolution in effect. */
  snap: PianoRollSnap
  /** Top-most visible pitch (the larger of the two range props). */
  safeHighest: number
  /** Bottom-most visible pitch (the smaller of the two range props). */
  safeLowest: number
  /** Number of visible pitch rows. */
  rowCount: number
  /** Total grid height in pixels. */
  gridHeight: number
  /** Beats the time grid covers. */
  computedBeats: number
}

/** A note identity record: created once per note id and reused while the id is present. */
interface Row {
  /** The note id. */
  id: string
}

/** The root's inline geometry (React's `rootStyle`). */
const ROOT_STYLE: JSX.CSSProperties = {
  display: 'flex',
  'align-items': 'stretch',
  width: '100%',
  overflow: 'auto',
  position: 'relative',
}

/**
 * MIDI piano-roll editor. Renders a vertical piano keyboard on the left, a
 * horizontal time grid on the right, and draggable / resizable note rectangles
 * on top. Click an empty cell to paint a new note, drag a note body to move it
 * (snapped), drag the right-edge handle to resize, right-click a note to
 * delete it.
 *
 * Keyboard users get the same paint action: focus the grid (Tab), move the cell
 * cursor with the arrow keys, and press Enter or Space to paint a new note at
 * the cursor cell.
 *
 * React keys each note by its `id` value, so a re-passed or re-ordered array
 * keeps the rendered notes per id. Solid's `For` keys by reference, so the
 * notes are keyed through stable per-id records: the record for an id is
 * created once and reused, while the note's content reads the CURRENT note for
 * that id reactively.
 *
 * @param props - Component props (see {@link PianoRollProps}).
 * @returns The rendered piano roll.
 */
export const PianoRoll: Component<PianoRollProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // The id of the visually hidden element that describes the grid's keyboard
  // interface (`aria-describedby` below); one per instance.
  const helpId = gridHelpId()

  let gridEl: HTMLDivElement | undefined
  let drag: DragState | null = null

  // The keyboard cell cursor (the cell Enter / Space paint into), in raw
  // beats + pitch. Mouse clicks move it too, so the keyboard path continues
  // where the mouse left off.
  const [rawCursor, setRawCursor] = createSignal({ beat: 0, pitch: props.highestPitch ?? 108 })
  // `true` while the grid surface (or a child) has focus — drives the visible
  // cell-cursor highlight.
  const [gridFocused, setGridFocused] = createSignal(false)

  /** One stable record per note id, created on first sight. */
  const records = new Map<string, Row>()

  /**
   * The rows to render, keyed by their stable per-id records.
   *
   * @returns One record per current note, in display order.
   */
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = (props.notes ?? []).map((note) => {
      seen.add(note.id)
      let row = records.get(note.id)
      if (!row) {
        row = { id: note.id }
        records.set(note.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }

  /**
   * The current note for one row id.
   *
   * @param id - The note id.
   * @returns The note, or undefined while it is absent.
   */
  const noteFor = (id: string): MidiNote | undefined =>
    (props.notes ?? []).find((note) => note.id === id)

  /**
   * The derived grid geometry for the current props.
   *
   * @returns The geometry of one render.
   */
  function geometry(): Geometry {
    const pixelsPerBeat = props.pixelsPerBeat ?? 80
    const noteHeight = props.noteHeight ?? 20
    const lowestPitch = props.lowestPitch ?? 21
    const highestPitch = props.highestPitch ?? 108
    const snap = props.snap ?? '1/16'
    const safeHighest = Math.max(highestPitch, lowestPitch)
    const safeLowest = Math.min(highestPitch, lowestPitch)
    const rowCount = safeHighest - safeLowest + 1
    const gridHeight = rowCount * noteHeight
    // Auto-size the grid width to fit the longest note when `beatsCount` is
    // omitted; pad to a sensible minimum so empty rolls are usable.
    const computedBeats =
      props.beatsCount ??
      Math.max(
        16,
        Math.ceil(
          props.notes.reduce(
            (max, n) => Math.max(max, (n.startBeat ?? 0) + (n.durationBeats ?? 0)),
            0,
          ) + 4,
        ),
      )
    return {
      pixelsPerBeat,
      noteHeight,
      snap,
      safeHighest,
      safeLowest,
      rowCount,
      gridHeight,
      computedBeats,
    }
  }

  /**
   * The cell cursor clamped into the current grid bounds.
   *
   * @param grid - The geometry of the current render.
   * @returns The clamped cursor.
   */
  function clampedCursor(grid: Geometry): { beat: number; pitch: number } {
    const cursor = rawCursor()
    return {
      beat: Math.max(0, Math.min(cursor.beat, grid.computedBeats)),
      pitch: Math.max(grid.safeLowest, Math.min(grid.safeHighest, cursor.pitch)),
    }
  }

  /**
   * Paint a new note at an exact cell: `startBeat` + `pitch`, with the
   * configured snap-step duration and the default velocity.
   *
   * @param startBeat - Snapped start beat of the new note.
   * @param pitch - MIDI pitch of the row to paint into.
   */
  function paintNoteAt(startBeat: number, pitch: number): void {
    const onNoteAdd = props.onNoteAdd
    if (!onNoteAdd) return
    const id = `note-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
    onNoteAdd({
      id,
      pitch,
      startBeat,
      durationBeats: snapToBeats(geometry().snap),
      velocity: DEFAULT_NOTE_VELOCITY,
    })
  }

  /**
   * Click handler on the empty grid: paints a new note at the snapped cell
   * under the cursor and moves the keyboard cell cursor to that cell.
   *
   * @param event - The native click event from the grid surface.
   */
  function handleGridClick(event: MouseEvent): void {
    // Suppress synthetic clicks fired at the end of a drag.
    if (drag && drag.moved) return
    if (!props.onNoteAdd) return
    const node = gridEl
    if (!node) return
    const grid = geometry()
    const rect = node.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
    const startBeat = snapBeat(pixelsToBeats(x, grid.pixelsPerBeat), grid.snap)
    const pitch = yToPitch(y, grid.noteHeight, grid.safeHighest, grid.safeLowest)
    setRawCursor({ beat: startBeat, pitch })
    paintNoteAt(startBeat, pitch)
  }

  /**
   * Keyboard handler on the grid surface: the arrow keys move the cell
   * cursor, and Enter or Space paints a new note at the cursor cell.
   *
   * @param event - The native keydown event from the grid surface.
   */
  function handleGridKeyDown(event: KeyboardEvent): void {
    if (!props.onNoteAdd) return
    // Only the grid surface itself drives the cell cursor — a keydown
    // bubbling from a focused note child belongs to that note.
    if (event.target !== event.currentTarget) return
    const grid = geometry()
    const cursor = clampedCursor(grid)
    if (event.key === 'Enter' || event.key === ' ') {
      // Ignore key auto-repeat so holding the key doesn't flood the roll
      // with notes; each press paints exactly one note.
      event.preventDefault()
      if (!event.repeat) paintNoteAt(cursor.beat, cursor.pitch)
      return
    }
    switch (event.key) {
      case 'ArrowLeft':
        setRawCursor({ ...cursor, beat: cursor.beat - snapToBeats(grid.snap) })
        break
      case 'ArrowRight':
        setRawCursor({ ...cursor, beat: cursor.beat + snapToBeats(grid.snap) })
        break
      case 'ArrowUp':
        setRawCursor({ ...cursor, pitch: cursor.pitch + 1 })
        break
      case 'ArrowDown':
        setRawCursor({ ...cursor, pitch: cursor.pitch - 1 })
        break
      default:
        return
    }
    // Keep the scrollable surface from moving while moving the cursor.
    event.preventDefault()
  }

  /**
   * Right-click handler on a note: deletes it.
   *
   * @param event - The native mouse event.
   * @param note - The note to delete.
   */
  function handleNoteContextMenu(event: MouseEvent, note: MidiNote): void {
    const onNoteDelete = props.onNoteDelete
    if (!onNoteDelete) return
    event.preventDefault()
    event.stopPropagation()
    onNoteDelete(note.id)
  }

  /**
   * Begin a drag gesture on a note body or a resize handle.
   *
   * @param event - The native pointer event from the note element.
   * @param note - The note being dragged.
   * @param mode - `'move'` for body drags, `'resize'` for handle drags.
   */
  function beginDrag(event: PointerEvent, note: MidiNote, mode: DragState['mode']): void {
    if (event.button !== undefined && event.button !== 0) return
    event.stopPropagation()
    drag = {
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
   * Native pointermove handler used during an active drag.
   *
   * @param event - Native pointer event.
   */
  function onMove(event: PointerEvent): void {
    const current = drag
    if (!current || event.pointerId !== current.pointerId) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (
      !current.moved &&
      Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX &&
      Math.abs(dy) < DRAG_DISTANCE_THRESHOLD_PX
    ) {
      return
    }
    current.moved = true
    const grid = geometry()
    if (current.mode === 'move') {
      const beatDelta = pixelsToBeats(dx, grid.pixelsPerBeat)
      const nextStart = snapBeatRound(current.originStartBeat + beatDelta, grid.snap)
      const rowDelta = Math.round(dy / Math.max(grid.noteHeight, 1))
      // Higher rows on screen = higher pitch numbers. Dragging down
      // (positive dy) decreases pitch.
      const proposedPitch = current.originPitch - rowDelta
      const nextPitch = Math.max(grid.safeLowest, Math.min(grid.safeHighest, proposedPitch))
      props.onNoteMove?.(current.noteId, nextStart, nextPitch)
    } else {
      const beatDelta = pixelsToBeats(dx, grid.pixelsPerBeat)
      const nextDuration = Math.max(
        MIN_NOTE_DURATION_BEATS,
        snapBeatRound(current.originDurationBeats + beatDelta, grid.snap) ||
          MIN_NOTE_DURATION_BEATS,
      )
      props.onNoteResize?.(current.noteId, nextDuration)
    }
  }

  /**
   * Native pointerup / pointercancel handler that closes the drag gesture.
   *
   * @param event - Native pointer event.
   */
  function onUp(event: PointerEvent): void {
    const current = drag
    if (!current || event.pointerId !== current.pointerId) return
    drag = null
  }

  onMount(() => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  })
  onCleanup(() => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  })

  /** The translated region label (React's `pianoRoll.aria.roll`). */
  const rollLabel = (): string => t('pianoRoll.aria.roll', {}, { defaultValue: 'Piano roll' })
  /** The translated keys-column label (React's `pianoRoll.aria.keys`). */
  const keysLabel = (): string => t('pianoRoll.aria.keys', {}, { defaultValue: 'Piano keys' })
  /** The translated grid label (React's `pianoRoll.aria.grid`). */
  const gridLabel = (): string => t('pianoRoll.aria.grid', {}, { defaultValue: 'Note grid' })
  /** The translated grid keyboard help (React's `pianoRoll.aria.gridHelp`). */
  const gridHelpLabel = (): string =>
    t(
      'pianoRoll.aria.gridHelp',
      {},
      { defaultValue: 'The arrow keys move the cell cursor, Enter or Space paints a note at it.' },
    )
  /** The translated resize-handle label (React's `pianoRoll.aria.resize`). */
  const resizeLabel = (): string => t('pianoRoll.aria.resize', {}, { defaultValue: 'Resize note' })

  /** The translated cell-cursor announcement (React's `pianoRoll.aria.cursor`). */
  const cursorLabel = (): string => {
    const grid = geometry()
    const cursor = clampedCursor(grid)
    return t(
      'pianoRoll.aria.cursor',
      { pitch: pitchLabel(cursor.pitch), beat: cursor.beat.toFixed(2) },
      { defaultValue: 'Cursor on {{pitch}} at beat {{beat}}' },
    )
  }

  /**
   * The translated aria label of one note (React's `pianoRoll.aria.note`).
   *
   * @param note - The note.
   * @returns The translated label.
   */
  const noteAria = (note: MidiNote): string =>
    t(
      'pianoRoll.aria.note',
      {
        pitch: pitchLabel(note.pitch),
        startBeat: note.startBeat.toFixed(2),
        durationBeats: note.durationBeats.toFixed(2),
      },
      { defaultValue: 'Note {{pitch}} starting at beat {{startBeat}} for {{durationBeats}} beats' },
    )

  /** The pitch rows, top-to-bottom (highest first). */
  const rows = (): number[] => {
    const grid = geometry()
    const list: number[] = []
    for (let pitch = grid.safeHighest; pitch >= grid.safeLowest; pitch--) list.push(pitch)
    return list
  }

  /** The beatline indices — `Array.from` floors a fractional count, as React does. */
  const beats = (): number[] =>
    Array.from({ length: Math.max(0, geometry().computedBeats) + 1 }, (_v, beat) => beat)

  /**
   * The keys column's inline geometry (React's `keysColumnStyle`).
   *
   * @param grid - The geometry of the current render.
   * @returns The style object.
   */
  const keysColumnStyle = (grid: Geometry): JSX.CSSProperties => ({
    width: `${PIANO_KEYS_WIDTH_PX}px`,
    'min-width': `${PIANO_KEYS_WIDTH_PX}px`,
    height: `${grid.gridHeight}px`,
    position: 'sticky',
    left: '0px',
    'z-index': '2',
    background: 'var(--mol-piano-roll-keys-bg, #f6f6f8)',
    color: 'currentcolor',
  })

  /**
   * One piano key's inline geometry (React's `keyStyle`).
   *
   * @param black - Whether the key is black.
   * @param noteHeight - Row height in pixels.
   * @returns The style object.
   */
  const keyStyle = (black: boolean, noteHeight: number): JSX.CSSProperties => ({
    position: 'relative',
    height: `${noteHeight}px`,
    'box-sizing': 'border-box',
    background: black
      ? 'var(--mol-piano-roll-key-black, #2b2b34)'
      : 'var(--mol-piano-roll-key-white, #ffffff)',
    color: black
      ? 'var(--mol-piano-roll-key-black-fg, #f6f6f8)'
      : 'var(--mol-piano-roll-key-white-fg, #2b2b34)',
    'border-bottom': '1px solid rgba(0, 0, 0, 0.08)',
    'padding-left': '6px',
    'padding-right': '6px',
    display: 'flex',
    'align-items': 'center',
    'font-size': '10px',
    'line-height': '1',
  })

  /**
   * One pitch row's inline geometry (React's `rowStyle`).
   *
   * @param pitch - The row's pitch.
   * @param grid - The geometry of the current render.
   * @returns The style object.
   */
  const rowStyle = (pitch: number, grid: Geometry): JSX.CSSProperties => {
    const black = isBlackKey(pitch)
    return {
      position: 'absolute',
      left: '0px',
      right: '0px',
      top: `${pitchToY(pitch, grid.noteHeight, grid.safeHighest)}px`,
      height: `${grid.noteHeight}px`,
      background: black ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
      'border-bottom': '1px solid rgba(0, 0, 0, 0.04)',
      'pointer-events': 'none',
    }
  }

  /**
   * One beat gridline's inline geometry (React's `lineStyle`).
   *
   * @param beat - The beat index.
   * @param grid - The geometry of the current render.
   * @returns The style object.
   */
  const lineStyle = (beat: number, grid: Geometry): JSX.CSSProperties => ({
    position: 'absolute',
    top: '0px',
    bottom: '0px',
    left: `${beatsToPixels(beat, grid.pixelsPerBeat)}px`,
    width: '1px',
    background: beat % 4 === 0 ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.06)',
    'pointer-events': 'none',
  })

  /**
   * The cell cursor's inline geometry (React's cursor style).
   *
   * @param grid - The geometry of the current render.
   * @returns The style object.
   */
  const cursorStyle = (grid: Geometry): JSX.CSSProperties => {
    const cursor = clampedCursor(grid)
    return {
      position: 'absolute',
      left: `${beatsToPixels(cursor.beat, grid.pixelsPerBeat)}px`,
      top: `${pitchToY(cursor.pitch, grid.noteHeight, grid.safeHighest)}px`,
      width: `${beatsToPixels(snapToBeats(grid.snap), grid.pixelsPerBeat)}px`,
      height: `${grid.noteHeight}px`,
      border: '2px solid var(--mol-piano-roll-note-bg, #5b8def)',
      'border-radius': '3px',
      'box-sizing': 'border-box',
      'pointer-events': 'none',
    }
  }

  /**
   * The grid surface's inline geometry (React's `gridSurfaceStyle`).
   *
   * @param grid - The geometry of the current render.
   * @returns The style object.
   */
  const gridSurfaceStyle = (grid: Geometry): JSX.CSSProperties => {
    const width = `${beatsToPixels(grid.computedBeats, grid.pixelsPerBeat)}px`
    return {
      position: 'relative',
      width,
      'min-width': width,
      height: `${grid.gridHeight}px`,
      background: 'var(--mol-piano-roll-grid-bg, #ffffff)',
      cursor: props.onNoteAdd ? 'crosshair' : 'default',
      'touch-action': 'pan-y',
      'user-select': 'none',
    }
  }

  /**
   * One note block's inline geometry (React's `noteStyle`).
   *
   * @param note - The note.
   * @param grid - The geometry of the current render.
   * @returns The style object.
   */
  const noteStyle = (note: MidiNote, grid: Geometry): JSX.CSSProperties => {
    const velocity = Math.max(0, Math.min(127, note.velocity ?? DEFAULT_NOTE_VELOCITY))
    return {
      position: 'absolute',
      left: `${beatsToPixels(note.startBeat, grid.pixelsPerBeat)}px`,
      width: `${Math.max(2, beatsToPixels(note.durationBeats, grid.pixelsPerBeat))}px`,
      top: `${pitchToY(note.pitch, grid.noteHeight, grid.safeHighest) + 1}px`,
      height: `${Math.max(2, grid.noteHeight - 2)}px`,
      background: `var(--mol-piano-roll-note-bg, #5b8def)`,
      opacity: String(0.45 + (velocity / 127) * 0.55),
      'border-radius': '3px',
      'box-sizing': 'border-box',
      cursor: 'grab',
      'touch-action': 'none',
    }
  }

  /** The note handle's inline geometry (React's `handleStyle`). */
  const handleStyle: JSX.CSSProperties = {
    position: 'absolute',
    top: '0px',
    right: '0px',
    bottom: '0px',
    width: '6px',
    cursor: 'ew-resize',
    'touch-action': 'none',
  }

  return (
    <div
      role="region"
      aria-label={rollLabel()}
      data-mol-id="piano-roll"
      class={cm.cn(props.className)}
      style={ROOT_STYLE}
    >
      {/* Vertical piano keyboard. */}
      <div
        role="list"
        aria-label={keysLabel()}
        data-mol-id="piano-roll-keys"
        style={keysColumnStyle(geometry())}
      >
        <For each={rows()}>
          {(pitch) => {
            const black = isBlackKey(pitch)
            const isC = ((pitch % 12) + 12) % 12 === 0
            return (
              <div
                role="listitem"
                data-mol-id="piano-roll-key"
                data-pitch={pitch}
                data-key-color={black ? 'black' : 'white'}
                style={keyStyle(black, geometry().noteHeight)}
              >
                <Show when={isC}>
                  <span data-mol-id="piano-roll-key-label" class={cm.cn(cm.textSize('xs'))}>
                    {pitchLabel(pitch)}
                  </span>
                </Show>
              </div>
            )
          }}
        </For>
      </div>

      {/* Note grid + drawn notes. A free two-dimensional surface driven by
          the keyboard cell cursor, so it is an `application`, not a `grid`:
          it holds no `row`s of `gridcell`s. */}
      <div
        ref={(element: HTMLDivElement) => {
          gridEl = element
        }}
        role="application"
        aria-label={gridLabel()}
        aria-describedby={helpId}
        data-mol-id="piano-roll-grid"
        data-snap={geometry().snap}
        style={gridSurfaceStyle(geometry())}
        tabIndex={0}
        onClick={(event) => handleGridClick(event)}
        onKeyDown={(event) => handleGridKeyDown(event)}
        onFocusIn={() => setGridFocused(true)}
        onFocusOut={() => setGridFocused(false)}
      >
        {/* Horizontal pitch rows — alternate row tint for black keys. */}
        <For each={rows()}>
          {(pitch) => (
            <div
              data-mol-id="piano-roll-row"
              data-pitch={pitch}
              data-key-color={isBlackKey(pitch) ? 'black' : 'white'}
              style={rowStyle(pitch, geometry())}
            />
          )}
        </For>

        {/* Vertical beat gridlines — one line per beat (slightly heavier
            on the bar boundary every 4 beats). */}
        <For each={beats()}>
          {(beat) => (
            <div
              data-mol-id="piano-roll-beat-line"
              data-beat={beat}
              data-bar={beat % 4 === 0 ? 'true' : 'false'}
              style={lineStyle(beat, geometry())}
            />
          )}
        </For>

        {/* Keyboard cell cursor — visible while the grid has focus. */}
        <Show when={props.onNoteAdd && gridFocused()}>
          <div
            data-mol-id="piano-roll-cell-cursor"
            aria-hidden="true"
            style={cursorStyle(geometry())}
          />
        </Show>

        {/* Describes the grid's keyboard interface to assistive technology.
            Rendered unconditionally so aria-describedby always resolves. */}
        <div id={helpId} class={cm.srOnly}>
          {gridHelpLabel()}
        </div>

        {/* Announces keyboard cursor moves to assistive technology. */}
        <Show when={props.onNoteAdd}>
          <div role="status" class={cm.srOnly}>
            {cursorLabel()}
          </div>
        </Show>

        {/* Notes — drawn on top of the grid. */}
        <For each={keyedRows()}>
          {(row) => (
            <Show when={noteFor(row.id)}>
              {(note) => (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={noteAria(note())}
                  data-mol-id="piano-roll-note"
                  data-note-id={note().id}
                  data-pitch={note().pitch}
                  data-start-beat={note().startBeat}
                  data-duration-beats={note().durationBeats}
                  class={cm.cn(cm.cursorPointer)}
                  style={noteStyle(note(), geometry())}
                  onPointerDown={(event) => beginDrag(event, note(), 'move')}
                  onContextMenu={(event) => handleNoteContextMenu(event, note())}
                >
                  <div
                    role="separator"
                    aria-label={resizeLabel()}
                    data-mol-id="piano-roll-note-handle"
                    style={handleStyle}
                    onPointerDown={(event) => beginDrag(event, note(), 'resize')}
                  />
                </div>
              )}
            </Show>
          )}
        </For>
      </div>
    </div>
  )
}
