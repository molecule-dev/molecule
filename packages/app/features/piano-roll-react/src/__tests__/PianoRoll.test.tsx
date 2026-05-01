// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  beatsToPixels,
  isBlackKey,
  MidiNote,
  PianoRoll,
  pitchLabel,
  pitchToY,
  pixelsToBeats,
  snapBeat,
  snapBeatRound,
  snapToBeats,
  yToPitch,
} from '../PianoRoll.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/**
 * Stub `getBoundingClientRect` on a node so jsdom returns a real-looking
 * box. jsdom's default returns all zeros, which makes click-to-add
 * impossible to exercise.
 *
 * @param node - The DOM node to stub.
 * @param width - Box width in pixels.
 * @param height - Box height in pixels.
 */
function stubRect(node: HTMLElement, width: number, height: number) {
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

beforeEach(() => {
  setClassMap(buildStubClassMap())
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
    const { container } = render(
      <Wrap>
        <PianoRoll notes={[]} lowestPitch={60} highestPitch={71} />
      </Wrap>,
    )
    const keys = container.querySelectorAll('[data-mol-id="piano-roll-key"]')
    expect(keys.length).toBe(12)
    // Highest pitch (71 = B4) at the top.
    expect(keys[0].getAttribute('data-pitch')).toBe('71')
    expect(keys[keys.length - 1].getAttribute('data-pitch')).toBe('60')
  })

  it('renders pitch labels only on C notes', () => {
    const { container } = render(
      <Wrap>
        <PianoRoll notes={[]} lowestPitch={60} highestPitch={72} />
      </Wrap>,
    )
    const labels = container.querySelectorAll('[data-mol-id="piano-roll-key-label"]')
    // Visible range 60..72 has C4 (60) and C5 (72) → two labels.
    expect(labels.length).toBe(2)
    expect(Array.from(labels).map((l) => l.textContent).sort()).toEqual(['C4', 'C5'])
  })

  it('marks black-key rows with data-key-color="black"', () => {
    const { container } = render(
      <Wrap>
        <PianoRoll notes={[]} lowestPitch={60} highestPitch={72} />
      </Wrap>,
    )
    const black = container.querySelectorAll(
      '[data-mol-id="piano-roll-key"][data-key-color="black"]',
    )
    // C#, D#, F#, G#, A# in one octave → 5.
    expect(black.length).toBe(5)
  })

  it('renders one note element per supplied note', () => {
    const { container } = render(
      <Wrap>
        <PianoRoll notes={sampleNotes} />
      </Wrap>,
    )
    const drawn = container.querySelectorAll('[data-mol-id="piano-roll-note"]')
    expect(drawn.length).toBe(2)
    expect(drawn[0].getAttribute('data-note-id')).toBe('n1')
    expect(drawn[1].getAttribute('data-note-id')).toBe('n2')
  })

  it('positions notes via the pixelsPerBeat / noteHeight scales', () => {
    const { container } = render(
      <Wrap>
        <PianoRoll
          notes={sampleNotes}
          pixelsPerBeat={80}
          noteHeight={20}
          lowestPitch={21}
          highestPitch={108}
        />
      </Wrap>,
    )
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
    const { container } = render(
      <Wrap>
        <PianoRoll
          notes={[]}
          pixelsPerBeat={80}
          noteHeight={20}
          lowestPitch={60}
          highestPitch={71}
          snap="1/16"
          onNoteAdd={onNoteAdd}
        />
      </Wrap>,
    )
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    // 12 rows × 20px = 240px tall, 16 default beats × 80px = 1280px wide.
    stubRect(grid, 1280, 240)
    // Click at x=90 (≈ 1.125 beats — snaps down to 1.0), y=30 (row 1 from top = pitch 70).
    fireEvent.click(grid, { clientX: 90, clientY: 30 })
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
    const { container } = render(
      <Wrap>
        <PianoRoll notes={[]} />
      </Wrap>,
    )
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]') as HTMLElement
    stubRect(grid, 1280, 1760)
    // No onNoteAdd → click should noop. We just assert it doesn't throw.
    expect(() => fireEvent.click(grid, { clientX: 50, clientY: 50 })).not.toThrow()
  })

  it('fires onNoteMove when a note is dragged horizontally', () => {
    const onNoteMove = vi.fn()
    const note: MidiNote = { id: 'm1', pitch: 60, startBeat: 0, durationBeats: 1 }
    const { container } = render(
      <Wrap>
        <PianoRoll
          notes={[note]}
          pixelsPerBeat={80}
          noteHeight={20}
          snap="1/4"
          onNoteMove={onNoteMove}
        />
      </Wrap>,
    )
    const noteEl = container.querySelector('[data-mol-id="piano-roll-note"]') as HTMLElement
    fireEvent.pointerDown(noteEl, { pointerId: 1, button: 0, clientX: 0, clientY: 0 })
    // Move +80px horizontally → +1 beat. Snap=1/4 (1 beat), so startBeat → 1.
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 80, clientY: 0 })
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 80, clientY: 0 })
    expect(onNoteMove).toHaveBeenCalled()
    const last = onNoteMove.mock.calls[onNoteMove.mock.calls.length - 1]
    expect(last[0]).toBe('m1')
    expect(last[1]).toBe(1)
    expect(last[2]).toBe(60)
  })

  it('changes pitch when a note is dragged vertically by one row', () => {
    const onNoteMove = vi.fn()
    const note: MidiNote = { id: 'm1', pitch: 60, startBeat: 0, durationBeats: 1 }
    const { container } = render(
      <Wrap>
        <PianoRoll
          notes={[note]}
          pixelsPerBeat={80}
          noteHeight={20}
          lowestPitch={21}
          highestPitch={108}
          snap="1/4"
          onNoteMove={onNoteMove}
        />
      </Wrap>,
    )
    const noteEl = container.querySelector('[data-mol-id="piano-roll-note"]') as HTMLElement
    fireEvent.pointerDown(noteEl, { pointerId: 7, button: 0, clientX: 0, clientY: 0 })
    // Move +20px vertically → one row down → pitch 59.
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 0, clientY: 20 })
    fireEvent.pointerUp(window, { pointerId: 7, clientX: 0, clientY: 20 })
    const last = onNoteMove.mock.calls[onNoteMove.mock.calls.length - 1]
    expect(last[2]).toBe(59)
  })

  it('fires onNoteResize when the right-edge handle is dragged', () => {
    const onNoteResize = vi.fn()
    const note: MidiNote = { id: 'r1', pitch: 60, startBeat: 0, durationBeats: 1 }
    const { container } = render(
      <Wrap>
        <PianoRoll
          notes={[note]}
          pixelsPerBeat={80}
          noteHeight={20}
          snap="1/4"
          onNoteResize={onNoteResize}
        />
      </Wrap>,
    )
    const handle = container.querySelector(
      '[data-mol-id="piano-roll-note-handle"]',
    ) as HTMLElement
    fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 80, clientY: 0 })
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 80, clientY: 0 })
    expect(onNoteResize).toHaveBeenCalled()
    const last = onNoteResize.mock.calls[onNoteResize.mock.calls.length - 1]
    expect(last[0]).toBe('r1')
    expect(last[1]).toBe(2)
  })

  it('right-clicking a note fires onNoteDelete', () => {
    const onNoteDelete = vi.fn()
    const note: MidiNote = { id: 'd1', pitch: 60, startBeat: 0, durationBeats: 1 }
    const { container } = render(
      <Wrap>
        <PianoRoll notes={[note]} onNoteDelete={onNoteDelete} />
      </Wrap>,
    )
    const noteEl = container.querySelector('[data-mol-id="piano-roll-note"]') as HTMLElement
    fireEvent.contextMenu(noteEl)
    expect(onNoteDelete).toHaveBeenCalledWith('d1')
  })

  it('renders bar lines every 4 beats on the time grid', () => {
    const { container } = render(
      <Wrap>
        <PianoRoll notes={[]} pixelsPerBeat={40} beatsCount={16} />
      </Wrap>,
    )
    const bars = container.querySelectorAll(
      '[data-mol-id="piano-roll-beat-line"][data-bar="true"]',
    )
    // 16 beats → bar lines at 0, 4, 8, 12, 16 → 5 lines.
    expect(bars.length).toBe(5)
  })

  it('exposes aria labels via i18n with English fallbacks', () => {
    const { container, getByRole } = render(
      <Wrap>
        <PianoRoll notes={[]} />
      </Wrap>,
    )
    const region = getByRole('region')
    expect(region.getAttribute('aria-label')).toBe('Piano roll')
    const grid = container.querySelector('[data-mol-id="piano-roll-grid"]')
    expect(grid?.getAttribute('aria-label')).toBe('Note grid')
    const keys = container.querySelector('[data-mol-id="piano-roll-keys"]')
    expect(keys?.getAttribute('aria-label')).toBe('Piano keys')
  })
})
