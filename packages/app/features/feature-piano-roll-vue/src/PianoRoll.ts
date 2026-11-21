/**
 * Vue MIDI piano-roll editor: vertical piano keys + horizontal time grid +
 * draggable / resizable note rectangles.
 *
 * Vue counterpart of `@molecule/app-feature-piano-roll-react`'s `PianoRoll` —
 * the same props (React names), the same DOM for the same input, and the same
 * callback calls.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  useId,
  type VNode,
  type VNodeChild,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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
 * @param props - Component props (see {@link PianoRollProps}).
 * @returns The piano-roll component.
 */
export const PianoRoll = defineComponent({
  name: 'PianoRoll',
  props: {
    /** MIDI notes rendered on the grid, in display order. */
    notes: { type: Array as PropType<MidiNote[]>, required: true },
    /** Horizontal scale in pixels per beat (defaults to 80 at render time). */
    pixelsPerBeat: { type: Number as PropType<number | undefined>, default: undefined },
    /** Row height in pixels per pitch (defaults to 20 at render time). */
    noteHeight: { type: Number as PropType<number | undefined>, default: undefined },
    /** Lowest visible pitch (defaults to 21 at render time). */
    lowestPitch: { type: Number as PropType<number | undefined>, default: undefined },
    /** Highest visible pitch (defaults to 108 at render time). */
    highestPitch: { type: Number as PropType<number | undefined>, default: undefined },
    /** Snap resolution (defaults to `'1/16'` at render time). */
    snap: { type: String as PropType<PianoRollSnap | undefined>, default: undefined },
    /** Beats the time grid covers (auto-sized from the notes when omitted). */
    beatsCount: { type: Number as PropType<number | undefined>, default: undefined },
    /** Called with a freshly-painted note. */
    onNoteAdd: {
      type: Function as PropType<PianoRollProps['onNoteAdd']>,
      default: undefined,
    },
    /** Called with the new geometry when a note body is dragged. */
    onNoteMove: {
      type: Function as PropType<PianoRollProps['onNoteMove']>,
      default: undefined,
    },
    /** Called with the new duration when a note's right-edge handle is dragged. */
    onNoteResize: {
      type: Function as PropType<PianoRollProps['onNoteResize']>,
      default: undefined,
    },
    /** Called with the note id when a note is right-clicked. */
    onNoteDelete: {
      type: Function as PropType<PianoRollProps['onNoteDelete']>,
      default: undefined,
    },
    /** Extra classes merged onto the root element. */
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // The id of the visually hidden element that describes the grid's keyboard
    // interface (`aria-describedby` below) — React derives it from `useId()`,
    // Vue's hook of the same name keeps it unique per instance too.
    const gridHelpId = useId()

    const gridRef = ref<HTMLDivElement | null>(null)
    let drag: DragState | null = null

    // The keyboard cell cursor (the cell Enter / Space paint into), in raw
    // beats + pitch. Mouse clicks move it too, so the keyboard path continues
    // where the mouse left off.
    const rawCursor = ref({ beat: 0, pitch: props.highestPitch ?? 108 })
    // `true` while the grid surface (or a child) has focus — drives the visible
    // cell-cursor highlight.
    const gridFocused = ref(false)

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
      return {
        beat: Math.max(0, Math.min(rawCursor.value.beat, grid.computedBeats)),
        pitch: Math.max(grid.safeLowest, Math.min(grid.safeHighest, rawCursor.value.pitch)),
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
      const node = gridRef.value
      if (!node) return
      const grid = geometry()
      const rect = node.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      const startBeat = snapBeat(pixelsToBeats(x, grid.pixelsPerBeat), grid.snap)
      const pitch = yToPitch(y, grid.noteHeight, grid.safeHighest, grid.safeLowest)
      rawCursor.value = { beat: startBeat, pitch }
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
          rawCursor.value = { ...cursor, beat: cursor.beat - snapToBeats(grid.snap) }
          break
        case 'ArrowRight':
          rawCursor.value = { ...cursor, beat: cursor.beat + snapToBeats(grid.snap) }
          break
        case 'ArrowUp':
          rawCursor.value = { ...cursor, pitch: cursor.pitch + 1 }
          break
        case 'ArrowDown':
          rawCursor.value = { ...cursor, pitch: cursor.pitch - 1 }
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

    onMounted(() => {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    })

    return (): VNode => {
      const grid = geometry()
      const cursor = clampedCursor(grid)
      const gridWidth = beatsToPixels(grid.computedBeats, grid.pixelsPerBeat)

      const rollLabel = t('pianoRoll.aria.roll', {}, { defaultValue: 'Piano roll' })
      const keysLabel = t('pianoRoll.aria.keys', {}, { defaultValue: 'Piano keys' })
      const gridLabel = t('pianoRoll.aria.grid', {}, { defaultValue: 'Note grid' })
      const gridHelpLabel = t(
        'pianoRoll.aria.gridHelp',
        {},
        {
          defaultValue: 'The arrow keys move the cell cursor, Enter or Space paints a note at it.',
        },
      )
      const resizeLabel = t('pianoRoll.aria.resize', {}, { defaultValue: 'Resize note' })
      const cursorLabel = t(
        'pianoRoll.aria.cursor',
        { pitch: pitchLabel(cursor.pitch), beat: cursor.beat.toFixed(2) },
        { defaultValue: 'Cursor on {{pitch}} at beat {{beat}}' },
      )
      const noteAria = (note: MidiNote): string =>
        t(
          'pianoRoll.aria.note',
          {
            pitch: pitchLabel(note.pitch),
            startBeat: note.startBeat.toFixed(2),
            durationBeats: note.durationBeats.toFixed(2),
          },
          {
            defaultValue:
              'Note {{pitch}} starting at beat {{startBeat}} for {{durationBeats}} beats',
          },
        )

      // Build the list of pitch rows top-to-bottom (highest first).
      const rows: number[] = []
      for (let pitch = grid.safeHighest; pitch >= grid.safeLowest; pitch--) rows.push(pitch)

      const keys: VNodeChild[] = rows.map((pitch) => {
        const black = isBlackKey(pitch)
        const isC = ((pitch % 12) + 12) % 12 === 0
        const keyStyle = {
          position: 'relative',
          height: `${grid.noteHeight}px`,
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
        }
        return h(
          'div',
          {
            key: pitch,
            role: 'listitem',
            'data-mol-id': 'piano-roll-key',
            'data-pitch': pitch,
            'data-key-color': black ? 'black' : 'white',
            style: keyStyle,
          },
          isC
            ? [
                h(
                  'span',
                  {
                    'data-mol-id': 'piano-roll-key-label',
                    class: cm.cn(cm.textSize('xs')),
                  },
                  [pitchLabel(pitch)],
                ),
              ]
            : [],
        )
      })

      const gridChildren: VNodeChild[] = []

      // Horizontal pitch rows — alternate row tint for black keys.
      for (const pitch of rows) {
        const black = isBlackKey(pitch)
        gridChildren.push(
          h('div', {
            key: `row-${pitch}`,
            'data-mol-id': 'piano-roll-row',
            'data-pitch': pitch,
            'data-key-color': black ? 'black' : 'white',
            style: {
              position: 'absolute',
              left: '0px',
              right: '0px',
              top: `${pitchToY(pitch, grid.noteHeight, grid.safeHighest)}px`,
              height: `${grid.noteHeight}px`,
              background: black ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
              'border-bottom': '1px solid rgba(0, 0, 0, 0.04)',
              'pointer-events': 'none',
            },
          }),
        )
      }

      // Vertical beat gridlines — one line per beat (slightly heavier on the
      // bar boundary every 4 beats).
      // `Array.from` floors a fractional length, exactly as React's list does.
      const beats = Array.from({ length: Math.max(0, grid.computedBeats) + 1 }, (_v, beat) => beat)
      for (const beat of beats) {
        const isBar = beat % 4 === 0
        gridChildren.push(
          h('div', {
            key: `beat-${beat}`,
            'data-mol-id': 'piano-roll-beat-line',
            'data-beat': beat,
            'data-bar': isBar ? 'true' : 'false',
            style: {
              position: 'absolute',
              top: '0px',
              bottom: '0px',
              left: `${beatsToPixels(beat, grid.pixelsPerBeat)}px`,
              width: '1px',
              background: isBar ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.06)',
              'pointer-events': 'none',
            },
          }),
        )
      }

      // Keyboard cell cursor — visible while the grid has focus.
      if (props.onNoteAdd && gridFocused.value) {
        gridChildren.push(
          h('div', {
            'data-mol-id': 'piano-roll-cell-cursor',
            'aria-hidden': 'true',
            style: {
              position: 'absolute',
              left: `${beatsToPixels(cursor.beat, grid.pixelsPerBeat)}px`,
              top: `${pitchToY(cursor.pitch, grid.noteHeight, grid.safeHighest)}px`,
              width: `${beatsToPixels(snapToBeats(grid.snap), grid.pixelsPerBeat)}px`,
              height: `${grid.noteHeight}px`,
              border: '2px solid var(--mol-piano-roll-note-bg, #5b8def)',
              'border-radius': '3px',
              'box-sizing': 'border-box',
              'pointer-events': 'none',
            },
          }),
        )
      }

      // Describes the grid's keyboard interface to assistive technology.
      // Rendered unconditionally so `aria-describedby` always resolves.
      gridChildren.push(h('div', { id: gridHelpId, class: cm.srOnly }, [gridHelpLabel]))

      // Announces keyboard cursor moves to assistive technology.
      if (props.onNoteAdd) {
        gridChildren.push(h('div', { role: 'status', class: cm.srOnly }, [cursorLabel]))
      }

      // Notes — drawn on top of the grid.
      for (const note of props.notes) {
        const left = beatsToPixels(note.startBeat, grid.pixelsPerBeat)
        const width = Math.max(2, beatsToPixels(note.durationBeats, grid.pixelsPerBeat))
        const top = pitchToY(note.pitch, grid.noteHeight, grid.safeHighest)
        const velocity = Math.max(0, Math.min(127, note.velocity ?? DEFAULT_NOTE_VELOCITY))
        const opacity = 0.45 + (velocity / 127) * 0.55
        gridChildren.push(
          h(
            'div',
            {
              key: note.id,
              role: 'button',
              tabIndex: 0,
              'aria-label': noteAria(note),
              'data-mol-id': 'piano-roll-note',
              'data-note-id': note.id,
              'data-pitch': note.pitch,
              'data-start-beat': note.startBeat,
              'data-duration-beats': note.durationBeats,
              class: cm.cn(cm.cursorPointer),
              style: {
                position: 'absolute',
                left: `${left}px`,
                width: `${width}px`,
                top: `${top + 1}px`,
                height: `${Math.max(2, grid.noteHeight - 2)}px`,
                background: `var(--mol-piano-roll-note-bg, #5b8def)`,
                opacity: String(opacity),
                'border-radius': '3px',
                'box-sizing': 'border-box',
                cursor: 'grab',
                'touch-action': 'none',
              },
              onPointerdown: (event: PointerEvent) => beginDrag(event, note, 'move'),
              onContextmenu: (event: MouseEvent) => handleNoteContextMenu(event, note),
            },
            [
              h('div', {
                role: 'separator',
                'aria-label': resizeLabel,
                'data-mol-id': 'piano-roll-note-handle',
                style: {
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  bottom: '0px',
                  width: '6px',
                  cursor: 'ew-resize',
                  'touch-action': 'none',
                },
                onPointerdown: (event: PointerEvent) => beginDrag(event, note, 'resize'),
              }),
            ],
          ),
        )
      }

      return h(
        'div',
        {
          role: 'region',
          'aria-label': rollLabel,
          'data-mol-id': 'piano-roll',
          class: cm.cn(props.className),
          style: {
            display: 'flex',
            'align-items': 'stretch',
            width: '100%',
            overflow: 'auto',
            position: 'relative',
          },
        },
        [
          // Vertical piano keyboard.
          h(
            'div',
            {
              role: 'list',
              'aria-label': keysLabel,
              'data-mol-id': 'piano-roll-keys',
              style: {
                width: `${PIANO_KEYS_WIDTH_PX}px`,
                'min-width': `${PIANO_KEYS_WIDTH_PX}px`,
                height: `${grid.gridHeight}px`,
                position: 'sticky',
                left: '0px',
                'z-index': '2',
                background: 'var(--mol-piano-roll-keys-bg, #f6f6f8)',
                color: 'currentcolor',
              },
            },
            keys,
          ),
          // Note grid + drawn notes. A free two-dimensional surface driven by
          // the keyboard cell cursor, so it is an `application`, not a
          // `grid`: it holds no `row`s of `gridcell`s.
          h(
            'div',
            {
              ref: gridRef,
              role: 'application',
              'aria-label': gridLabel,
              'aria-describedby': gridHelpId,
              'data-mol-id': 'piano-roll-grid',
              'data-snap': grid.snap,
              style: {
                position: 'relative',
                width: `${gridWidth}px`,
                'min-width': `${gridWidth}px`,
                height: `${grid.gridHeight}px`,
                background: 'var(--mol-piano-roll-grid-bg, #ffffff)',
                cursor: props.onNoteAdd ? 'crosshair' : 'default',
                'touch-action': 'pan-y',
                'user-select': 'none',
              },
              tabIndex: 0,
              onClick: (event: MouseEvent) => handleGridClick(event),
              onKeydown: (event: KeyboardEvent) => handleGridKeyDown(event),
              onFocusin: () => {
                gridFocused.value = true
              },
              onFocusout: () => {
                gridFocused.value = false
              },
            },
            gridChildren,
          ),
        ],
      )
    }
  },
})
