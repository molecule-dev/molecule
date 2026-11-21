/**
 * PianoRoll component (React parity): MIDI piano-roll editor with a vertical
 * piano keyboard, a horizontal time grid and draggable / resizable notes.
 *
 * @module
 */

import {
  Component,
  type ElementRef,
  type OnDestroy,
  type OnInit,
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
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
 * numbers ids from one process-wide counter; the grid names its visually
 * hidden description element by it, so the port generates ids from the same
 * kind of counter — unique per instance.
 */
let nextGridHelpId = 0

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
 * PianoRoll component.
 *
 * The host IS React's root `<div>` (`div[mol-piano-roll]`), matching React's
 * root exactly. Renders a vertical piano keyboard on the left, a horizontal
 * time grid on the right, and draggable / resizable note rectangles on top.
 * Click an empty cell to paint a new note, drag a note body to move it
 * (snapped), drag the right-edge handle to resize, right-click a note to
 * delete it.
 *
 * Keyboard users get the same paint action: focus the grid (Tab), move the
 * cell cursor with the arrow keys, and press Enter or Space to paint a new note
 * at the cursor cell.
 */
@Component({
  selector: 'div[mol-piano-roll]',
  standalone: true,
  inputs: [
    'notes',
    'pixelsPerBeat',
    'noteHeight',
    'lowestPitch',
    'highestPitch',
    'snap',
    'beatsCount',
    'onNoteAdd',
    'onNoteMove',
    'onNoteResize',
    'onNoteDelete',
    'className',
  ],
  host: {
    role: 'region',
    'data-mol-id': 'piano-roll',
    '[attr.aria-label]': 'rollLabel()',
    '[class]': 'classes()',
    '[style]': 'rootStyle',
  },
  // prettier-ignore
  template: `<div role="list" [attr.aria-label]="keysLabel()" data-mol-id="piano-roll-keys" [style]="keysColumnStyle()">@for (pitch of rows(); track pitch) {<div role="listitem" data-mol-id="piano-roll-key" [attr.data-pitch]="pitch" [attr.data-key-color]="isBlackKey(pitch) ? 'black' : 'white'" [style]="keyStyle(isBlackKey(pitch))">@if (isC(pitch)) {<span data-mol-id="piano-roll-key-label" [class]="keyLabelClasses()">{{ pitchLabel(pitch) }}</span>}</div>}</div><div #grid role="application" [attr.aria-label]="gridLabel()" [attr.aria-describedby]="gridHelpId" data-mol-id="piano-roll-grid" [attr.data-snap]="snapValue()" [style]="gridSurfaceStyle()" tabindex="0" (click)="handleGridClick($event)" (keydown)="handleGridKeyDown($event)" (focusin)="setGridFocused(true)" (focusout)="setGridFocused(false)">@for (pitch of rows(); track pitch) {<div data-mol-id="piano-roll-row" [attr.data-pitch]="pitch" [attr.data-key-color]="isBlackKey(pitch) ? 'black' : 'white'" [style]="rowStyle(pitch)"></div>}@for (beat of beatLines(); track beat) {<div data-mol-id="piano-roll-beat-line" [attr.data-beat]="beat" [attr.data-bar]="beat % 4 === 0 ? 'true' : 'false'" [style]="lineStyle(beat)"></div>}@if (showsCursor()) {<div data-mol-id="piano-roll-cell-cursor" aria-hidden="true" [style]="cursorStyle()"></div>}<div [attr.id]="gridHelpId" [class]="srOnlyClass()">{{ gridHelpLabel() }}</div>@if (showsStatus()) {<div role="status" [class]="srOnlyClass()">{{ cursorLabel() }}</div>}@for (note of notes; track note.id) {<div role="button" tabindex="0" [attr.aria-label]="noteAria(note)" data-mol-id="piano-roll-note" [attr.data-note-id]="note.id" [attr.data-pitch]="note.pitch" [attr.data-start-beat]="note.startBeat" [attr.data-duration-beats]="note.durationBeats" [class]="noteClasses()" [style]="noteStyle(note)" (pointerdown)="beginDrag($event, note, 'move')" (contextmenu)="handleNoteContextMenu($event, note)"><div role="separator" [attr.aria-label]="resizeLabel()" data-mol-id="piano-roll-note-handle" [style]="handleStyle" (pointerdown)="beginDrag($event, note, 'resize')"></div></div>}</div>`,
})
export class PianoRoll implements OnInit, OnDestroy {
  /** MIDI notes rendered on the grid, in display order. */
  notes: MidiNote[] = []
  /** Horizontal scale in pixels per beat (defaults to 80 at render time). */
  pixelsPerBeat?: number
  /** Row height in pixels per pitch (defaults to 20 at render time). */
  noteHeight?: number
  /** Lowest visible pitch (defaults to 21 at render time). */
  lowestPitch?: number
  /** Highest visible pitch (defaults to 108 at render time). */
  highestPitch?: number
  /** Snap resolution (defaults to `'1/16'` at render time). */
  snap?: PianoRollSnap
  /** Beats the time grid covers (auto-sized from the notes when omitted). */
  beatsCount?: number
  /** Called with a freshly-painted note. */
  onNoteAdd?: PianoRollProps['onNoteAdd']
  /** Called with the new geometry when a note body is dragged. */
  onNoteMove?: PianoRollProps['onNoteMove']
  /** Called with the new duration when a note's right-edge handle is dragged. */
  onNoteResize?: PianoRollProps['onNoteResize']
  /** Called with the note id when a note is right-clicked. */
  onNoteDelete?: PianoRollProps['onNoteDelete']
  /** Extra classes merged onto the root element. */
  className?: string

  /** The grid surface, whose bounding box turns a click into a beat + pitch. */
  @ViewChild('grid') gridRef?: ElementRef<HTMLDivElement>

  /**
   * The visually hidden grid-description element's id, which the grid's
   * `aria-describedby` names (React derives it from `useId()`; a per-instance
   * counter gives each instance its own).
   */
  readonly gridHelpId = `piano-roll-grid-help-${nextGridHelpId++}`

  /** The i18n state; `t` re-reads the provider on every call and on every locale switch. */
  private readonly i18n = useTranslation()

  /** The drag gesture in progress, or null. */
  private drag: DragState | null = null

  /** The keyboard cell cursor (the cell Enter / Space paint into), in raw beats + pitch. */
  private readonly rawCursor = signal({ beat: 0, pitch: 108 })

  /** `true` while the grid surface (or a child) has focus. */
  private readonly gridFocused = signal(false)

  /** React's root inline geometry (constant for every render). */
  readonly rootStyle: Record<string, string> = {
    display: 'flex',
    'align-items': 'stretch',
    width: '100%',
    overflow: 'auto',
    position: 'relative',
  }

  /** The resize handle's inline geometry (React's `handleStyle`). */
  readonly handleStyle: Record<string, string> = {
    position: 'absolute',
    top: '0px',
    right: '0px',
    bottom: '0px',
    width: '6px',
    cursor: 'ew-resize',
    'touch-action': 'none',
  }

  /**
   * Seeds the keyboard cell cursor from the mounted props and registers the
   * global drag listeners, as React's effect does on mount.
   */
  ngOnInit(): void {
    this.rawCursor.set({ beat: 0, pitch: this.highestPitch ?? 108 })
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
  }

  /** Removes the global drag listeners, as React's effect cleanup does. */
  ngOnDestroy(): void {
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
  }

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root element's class list (React's root `cm.cn`).
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The piano-key label span's class list.
   *
   * @returns The class string.
   */
  keyLabelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * One note block's class list.
   *
   * @returns The class string.
   */
  noteClasses(): string {
    return this.cm().cn(this.cm().cursorPointer)
  }

  /**
   * The screen-reader-only status class.
   *
   * @returns The class string.
   */
  srOnlyClass(): string {
    return this.cm().cn(this.cm().srOnly)
  }

  /**
   * The derived grid geometry for the current props.
   *
   * @returns The geometry of one render.
   */
  geometry(): Geometry {
    const pixelsPerBeat = this.pixelsPerBeat ?? 80
    const noteHeight = this.noteHeight ?? 20
    const lowestPitch = this.lowestPitch ?? 21
    const highestPitch = this.highestPitch ?? 108
    const snap = this.snap ?? '1/16'
    const safeHighest = Math.max(highestPitch, lowestPitch)
    const safeLowest = Math.min(highestPitch, lowestPitch)
    const rowCount = safeHighest - safeLowest + 1
    const gridHeight = rowCount * noteHeight
    // Auto-size the grid width to fit the longest note when `beatsCount` is
    // omitted; pad to a sensible minimum so empty rolls are usable.
    const computedBeats =
      this.beatsCount ??
      Math.max(
        16,
        Math.ceil(
          this.notes.reduce(
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
   * @returns The clamped cursor.
   */
  cursor(): { beat: number; pitch: number } {
    const grid = this.geometry()
    const raw = this.rawCursor()
    return {
      beat: Math.max(0, Math.min(raw.beat, grid.computedBeats)),
      pitch: Math.max(grid.safeLowest, Math.min(grid.safeHighest, raw.pitch)),
    }
  }

  /**
   * The snap resolution in effect.
   *
   * @returns The snap setting.
   */
  snapValue(): PianoRollSnap {
    return this.snap ?? '1/16'
  }

  /** The pitch rows, top-to-bottom (highest first). */
  rows(): number[] {
    const grid = this.geometry()
    const list: number[] = []
    for (let pitch = grid.safeHighest; pitch >= grid.safeLowest; pitch--) list.push(pitch)
    return list
  }

  /** The beatline indices — `Array.from` floors a fractional count, as React does. */
  beatLines(): number[] {
    return Array.from(
      { length: Math.max(0, this.geometry().computedBeats) + 1 },
      (_v, beat) => beat,
    )
  }

  /**
   * Whether a pitch is a C (the only keys that carry a label).
   *
   * @param pitch - MIDI pitch number.
   * @returns True for a C pitch class.
   */
  isC(pitch: number): boolean {
    return ((pitch % 12) + 12) % 12 === 0
  }

  /**
   * Whether a pitch is a black key.
   *
   * @param pitch - MIDI pitch number.
   * @returns True for a black key.
   */
  isBlackKey(pitch: number): boolean {
    return isBlackKey(pitch)
  }

  /**
   * Format a MIDI pitch as a scientific-pitch-notation label.
   *
   * @param pitch - MIDI pitch number.
   * @returns The label.
   */
  pitchLabel(pitch: number): string {
    return pitchLabel(pitch)
  }

  /** Whether the keyboard cell cursor highlight renders (React's condition). */
  showsCursor(): boolean {
    return !!this.onNoteAdd && this.gridFocused()
  }

  /** Whether the keyboard cursor announcement renders (React's condition). */
  showsStatus(): boolean {
    return !!this.onNoteAdd
  }

  /**
   * Track the grid's focus, as React's `onFocus` / `onBlur` do.
   *
   * @param focused - Whether the grid (or a child) now holds focus.
   */
  setGridFocused(focused: boolean): void {
    this.gridFocused.set(focused)
  }

  /**
   * The translated region label (React's `pianoRoll.aria.roll`).
   *
   * @returns The translated label.
   */
  rollLabel(): string {
    return this.i18n.t('pianoRoll.aria.roll', {}, { defaultValue: 'Piano roll' })
  }

  /**
   * The translated keys-column label (React's `pianoRoll.aria.keys`).
   *
   * @returns The translated label.
   */
  keysLabel(): string {
    return this.i18n.t('pianoRoll.aria.keys', {}, { defaultValue: 'Piano keys' })
  }

  /**
   * The translated grid label (React's `pianoRoll.aria.grid`).
   *
   * @returns The translated label.
   */
  gridLabel(): string {
    return this.i18n.t('pianoRoll.aria.grid', {}, { defaultValue: 'Note grid' })
  }

  /**
   * The translated grid keyboard help (React's `pianoRoll.aria.gridHelp`).
   *
   * @returns The translated text.
   */
  gridHelpLabel(): string {
    return this.i18n.t(
      'pianoRoll.aria.gridHelp',
      {},
      { defaultValue: 'The arrow keys move the cell cursor, Enter or Space paints a note at it.' },
    )
  }

  /**
   * The translated resize-handle label (React's `pianoRoll.aria.resize`).
   *
   * @returns The translated label.
   */
  resizeLabel(): string {
    return this.i18n.t('pianoRoll.aria.resize', {}, { defaultValue: 'Resize note' })
  }

  /**
   * The translated cell-cursor announcement (React's `pianoRoll.aria.cursor`).
   *
   * @returns The translated text.
   */
  cursorLabel(): string {
    const cursor = this.cursor()
    return this.i18n.t(
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
  noteAria(note: MidiNote): string {
    return this.i18n.t(
      'pianoRoll.aria.note',
      {
        pitch: pitchLabel(note.pitch),
        startBeat: note.startBeat.toFixed(2),
        durationBeats: note.durationBeats.toFixed(2),
      },
      { defaultValue: 'Note {{pitch}} starting at beat {{startBeat}} for {{durationBeats}} beats' },
    )
  }

  /**
   * The keys column's inline geometry (React's `keysColumnStyle`).
   *
   * @returns The style declarations.
   */
  keysColumnStyle(): Record<string, string> {
    return {
      width: `${PIANO_KEYS_WIDTH_PX}px`,
      'min-width': `${PIANO_KEYS_WIDTH_PX}px`,
      height: `${this.geometry().gridHeight}px`,
      position: 'sticky',
      left: '0px',
      'z-index': '2',
      background: 'var(--mol-piano-roll-keys-bg, #f6f6f8)',
      color: 'currentcolor',
    }
  }

  /**
   * One piano key's inline geometry (React's `keyStyle`).
   *
   * @param black - Whether the key is black.
   * @returns The style declarations.
   */
  keyStyle(black: boolean): Record<string, string> {
    return {
      position: 'relative',
      height: `${this.geometry().noteHeight}px`,
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
  }

  /**
   * One pitch row's inline geometry (React's `rowStyle`).
   *
   * @param pitch - The row's pitch.
   * @returns The style declarations.
   */
  rowStyle(pitch: number): Record<string, string> {
    const grid = this.geometry()
    return {
      position: 'absolute',
      left: '0px',
      right: '0px',
      top: `${pitchToY(pitch, grid.noteHeight, grid.safeHighest)}px`,
      height: `${grid.noteHeight}px`,
      background: isBlackKey(pitch) ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
      'border-bottom': '1px solid rgba(0, 0, 0, 0.04)',
      'pointer-events': 'none',
    }
  }

  /**
   * One beat gridline's inline geometry (React's `lineStyle`).
   *
   * @param beat - The beat index.
   * @returns The style declarations.
   */
  lineStyle(beat: number): Record<string, string> {
    return {
      position: 'absolute',
      top: '0px',
      bottom: '0px',
      left: `${beatsToPixels(beat, this.geometry().pixelsPerBeat)}px`,
      width: '1px',
      background: beat % 4 === 0 ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.06)',
      'pointer-events': 'none',
    }
  }

  /**
   * The cell cursor's inline geometry (React's cursor style).
   *
   * @returns The style declarations.
   */
  cursorStyle(): Record<string, string> {
    const grid = this.geometry()
    const cursor = this.cursor()
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
   * @returns The style declarations.
   */
  gridSurfaceStyle(): Record<string, string> {
    const grid = this.geometry()
    const width = `${beatsToPixels(grid.computedBeats, grid.pixelsPerBeat)}px`
    return {
      position: 'relative',
      width,
      'min-width': width,
      height: `${grid.gridHeight}px`,
      background: 'var(--mol-piano-roll-grid-bg, #ffffff)',
      cursor: this.onNoteAdd ? 'crosshair' : 'default',
      'touch-action': 'pan-y',
      'user-select': 'none',
    }
  }

  /**
   * One note block's inline geometry (React's `noteStyle`).
   *
   * @param note - The note.
   * @returns The style declarations.
   */
  noteStyle(note: MidiNote): Record<string, string> {
    const grid = this.geometry()
    const velocity = Math.max(0, Math.min(127, note.velocity ?? DEFAULT_NOTE_VELOCITY))
    return {
      position: 'absolute',
      left: `${beatsToPixels(note.startBeat, grid.pixelsPerBeat)}px`,
      width: `${Math.max(2, beatsToPixels(note.durationBeats, grid.pixelsPerBeat))}px`,
      top: `${pitchToY(note.pitch, grid.noteHeight, grid.safeHighest) + 1}px`,
      height: `${Math.max(2, grid.noteHeight - 2)}px`,
      background: 'var(--mol-piano-roll-note-bg, #5b8def)',
      opacity: String(0.45 + (velocity / 127) * 0.55),
      'border-radius': '3px',
      'box-sizing': 'border-box',
      cursor: 'grab',
      'touch-action': 'none',
    }
  }

  /**
   * Paint a new note at an exact cell: `startBeat` + `pitch`, with the
   * configured snap-step duration and the default velocity.
   *
   * @param startBeat - Snapped start beat of the new note.
   * @param pitch - MIDI pitch of the row to paint into.
   */
  private paintNoteAt(startBeat: number, pitch: number): void {
    const onNoteAdd = this.onNoteAdd
    if (!onNoteAdd) return
    const id = `note-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
    onNoteAdd({
      id,
      pitch,
      startBeat,
      durationBeats: snapToBeats(this.geometry().snap),
      velocity: DEFAULT_NOTE_VELOCITY,
    })
  }

  /**
   * Click handler on the empty grid: paints a new note at the snapped cell
   * under the cursor and moves the keyboard cell cursor to that cell.
   *
   * @param event - The native click event from the grid surface.
   */
  handleGridClick(event: MouseEvent): void {
    // Suppress synthetic clicks fired at the end of a drag.
    if (this.drag && this.drag.moved) return
    if (!this.onNoteAdd) return
    const node = this.gridRef?.nativeElement
    if (!node) return
    const grid = this.geometry()
    const rect = node.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
    const startBeat = snapBeat(pixelsToBeats(x, grid.pixelsPerBeat), grid.snap)
    const pitch = yToPitch(y, grid.noteHeight, grid.safeHighest, grid.safeLowest)
    this.rawCursor.set({ beat: startBeat, pitch })
    this.paintNoteAt(startBeat, pitch)
  }

  /**
   * Keyboard handler on the grid surface: the arrow keys move the cell
   * cursor, and Enter or Space paints a new note at the cursor cell.
   *
   * @param event - The native keydown event from the grid surface.
   */
  handleGridKeyDown(event: KeyboardEvent): void {
    if (!this.onNoteAdd) return
    // Only the grid surface itself drives the cell cursor — a keydown
    // bubbling from a focused note child belongs to that note.
    if (event.target !== event.currentTarget) return
    const grid = this.geometry()
    const cursor = this.cursor()
    if (event.key === 'Enter' || event.key === ' ') {
      // Ignore key auto-repeat so holding the key doesn't flood the roll
      // with notes; each press paints exactly one note.
      event.preventDefault()
      if (!event.repeat) this.paintNoteAt(cursor.beat, cursor.pitch)
      return
    }
    switch (event.key) {
      case 'ArrowLeft':
        this.rawCursor.set({ ...cursor, beat: cursor.beat - snapToBeats(grid.snap) })
        break
      case 'ArrowRight':
        this.rawCursor.set({ ...cursor, beat: cursor.beat + snapToBeats(grid.snap) })
        break
      case 'ArrowUp':
        this.rawCursor.set({ ...cursor, pitch: cursor.pitch + 1 })
        break
      case 'ArrowDown':
        this.rawCursor.set({ ...cursor, pitch: cursor.pitch - 1 })
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
  handleNoteContextMenu(event: MouseEvent, note: MidiNote): void {
    if (!this.onNoteDelete) return
    event.preventDefault()
    event.stopPropagation()
    this.onNoteDelete(note.id)
  }

  /**
   * Begin a drag gesture on a note body or a resize handle.
   *
   * @param event - The native pointer event from the note element.
   * @param note - The note being dragged.
   * @param mode - `'move'` for body drags, `'resize'` for handle drags.
   */
  beginDrag(event: PointerEvent, note: MidiNote, mode: DragState['mode']): void {
    if (event.button !== undefined && event.button !== 0) return
    event.stopPropagation()
    this.drag = {
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
  private readonly onMove = (event: PointerEvent): void => {
    const current = this.drag
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
    const grid = this.geometry()
    if (current.mode === 'move') {
      const beatDelta = pixelsToBeats(dx, grid.pixelsPerBeat)
      const nextStart = snapBeatRound(current.originStartBeat + beatDelta, grid.snap)
      const rowDelta = Math.round(dy / Math.max(grid.noteHeight, 1))
      // Higher rows on screen = higher pitch numbers. Dragging down
      // (positive dy) decreases pitch.
      const proposedPitch = current.originPitch - rowDelta
      const nextPitch = Math.max(grid.safeLowest, Math.min(grid.safeHighest, proposedPitch))
      this.onNoteMove?.(current.noteId, nextStart, nextPitch)
    } else {
      const beatDelta = pixelsToBeats(dx, grid.pixelsPerBeat)
      const nextDuration = Math.max(
        MIN_NOTE_DURATION_BEATS,
        snapBeatRound(current.originDurationBeats + beatDelta, grid.snap) ||
          MIN_NOTE_DURATION_BEATS,
      )
      this.onNoteResize?.(current.noteId, nextDuration)
    }
  }

  /**
   * Native pointerup / pointercancel handler that closes the drag gesture.
   *
   * @param event - Native pointer event.
   */
  private readonly onUp = (event: PointerEvent): void => {
    const current = this.drag
    if (!current || event.pointerId !== current.pointerId) return
    this.drag = null
  }
}
