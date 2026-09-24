/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AnimationCanvas, type AnimationKeyframe } from '../index.js'

const keyframes: AnimationKeyframe[] = [
  { time: 0, state: [{ id: 'box', x: 0, y: 50, rotation: 0, scale: 1, opacity: 1 }] },
  {
    time: 1,
    state: [
      { id: 'box', x: 200, y: 50, rotation: 90, scale: 1.5, opacity: 1, easing: 'easeInOut' },
    ],
  },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered animation editor canvas.
 */
function AnimationEditor(): React.JSX.Element {
  const [time, setTime] = useState(0.5)
  return (
    <AnimationCanvas
      keyframes={keyframes}
      currentTime={time}
      onSeek={setTime}
      width={400}
      height={200}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('draws the shape interpolated at the playhead and seeks on click', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <AnimationEditor />
      </I18nProvider>,
    )
    const svg = view.getByRole('img', { name: 'Animation canvas' })
    expect(svg.getAttribute('data-mol-id')).toBe('animation-canvas')
    const shape = svg.querySelector('[data-mol-id="animation-canvas-shape-box"]')
    const parse = (): number[] =>
      (shape?.getAttribute('transform')?.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

    // Midpoint of a symmetric easeInOut segment: halfway on every property.
    const [x, y, rotation, scale] = parse()
    expect(x).toBeCloseTo(100, 3)
    expect(y).toBe(50)
    expect(rotation).toBeCloseTo(45, 3)
    expect(scale).toBeCloseTo(1.25, 3)

    // Clicking maps linearly across the width to a time → onSeek → state.
    svg.getBoundingClientRect = () => new DOMRect(0, 0, 400, 200)
    fireEvent.pointerDown(svg, { clientX: 400 })
    const [endX, , endRotation, endScale] = parse()
    expect(endX).toBe(200)
    expect(endRotation).toBe(90)
    expect(endScale).toBe(1.5)
  })
})
