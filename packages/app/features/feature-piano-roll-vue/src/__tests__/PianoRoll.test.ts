// @vitest-environment jsdom
/**
 * Unit tests for the Vue `PianoRoll` — a port of
 * `@molecule/app-feature-piano-roll-react/src/__tests__/PianoRoll.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        // `srOnly` is read as a property (a class string), never called — the
        // grid's description element and the cursor announcer carry it.
        if (prop === 'srOnly') return token
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default, with its `{{name}}` values filled in
// as the real provider does.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: unknown, opts?: { defaultValue?: string }) => {
      let text = opts?.defaultValue ?? _key
      if (values && typeof values === 'object')
        for (const [name, value] of Object.entries(values as Record<string, unknown>))
          text = text.replaceAll(`{{${name}}}`, String(value))
      return text
    },
  }),
}))

import { createApp, defineComponent, h, nextTick } from 'vue'

import {
  beatsToPixels,
  isBlackKey,
  type MidiNote,
  PianoRoll,
  type PianoRollProps,
  pitchLabel,
  pitchToY,
  pixelsToBeats,
  snapBeat,
  snapBeatRound,
  snapToBeats,
  yToPitch,
} from '../index.js'

/** The mounted app and its host element. */
interface Mounted {
  /** The host element the app mounted into. */
  container: HTMLElement
  /** Unmounts the app (and with it the component's window listeners). */
  unmount: () => void
}

/** The apps mounted by the current test, unmounted after it. */
let apps: Mounted[] = []

/**
 * Mounts a `PianoRoll` with the given props.
 *
 * @param props - Component props.
 * @returns The host element and its unmount function.
 */
function render(props: PianoRollProps): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(PianoRoll, props) }))
  app.mount(host)
  const mounted: Mounted = {
    container: host,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
  apps.push(mounted)
  return mounted
}

/**
 * Stub `getBoundingClientRect` on a node so jsdom returns a real-looking box.
 *
 * @param node - The DOM node to stub.
 * @param width - Box width in pixels.
 * @param height - Box height in pixels.
 */
function stubRect(node: HTMLElement, width: number, height: number): void {
  node.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
}

/**
 * Dispatch a real pointer event so the global window listener picks it up.
 *
 * @param target - Element to dispatch from (for pointerdown) or window (for move/up).
 * @param type - Event type.
 * @param init - Pointer init properties.
 */
function dispatchPointer(
  target: Element | Window,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: { clientX?: number; clientY?: number; pointerId?: number; button?: number },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    clientX: number
    clientY: number
    pointerId: number
    button: number
  }
  event.clientX = init.clientX ?? 0
  event.clientY = init.clientY ?? 0
  event.pointerId = init.pointerId ?? 1
  event.button = init.button ?? 0
  target.dispatchEvent(event)
}

/**
 * Give a grid element focus the way the conformance kit does (a bubbling
 * `focusin`).
 *
 * @param element - The grid surface.
 */
function focus(element: HTMLElement): void {
  element.focus()
  element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

/**
 * Take focus away from an element the way the conformance kit does (a
 * bubbling `focusout`).
 *
 * @param element - The grid surface.
 */
function blur(element: HTMLElement): void {
  element.blur()
  element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

/**
 * Dispatch a keydown on an element.
 *
 * @param element - The event target.
 * @param key - The `key` value.
 */
function keydown(element: HTMLElement, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * Click an element at viewport coordinates.
 *
 * @param element - The event target.
 * @param clientX - Viewport X.
 * @param clientY - Viewport Y.
 */
function clickAt(element: HTMLElement, clientX: number, clientY: number): void {
  element.dispatchEvent(new MouseEvent('click', { clientX, clientY, bubbles: true }))
}

beforeEach(() => {
  apps = []
})

afterEach(() => {
  for (const mounted of apps.splice(0)) mounted.unmount()
  document.body.innerHTML = ''
})

describe('snapToBeats', () => {
  it('maps each snap value to its beat width', () => {
    expect(snapToBeats('1/16')).toBe(0.25)
    expect(snapToBeats('1/8')).toBe(0.5)
    expect(snapToBeats('1/4')).toBe(1)
    expect(snapToBeats('1/2')).toBe(2)
    expect(snapToBeats('1')).toBe(4)
  })
})

describe('snapBeat', () => {
  it('floors to the nearest snap step', () => {
    expect(snapBeat(0.7, '1/4')).toBe(0)
    expect(snapBeat(1.2, '1/4')).toBe(1)
    expect(snapBeat(0.4, '1/16')).toBe(0.25)
  })
  it('clamps to non-negative', () => {
    expect(snapBeat(-1, '1/4')).toBe(0)
  })
  it('returns 0 for non-finite input', () => {
    expect(snapBeat(NaN, '1/4')).toBe(0)
    expect(snapBeat(Infinity, '1/4')).toBe(0)
  })
})

describe('snapBeatRound', () => {
  it('rounds to the nearest snap step', () => {
    expect(snapBeatRound(0.74, '1/4')).toBe(1)
    expect(snapBeatRound(0.49, '1/4')).toBe(0)
    expect(snapBeatRound(0.4, '1/16')).toBe(0.5)
    expect(snapBeatRound(0.1, '1/16')).toBe(0)
  })
  it('clamps to non-negative', () => {
    expect(snapBeatRound(-1, '1/4')).toBe(0)
  })
})

describe('pixelsToBeats / beatsToPixels', () => {
  it('round-trips through the same scale', () => {
    expect(pixelsToBeats(160, 80)).toBe(2)
    expect(beatsToPixels(2, 80)).toBe(160)
  })
  it('handles non-positive scale defensively', () => {
    expect(pixelsToBeats(80, 0)).toBe(80)
    expect(beatsToPixels(2, 0)).toBe(2)
  })
})

describe('yToPitch / pitchToY', () => {
  it('places the highest pitch at y = 0', () => {
    expect(yToPitch(0, 20, 108, 21)).toBe(108)
    expect(pitchToY(108, 20, 108)).toBe(0)
  })
  it('decreases pitch as y grows', () => {
    expect(yToPitch(20, 20, 108, 21)).toBe(107)
    expect(yToPitch(40, 20, 108, 21)).toBe(106)
    expect(pitchToY(60, 20, 108)).toBe((108 - 60) * 20)
  })
  it('clamps pitches into the visible range', () => {
    expect(yToPitch(-100, 20, 108, 21)).toBe(108)
    expect(yToPitch(100000, 20, 108, 21)).toBe(21)
  })
})

describe('isBlackKey / pitchLabel', () => {
  it('identifies sharps as black keys', () => {
    expect(isBlackKey(60)).toBe(false) // C4
    expect(isBlackKey(61)).toBe(true) // C#4
    expect(isBlackKey(63)).toBe(true) // D#4
    expect(isBlackKey(65)).toBe(false) // F4
    expect(isBlackKey(66)).toBe(true) // F#4
  })
  it('formats pitches as scientific-pitch-notation labels', () => {
    expect(pitchLabel(60)).toBe('C4')
    expect(pitchLabel(69)).toBe('A4')
    expect(pitchLabel(0)).toBe('C-1')
    expect(pitchLabel(127)).toBe('G9')
  })
})

describe('<PianoRoll>', () => {
  const sampleNotes: MidiNote[] = [
    { id: 'n1', pitch: 60, startBeat: 0, durationBeats: 1, velocity: 100 },
    { id: 'n2', pitch: 62, startBeat: 2, durationBeats: 0.5 },
  ]

  it('renders the piano keys column with one entry per pitch row', () => {
    const { container } = render({ notes: [], lowestPitch: 60, highestPitch: 71 })
    const keys = container.querySelectorAll('[data-mol-id="piano-roll-key"]')
    expect(keys.length).toBe(12)
    // Highest pitch (71 = B4) at the top.
    expect(keys[0].getAttribute('data-pitch')).toBe('71')
    expect(keys[keys.length - 1].getAttribute('data-pitch')).toBe('60')
  })

  it('renders pitch labels only on C notes', () => {
    const { container } = render({ notes: [], lowestPitch: 60, highestPitch: 72 })
    const labels = container.querySelectorAll('[data-mol-id="piano-roll-key-label"]')
    // Visible range 60..72 has C4 (60) and C5 (72) → two labels.
    expect(labels.length).toBe(2)
    expect(
      Array.from(labels)
        .map((l) => l.textContent)
        .sort(),
    ).toEqual(['C4', 'C5'])
  })

  it('marks black-key rows with data-key-color="black"', () => {
    const { container } = render({ notes: [], lowestPitch: 60, highestPitch: 72 })
    const black = container.querySelectorAll(
      '[data-mol-id="piano-roll-key"][data-key-color="black"]',
    )
    // C#, D#, F#, G#, A# in one octave → 5.
    expect(black.length).toBe(5)
  })

  it('renders one note element per supplied note', () => {
    const { container } = render({ notes: sampleNotes })
    const drawn = container.querySelectorAll('[data-mol-id="piano-roll-note"]')
    expect(drawn.length).toBe(2)
    expect(drawn[0].getAttribute('data-note-id')).toBe('n1')
    expect(drawn[1].getAttribute('data-note-id')).toBe('n2')
  })

  it('positions notes via the pixelsPerBeat / noteHeight scales', () => {
    const { container } = render({
      notes: sampleNotes,
      pixelsPerBeat: 80,
      noteHeight: 20,
      lowestPitch: 21,
      highestPitch: 108,
    })
    const drawn = container.querySelectorAll(
      '[data-mol-id="piano-roll-note"]',
    ) as NodeListOf<HTMLElement>
    // n1: startBeat=0 → left=0; pitch=60 → top=(108-60)*20+1
    expect(drawn[0].style.left).toBe('0px')
    expect(drawn[0].style.top).toBe(`${(108 - 60) * 20 + 1}px`)
    expect(drawn[0].style.width).toBe(`${80}px`)
    // n2: startBeat=2 → left=160
    expect(drawn[1].style.left).toBe('160px')
    expect(drawn[1].style.width).toBe(`${0.5 * 80}px`)
  })

  it('paints a new note via click on an empty cell, snapping to grid', () => {
    const onNoteAdd = vi.fn()
    const { container } = render({
      notes: [],
      pixelsPerBeat: 80,
      noteHeight: 20,
      lowestPitch: 60,
      highestPitch: 71,
      snap: '1/16',
      onNoteAdd,
    })
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    // 12 rows × 20px = 240px tall, 16 default beats × 80px = 1280px wide.
    stubRect(grid, 1280, 240)
    // Click at x=90 (≈ 1.125 beats — snaps down to 1.0), y=30 (row 1 from top = pitch 70).
    clickAt(grid, 90, 30)
    expect(onNoteAdd).toHaveBeenCalledTimes(1)
    const arg = onNoteAdd.mock.calls[0][0] as MidiNote
    expect(arg.startBeat).toBe(1)
    expect(arg.pitch).toBe(70)
    // Default duration is one snap step (1/16 = 0.25 beats).
    expect(arg.durationBeats).toBe(0.25)
    expect(typeof arg.id).toBe('string')
    expect(arg.velocity).toBeGreaterThan(0)
  })

  it('does not fire onNoteAdd when omitted', () => {
    const { container } = render({ notes: [] })
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    stubRect(grid, 1280, 1760)
    // No onNoteAdd → click should noop. We just assert it doesn't throw.
    expect(() => clickAt(grid, 50, 50)).not.toThrow()
  })

  it('grid is focusable; Enter paints a note at the home cell cursor', async () => {
    const onNoteAdd = vi.fn()
    const { container } = render({
      notes: [],
      pixelsPerBeat: 80,
      noteHeight: 20,
      lowestPitch: 60,
      highestPitch: 71,
      snap: '1/16',
      onNoteAdd,
    })
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    expect(grid.getAttribute('tabindex')).toBe('0')
    // The cell-cursor highlight only exists while the grid has focus.
    expect(container.querySelector('[data-mol-id="piano-roll-cell-cursor"]')).toBeNull()
    focus(grid)
    await nextTick()
    expect(container.querySelector('[data-mol-id="piano-roll-cell-cursor"]')).not.toBeNull()
    // Home cursor position: beat 0, top-most pitch (71 = B4).
    keydown(grid, 'Enter')
    expect(onNoteAdd).toHaveBeenCalledTimes(1)
    const arg = onNoteAdd.mock.calls[0][0] as MidiNote
    expect(arg.startBeat).toBe(0)
    expect(arg.pitch).toBe(71)
    expect(arg.durationBeats).toBe(0.25)
    expect(arg.velocity).toBeGreaterThan(0)
    // Blur hides the highlight again.
    blur(grid)
    await nextTick()
    expect(container.querySelector('[data-mol-id="piano-roll-cell-cursor"]')).toBeNull()
  })

  it('arrow keys move the cell cursor and Space paints at the cursor', async () => {
    const onNoteAdd = vi.fn()
    const { container } = render({
      notes: [],
      pixelsPerBeat: 80,
      noteHeight: 20,
      lowestPitch: 60,
      highestPitch: 71,
      snap: '1/16',
      onNoteAdd,
    })
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    // The cursor cell is announced for assistive technology.
    const statusText = (): string | null =>
      container.querySelector('[role="status"]')?.textContent ?? null
    expect(statusText()).toBe('Cursor on B4 at beat 0.00')
    focus(grid)
    keydown(grid, 'ArrowDown')
    await nextTick()
    expect(statusText()).toBe('Cursor on A#4 at beat 0.00')
    keydown(grid, 'ArrowRight')
    await nextTick()
    expect(statusText()).toBe('Cursor on A#4 at beat 0.25')
    keydown(grid, ' ')
    expect(onNoteAdd).toHaveBeenCalledTimes(1)
    const arg = onNoteAdd.mock.calls[0][0] as MidiNote
    expect(arg.startBeat).toBe(0.25)
    expect(arg.pitch).toBe(70)
  })

  it('clamps the cell cursor to the grid bounds', () => {
    const onNoteAdd = vi.fn()
    const { container } = render({
      notes: [],
      pixelsPerBeat: 80,
      noteHeight: 20,
      lowestPitch: 60,
      highestPitch: 71,
      snap: '1/16',
      onNoteAdd,
    })
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    focus(grid)
    // Left / Up from the home cell cannot leave the grid.
    for (let i = 0; i < 3; i++) keydown(grid, 'ArrowLeft')
    for (let i = 0; i < 3; i++) keydown(grid, 'ArrowUp')
    keydown(grid, 'Enter')
    expect(onNoteAdd).toHaveBeenCalledTimes(1)
    const first = onNoteAdd.mock.calls[0][0] as MidiNote
    expect(first.startBeat).toBe(0)
    expect(first.pitch).toBe(71)
  })

  it('clicking the grid moves the keyboard cursor to the clicked cell', () => {
    const onNoteAdd = vi.fn()
    const { container } = render({
      notes: [],
      pixelsPerBeat: 80,
      noteHeight: 20,
      lowestPitch: 60,
      highestPitch: 71,
      snap: '1/16',
      onNoteAdd,
    })
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    stubRect(grid, 1280, 240)
    focus(grid)
    // 12 rows × 20px = 240px tall, 16 default beats × 80px = 1280px wide.
    // Click at x=90 (≈ 1.125 beats — snaps down to 1.0), y=30 (pitch 70).
    clickAt(grid, 90, 30)
    expect(onNoteAdd).toHaveBeenCalledTimes(1)
    // The keyboard path continues where the mouse left off.
    keydown(grid, 'Enter')
    expect(onNoteAdd).toHaveBeenCalledTimes(2)
    const second = onNoteAdd.mock.calls[1][0] as MidiNote
    expect(second.startBeat).toBe(1)
    expect(second.pitch).toBe(70)
  })

  it('grid stays focusable without onNoteAdd but keyboard painting does nothing', () => {
    const onNoteAdd = vi.fn()
    const { container } = render({
      notes: [],
      lowestPitch: 60,
      highestPitch: 71,
      onNoteAdd: undefined,
    })
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    // The grid role is interactive, so it must remain focusable even
    // when painting is disabled.
    expect(grid.getAttribute('tabindex')).toBe('0')
    expect(() => focus(grid)).not.toThrow()
    expect(() => keydown(grid, 'Enter')).not.toThrow()
    expect(() => keydown(grid, 'ArrowRight')).not.toThrow()
    expect(container.querySelector('[data-mol-id="piano-roll-cell-cursor"]')).toBeNull()
    expect(onNoteAdd).not.toHaveBeenCalled()
  })

  it('fires onNoteMove when a note is dragged horizontally', () => {
    const onNoteMove = vi.fn()
    const note: MidiNote = { id: 'm1', pitch: 60, startBeat: 0, durationBeats: 1 }
    const { container } = render({
      notes: [note],
      pixelsPerBeat: 80,
      noteHeight: 20,
      snap: '1/4',
      onNoteMove,
    })
    const noteEl = container.querySelector('[data-mol-id="piano-roll-note"]') as HTMLElement
    dispatchPointer(noteEl, 'pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0 })
    // Move +80px horizontally → +1 beat. Snap=1/4 (1 beat), so startBeat → 1.
    dispatchPointer(window, 'pointermove', { pointerId: 1, clientX: 80, clientY: 0 })
    dispatchPointer(window, 'pointerup', { pointerId: 1, clientX: 80, clientY: 0 })
    expect(onNoteMove).toHaveBeenCalled()
    const last = onNoteMove.mock.calls[onNoteMove.mock.calls.length - 1]
    expect(last[0]).toBe('m1')
    expect(last[1]).toBe(1)
    expect(last[2]).toBe(60)
  })

  it('changes pitch when a note is dragged vertically by one row', () => {
    const onNoteMove = vi.fn()
    const note: MidiNote = { id: 'm1', pitch: 60, startBeat: 0, durationBeats: 1 }
    const { container } = render({
      notes: [note],
      pixelsPerBeat: 80,
      noteHeight: 20,
      lowestPitch: 21,
      highestPitch: 108,
      snap: '1/4',
      onNoteMove,
    })
    const noteEl = container.querySelector('[data-mol-id="piano-roll-note"]') as HTMLElement
    dispatchPointer(noteEl, 'pointerdown', { pointerId: 7, button: 0, clientX: 0, clientY: 0 })
    // Move +20px vertically → one row down → pitch 59.
    dispatchPointer(window, 'pointermove', { pointerId: 7, clientX: 0, clientY: 20 })
    dispatchPointer(window, 'pointerup', { pointerId: 7, clientX: 0, clientY: 20 })
    const last = onNoteMove.mock.calls[onNoteMove.mock.calls.length - 1]
    expect(last[2]).toBe(59)
  })

  it('fires onNoteResize when the right-edge handle is dragged', () => {
    const onNoteResize = vi.fn()
    const note: MidiNote = { id: 'r1', pitch: 60, startBeat: 0, durationBeats: 1 }
    const { container } = render({
      notes: [note],
      pixelsPerBeat: 80,
      noteHeight: 20,
      snap: '1/4',
      onNoteResize,
    })
    const handle = container.querySelector('[data-mol-id="piano-roll-note-handle"]') as HTMLElement
    dispatchPointer(handle, 'pointerdown', { pointerId: 2, button: 0, clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { pointerId: 2, clientX: 80, clientY: 0 })
    dispatchPointer(window, 'pointerup', { pointerId: 2, clientX: 80, clientY: 0 })
    expect(onNoteResize).toHaveBeenCalled()
    const last = onNoteResize.mock.calls[onNoteResize.mock.calls.length - 1]
    expect(last[0]).toBe('r1')
    expect(last[1]).toBe(2)
  })

  it('right-clicking a note fires onNoteDelete', () => {
    const onNoteDelete = vi.fn()
    const note: MidiNote = { id: 'd1', pitch: 60, startBeat: 0, durationBeats: 1 }
    const { container } = render({ notes: [note], onNoteDelete })
    const noteEl = container.querySelector('[data-mol-id="piano-roll-note"]') as HTMLElement
    noteEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    expect(onNoteDelete).toHaveBeenCalledWith('d1')
  })

  it('renders bar lines every 4 beats on the time grid', () => {
    const { container } = render({ notes: [], pixelsPerBeat: 40, beatsCount: 16 })
    const bars = container.querySelectorAll('[data-mol-id="piano-roll-beat-line"][data-bar="true"]')
    // 16 beats → bar lines at 0, 4, 8, 12, 16 → 5 lines.
    expect(bars.length).toBe(5)
  })

  it('exposes aria labels via i18n with English fallbacks', () => {
    const { container } = render({ notes: [] })
    const region = container.querySelector('[role="region"]')
    expect(region?.getAttribute('aria-label')).toBe('Piano roll')
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]')
    expect(grid?.getAttribute('aria-label')).toBe('Note grid')
    const keys = container.querySelector('[data-mol-id="piano-roll-keys"]')
    expect(keys?.getAttribute('aria-label')).toBe('Piano keys')
  })

  it('describes the grid keyboard interface via aria-describedby', () => {
    const { container } = render({ notes: [] })
    // The grid is a free two-dimensional surface, so it is an application,
    // not a grid: it holds no rows of gridcells.
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    expect(grid.getAttribute('role')).toBe('application')
    // Its keyboard interface is described by a visually hidden element the
    // aria-describedby attribute resolves to.
    const describedBy = grid.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const help = document.getElementById(describedBy as string)
    expect(help).not.toBeNull()
    expect(help?.getAttribute('class')).toContain('srOnly')
    // The description names exactly the keys the grid's keydown handler
    // handles — the arrow keys move the cell cursor, Enter or Space paints.
    expect(help?.textContent).toContain('arrow keys')
    expect(help?.textContent).toContain('Enter')
    expect(help?.textContent).toContain('Space')
  })
})
