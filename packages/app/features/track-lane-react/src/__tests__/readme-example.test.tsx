// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, cleanup, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type Clip, TrackLane } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered drum lane.
 */
function DrumTrack(): React.JSX.Element {
  const [clips, setClips] = useState<Clip[]>([
    { id: 'kick', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
    { id: 'snare', startTime: 4, duration: 1.5, label: 'Snare' },
  ])
  const [selectedId, setSelectedId] = useState<string>()
  const updateClip = (id: string, patch: Partial<Clip>): void =>
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  return (
    <TrackLane
      name="Drums"
      clips={clips}
      pixelsPerSecond={20}
      onClipMove={(id, startTime) => updateClip(id, { startTime })}
      onClipResize={(id, duration) => updateClip(id, { duration })}
      onClipClick={setSelectedId}
      selectedClipId={selectedId}
    />
  )
}

/**
 * Dispatches a pointer event carrying the coordinates the lane reads
 * (jsdom has no `PointerEvent` constructor).
 *
 * @param target - Element (pointerdown) or window (move/up).
 * @param type - Event type.
 * @param clientX - Horizontal pointer position.
 */
function pointer(
  target: Element | Window,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
): void {
  const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    clientX,
    clientY: 0,
    pointerId: 1,
    button: 0,
  })
  act(() => {
    target.dispatchEvent(event)
  })
}

/**
 * Returns a rendered clip element.
 *
 * @param container - Render container.
 * @param id - Clip id.
 * @returns The clip element.
 */
function clip(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-clip-id="${id}"]`)
  if (!el) throw new Error(`clip ${id} not rendered`)
  return el
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('positions clips in seconds, and moves / resizes / selects them via parent state', () => {
    const { container, getByRole } = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <DrumTrack />
      </I18nProvider>,
    )
    expect(container.querySelector('[data-mol-id="track-lane-name"]')?.textContent).toBe('Drums')
    expect(clip(container, 'snare').style.left).toBe('80px')
    expect(clip(container, 'snare').style.width).toBe('30px')
    expect(getByRole('button', { name: 'Clip Snare starting at 4.00s for 1.50s' })).toBeTruthy()

    // Drag the snare +40px → +2s.
    pointer(clip(container, 'snare'), 'pointerdown', 100)
    pointer(window, 'pointermove', 140)
    pointer(window, 'pointerup', 140)
    expect(clip(container, 'snare').style.left).toBe('120px')
    expect(clip(container, 'snare').getAttribute('aria-label')).toBe(
      'Clip Snare starting at 6.00s for 1.50s',
    )

    // Drag the kick's resize handle +20px → +1s.
    const handle = clip(container, 'kick').querySelector('[role="separator"]')
    if (!handle) throw new Error('resize handle not rendered')
    pointer(handle, 'pointerdown', 40)
    pointer(window, 'pointermove', 60)
    pointer(window, 'pointerup', 60)
    expect(clip(container, 'kick').style.width).toBe('60px')

    // A press without movement selects.
    pointer(clip(container, 'kick'), 'pointerdown', 10)
    pointer(window, 'pointerup', 10)
    expect(clip(container, 'kick').getAttribute('aria-pressed')).toBe('true')
    expect(clip(container, 'snare').getAttribute('aria-pressed')).toBeNull()
  })
})
