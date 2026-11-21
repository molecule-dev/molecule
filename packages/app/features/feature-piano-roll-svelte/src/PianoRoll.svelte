<!--
  PianoRoll: the Svelte counterpart of `@molecule/app-feature-piano-roll-react`'s
  `PianoRoll` — vertical piano keys + horizontal time grid + draggable /
  resizable note rectangles. Same props (React names), same DOM for the same
  input, same callback calls; every visible string comes from
  `useTranslation()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
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

  let {
    notes,
    pixelsPerBeat,
    noteHeight,
    lowestPitch,
    highestPitch,
    snap,
    beatsCount,
    onNoteAdd,
    onNoteMove,
    onNoteResize,
    onNoteDelete,
    className,
  }: PianoRollProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Generated id (never derived from data — React's `useId()`; Svelte allows
  // one `$props.id()` per component, so the grid description id derives from
  // it): the visually hidden element's id, wired to the grid's
  // `aria-describedby`.
  const baseId = $props.id()
  const gridHelpId = `${baseId}-grid-help`

  /** The pointer state of one drag gesture, kept between the window listeners. */
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

  /** The derived grid geometry of one render. */
  interface Geometry {
    pixelsPerBeat: number
    noteHeight: number
    snap: PianoRollSnap
    safeHighest: number
    safeLowest: number
    rowCount: number
    gridHeight: number
    computedBeats: number
  }

  let gridEl = $state<HTMLDivElement>()
  let drag: DragState | null = null

  /**
   * React's initial keyboard cursor: beat 0 at the mounted top-most pitch.
   * `useState`'s initializer runs once, so this is read once at mount (never a
   * running capture of the prop).
   *
   * @returns The raw cursor state.
   */
  function initialCursor(): { beat: number; pitch: number } {
    return { beat: 0, pitch: highestPitch ?? 108 }
  }

  // The keyboard cell cursor (the cell Enter / Space paint into), in raw
  // beats + pitch. Mouse clicks move it too, so the keyboard path continues
  // where the mouse left off.
  let rawCursor = $state(initialCursor())
  // `true` while the grid surface (or a child) has focus — drives the visible
  // cell-cursor highlight.
  let gridFocused = $state(false)

  /**
   * The derived grid geometry for the current props.
   *
   * @returns The geometry of one render.
   */
  function geometry(): Geometry {
    const scale = pixelsPerBeat ?? 80
    const rowHeight = noteHeight ?? 20
    const lowest = lowestPitch ?? 21
    const highest = highestPitch ?? 108
    const resolution = snap ?? '1/16'
    const safeHighest = Math.max(highest, lowest)
    const safeLowest = Math.min(highest, lowest)
    const rowCount = safeHighest - safeLowest + 1
    const gridHeight = rowCount * rowHeight
    // Auto-size the grid width to fit the longest note when `beatsCount` is
    // omitted; pad to a sensible minimum so empty rolls are usable.
    const computedBeats =
      beatsCount ??
      Math.max(
        16,
        Math.ceil(
          notes.reduce((max, n) => Math.max(max, (n.startBeat ?? 0) + (n.durationBeats ?? 0)), 0) +
            4,
        ),
      )
    return {
      pixelsPerBeat: scale,
      noteHeight: rowHeight,
      snap: resolution,
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
      beat: Math.max(0, Math.min(rawCursor.beat, grid.computedBeats)),
      pitch: Math.max(grid.safeLowest, Math.min(grid.safeHighest, rawCursor.pitch)),
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
    if (!onNoteAdd) return
    const node = gridEl
    if (!node) return
    const grid = geometry()
    const rect = node.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
    const startBeat = snapBeat(pixelsToBeats(x, grid.pixelsPerBeat), grid.snap)
    const pitch = yToPitch(y, grid.noteHeight, grid.safeHighest, grid.safeLowest)
    rawCursor = { beat: startBeat, pitch }
    paintNoteAt(startBeat, pitch)
  }

  /**
   * Keyboard handler on the grid surface: the arrow keys move the cell
   * cursor, and Enter or Space paints a new note at the cursor cell.
   *
   * @param event - The native keydown event from the grid surface.
   */
  function handleGridKeyDown(event: KeyboardEvent): void {
    if (!onNoteAdd) return
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
        rawCursor = { ...cursor, beat: cursor.beat - snapToBeats(grid.snap) }
        break
      case 'ArrowRight':
        rawCursor = { ...cursor, beat: cursor.beat + snapToBeats(grid.snap) }
        break
      case 'ArrowUp':
        rawCursor = { ...cursor, pitch: cursor.pitch + 1 }
        break
      case 'ArrowDown':
        rawCursor = { ...cursor, pitch: cursor.pitch - 1 }
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
      onNoteMove?.(current.noteId, nextStart, nextPitch)
    } else {
      const beatDelta = pixelsToBeats(dx, grid.pixelsPerBeat)
      const nextDuration = Math.max(
        MIN_NOTE_DURATION_BEATS,
        snapBeatRound(current.originDurationBeats + beatDelta, grid.snap) ||
          MIN_NOTE_DURATION_BEATS,
      )
      onNoteResize?.(current.noteId, nextDuration)
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

  $effect(() => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
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
  function cursorLabel(): string {
    const cursor = clampedCursor(geometry())
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
  function noteAria(note: MidiNote): string {
    return t(
      'pianoRoll.aria.note',
      {
        pitch: pitchLabel(note.pitch),
        startBeat: note.startBeat.toFixed(2),
        durationBeats: note.durationBeats.toFixed(2),
      },
      { defaultValue: 'Note {{pitch}} starting at beat {{startBeat}} for {{durationBeats}} beats' },
    )
  }

  /** The pitch rows, top-to-bottom (highest first). */
  function rows(): number[] {
    const grid = geometry()
    const list: number[] = []
    for (let pitch = grid.safeHighest; pitch >= grid.safeLowest; pitch--) list.push(pitch)
    return list
  }

  /** The beatline indices — `Array.from` floors a fractional count, as React does. */
  const beatLines = (): number[] =>
    Array.from({ length: Math.max(0, geometry().computedBeats) + 1 }, (_v, beat) => beat)

  /**
   * One piano key's inline geometry (React's `keyStyle`).
   *
   * @param black - Whether the key is black.
   * @returns The style declarations.
   */
  function keyStyle(black: boolean): string {
    return [
      'position: relative',
      `height: ${geometry().noteHeight}px`,
      'box-sizing: border-box',
      `background: ${black ? 'var(--mol-piano-roll-key-black, #2b2b34)' : 'var(--mol-piano-roll-key-white, #ffffff)'}`,
      `color: ${black ? 'var(--mol-piano-roll-key-black-fg, #f6f6f8)' : 'var(--mol-piano-roll-key-white-fg, #2b2b34)'}`,
      'border-bottom: 1px solid rgba(0, 0, 0, 0.08)',
      'padding-left: 6px',
      'padding-right: 6px',
      'display: flex',
      'align-items: center',
      'font-size: 10px',
      'line-height: 1',
    ].join('; ')
  }

  /**
   * One pitch row's inline geometry (React's `rowStyle`) except its
   * background: the `style:` directive sets that per property, so an
   * unrendered `transparent` is kept in the attribute as React keeps it.
   *
   * @param pitch - The row's pitch.
   * @returns The style declarations.
   */
  function rowStyle(pitch: number): string {
    const grid = geometry()
    return [
      'position: absolute',
      'left: 0px',
      'right: 0px',
      `top: ${pitchToY(pitch, grid.noteHeight, grid.safeHighest)}px`,
      `height: ${grid.noteHeight}px`,
      'border-bottom: 1px solid rgba(0, 0, 0, 0.04)',
      'pointer-events: none',
    ].join('; ')
  }

  /**
   * One pitch row's background tint (black-key rows are slightly darker).
   *
   * @param pitch - The row's pitch.
   * @returns The background value.
   */
  function rowBackground(pitch: number): string {
    return isBlackKey(pitch) ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
  }

  /**
   * One beat gridline's inline geometry (React's `lineStyle`).
   *
   * @param beat - The beat index.
   * @returns The style declarations.
   */
  function lineStyle(beat: number): string {
    return [
      'position: absolute',
      'top: 0px',
      'bottom: 0px',
      `left: ${beatsToPixels(beat, geometry().pixelsPerBeat)}px`,
      'width: 1px',
      `background: ${beat % 4 === 0 ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.06)'}`,
      'pointer-events: none',
    ].join('; ')
  }

  /** The cell cursor's inline geometry (React's cursor style). */
  function cursorStyle(): string {
    const grid = geometry()
    const cursor = clampedCursor(grid)
    return [
      'position: absolute',
      `left: ${beatsToPixels(cursor.beat, grid.pixelsPerBeat)}px`,
      `top: ${pitchToY(cursor.pitch, grid.noteHeight, grid.safeHighest)}px`,
      `width: ${beatsToPixels(snapToBeats(grid.snap), grid.pixelsPerBeat)}px`,
      `height: ${grid.noteHeight}px`,
      'border: 2px solid var(--mol-piano-roll-note-bg, #5b8def)',
      'border-radius: 3px',
      'box-sizing: border-box',
      'pointer-events: none',
    ].join('; ')
  }

  /** The grid surface's inline geometry (React's `gridSurfaceStyle`). */
  function gridSurfaceStyle(): string {
    const grid = geometry()
    const width = beatsToPixels(grid.computedBeats, grid.pixelsPerBeat)
    return [
      'position: relative',
      `width: ${width}px`,
      `min-width: ${width}px`,
      `height: ${grid.gridHeight}px`,
      'background: var(--mol-piano-roll-grid-bg, #ffffff)',
      `cursor: ${onNoteAdd ? 'crosshair' : 'default'}`,
      'touch-action: pan-y',
      'user-select: none',
    ].join('; ')
  }

  /**
   * One note block's inline geometry (React's `noteStyle`).
   *
   * @param note - The note.
   * @returns The style declarations.
   */
  function noteStyle(note: MidiNote): string {
    const grid = geometry()
    const velocity = Math.max(0, Math.min(127, note.velocity ?? DEFAULT_NOTE_VELOCITY))
    const opacity = 0.45 + (velocity / 127) * 0.55
    return [
      'position: absolute',
      `left: ${beatsToPixels(note.startBeat, grid.pixelsPerBeat)}px`,
      `width: ${Math.max(2, beatsToPixels(note.durationBeats, grid.pixelsPerBeat))}px`,
      `top: ${pitchToY(note.pitch, grid.noteHeight, grid.safeHighest) + 1}px`,
      `height: ${Math.max(2, grid.noteHeight - 2)}px`,
      'background: var(--mol-piano-roll-note-bg, #5b8def)',
      `opacity: ${opacity}`,
      'border-radius: 3px',
      'box-sizing: border-box',
      'cursor: grab',
      'touch-action: none',
    ].join('; ')
  }
</script>

<div
  role="region"
  aria-label={rollLabel()}
  data-mol-id="piano-roll"
  class={cm.cn(className)}
  style="align-items: stretch; display: flex; overflow: auto; position: relative; width: 100%"
>
  <!-- Vertical piano keyboard. -->
  <div
    role="list"
    aria-label={keysLabel()}
    data-mol-id="piano-roll-keys"
    style="background: var(--mol-piano-roll-keys-bg, #f6f6f8); color: currentcolor; height: {geometry()
      .gridHeight}px; left: 0px; min-width: {PIANO_KEYS_WIDTH_PX}px; position: sticky; width: {PIANO_KEYS_WIDTH_PX}px; z-index: 2"
  >
    {#each rows() as pitch (pitch)}
      <div
        role="listitem"
        data-mol-id="piano-roll-key"
        data-pitch={pitch}
        data-key-color={isBlackKey(pitch) ? 'black' : 'white'}
        style={keyStyle(isBlackKey(pitch))}
      >
        {#if ((pitch % 12) + 12) % 12 === 0}
          <span data-mol-id="piano-roll-key-label" class={cm.cn(cm.textSize('xs'))}
            >{pitchLabel(pitch)}</span
          >
        {/if}
      </div>
    {/each}
  </div>

  <!-- Note grid + drawn notes. A free two-dimensional surface driven by the
       keyboard cell cursor, so it is an `application`, not a `grid`: it holds
       no `row`s of `gridcell`s. The grid is focusable and key-handled, as in
       React: the WAI-ARIA 1.2 `application` role carries its keyboard
       interface itself, which the compiler classifies as a structure role. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={gridEl}
    role="application"
    aria-label={gridLabel()}
    aria-describedby={gridHelpId}
    data-mol-id="piano-roll-grid"
    data-snap={geometry().snap}
    style={gridSurfaceStyle()}
    tabindex="0"
    onclick={(event) => handleGridClick(event)}
    onkeydown={(event) => handleGridKeyDown(event)}
    onfocusin={() => (gridFocused = true)}
    onfocusout={() => (gridFocused = false)}
  >
    <!-- Horizontal pitch rows — alternate row tint for black keys. -->
    {#each rows() as pitch (pitch)}
      <div
        data-mol-id="piano-roll-row"
        data-pitch={pitch}
        data-key-color={isBlackKey(pitch) ? 'black' : 'white'}
        style={rowStyle(pitch)}
        style:background={rowBackground(pitch)}
      ></div>
    {/each}

    <!-- Vertical beat gridlines — one line per beat (slightly heavier on the
         bar boundary every 4 beats). -->
    {#each beatLines() as beat (beat)}
      <div
        data-mol-id="piano-roll-beat-line"
        data-beat={beat}
        data-bar={beat % 4 === 0 ? 'true' : 'false'}
        style={lineStyle(beat)}
      ></div>
    {/each}

    <!-- Keyboard cell cursor — visible while the grid has focus. -->
    {#if onNoteAdd && gridFocused}
      <div data-mol-id="piano-roll-cell-cursor" aria-hidden="true" style={cursorStyle()}></div>
    {/if}

    <!-- Describes the grid's keyboard interface to assistive technology.
         Rendered unconditionally so aria-describedby always resolves. -->
    <div id={gridHelpId} class={cm.srOnly}>{gridHelpLabel()}</div>

    <!-- Announces keyboard cursor moves to assistive technology. -->
    {#if onNoteAdd}
      <div role="status" class={cm.srOnly}>{cursorLabel()}</div>
    {/if}

    <!-- Notes — drawn on top of the grid. -->
    {#each notes as note (note.id)}
      <div
        role="button"
        tabindex="0"
        aria-label={noteAria(note)}
        data-mol-id="piano-roll-note"
        data-note-id={note.id}
        data-pitch={note.pitch}
        data-start-beat={note.startBeat}
        data-duration-beats={note.durationBeats}
        class={cm.cn(cm.cursorPointer)}
        style={noteStyle(note)}
        onpointerdown={(event) => beginDrag(event, note, 'move')}
        oncontextmenu={(event) => handleNoteContextMenu(event, note)}
      >
        <div
          role="separator"
          aria-label={resizeLabel()}
          data-mol-id="piano-roll-note-handle"
          style="bottom: 0px; cursor: ew-resize; position: absolute; right: 0px; top: 0px; touch-action: none; width: 6px"
          onpointerdown={(event) => beginDrag(event, note, 'resize')}
        ></div>
      </div>
    {/each}
  </div>
</div>
