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

import { AudioWaveform, type WaveformRegion } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered track waveform.
 */
function TrackWaveform(): React.JSX.Element {
  // Normalised 0..1 peaks, one bar each — computed offline for the track.
  const peaks = [0.2, 0.5, 0.9, 0.6, 0.3, 0.8, 1, 0.4, 0.7, 0.25]
  const durationSeconds = 60
  const [currentTime, setCurrentTime] = useState(15)
  const regions: WaveformRegion[] = [{ id: 'chorus', startTime: 12, duration: 3 }]
  return (
    <AudioWaveform
      peaks={peaks}
      duration={durationSeconds}
      currentTime={currentTime}
      onSeek={setCurrentTime}
      regions={regions}
      height={64}
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

  it('draws one bar per peak, the region band and the progress, and seeks on click', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <TrackWaveform />
      </I18nProvider>,
    )
    const { container } = view
    expect(container.querySelectorAll('[data-mol-id="audio-waveform-bar"]')).toHaveLength(10)

    const region = container.querySelector('[data-region-id="chorus"]')
    expect(Number(region?.getAttribute('x'))).toBeCloseTo(200, 6)
    expect(Number(region?.getAttribute('width'))).toBeCloseTo(50, 6)

    const progress = (): number =>
      Number(container.querySelector('clipPath rect')?.getAttribute('width'))
    expect(progress()).toBeCloseTo(250, 6)

    const svg = view.getByRole('button', { name: 'Seek the audio by clicking the waveform' })
    svg.getBoundingClientRect = () => new DOMRect(0, 0, 500, 64)
    fireEvent.click(svg, { clientX: 250 })
    expect(progress()).toBeCloseTo(500, 6)
  })
})
