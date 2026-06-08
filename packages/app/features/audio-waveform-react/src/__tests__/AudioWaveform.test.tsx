// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { AudioWaveform, clamp, seekTimeFromClick, type WaveformRegion } from '../AudioWaveform.js'

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
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key): (() => string) | undefined {
          if (key === Symbol.toPrimitive || key === 'toString') return (): string => token
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

const peaks = [0.1, 0.3, 0.6, 0.9, 0.8, 0.5, 0.2, 0.7]

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
  it('clamps below the minimum', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
  })
  it('clamps above the maximum', () => {
    expect(clamp(2, 0, 1)).toBe(1)
  })
  it('returns min for non-finite input', () => {
    expect(clamp(NaN, 0, 1)).toBe(0)
    expect(clamp(Infinity, 5, 10)).toBe(5)
    expect(clamp(-Infinity, 5, 10)).toBe(5)
  })
})

describe('seekTimeFromClick', () => {
  it('returns 0 for non-positive width or duration', () => {
    expect(seekTimeFromClick(50, 0, 60)).toBe(0)
    expect(seekTimeFromClick(50, 100, 0)).toBe(0)
    expect(seekTimeFromClick(50, -1, 60)).toBe(0)
    expect(seekTimeFromClick(50, 100, -1)).toBe(0)
  })

  it('maps midpoint click to half of duration', () => {
    expect(seekTimeFromClick(50, 100, 60)).toBe(30)
  })

  it('clamps to [0, duration]', () => {
    expect(seekTimeFromClick(-10, 100, 60)).toBe(0)
    expect(seekTimeFromClick(200, 100, 60)).toBe(60)
  })

  it('handles fractional positions', () => {
    expect(seekTimeFromClick(25, 100, 80)).toBe(20)
  })
})

describe('<AudioWaveform>', () => {
  it('renders an empty-state region when peaks is empty', () => {
    const { container, getByRole } = render(
      <Wrap>
        <AudioWaveform peaks={[]} duration={60} />
      </Wrap>,
    )
    const region = getByRole('region')
    expect(region.getAttribute('aria-label')).toBe('Audio waveform')
    expect(container.querySelector('[data-mol-id="audio-waveform-empty"]')?.textContent).toContain(
      'No waveform',
    )
  })

  it('renders one bar per peak in the base layer', () => {
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} />
      </Wrap>,
    )
    const bars = container.querySelectorAll('[data-mol-id="audio-waveform-bar"]')
    expect(bars.length).toBe(peaks.length)
  })

  it('renders a matching progress layer that is clipped via clipPath', () => {
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} currentTime={30} />
      </Wrap>,
    )
    const progressBars = container.querySelectorAll('[data-mol-id="audio-waveform-bar-progress"]')
    expect(progressBars.length).toBe(peaks.length)
    const progressGroup = container.querySelector('[data-mol-id="audio-waveform-bars-progress"]')
    expect(progressGroup?.getAttribute('clip-path')).toContain('url(#')
    // The clipPath rect should size to the played fraction of the 1000-unit viewBox.
    const clipRect = container.querySelector('clipPath rect')
    expect(clipRect?.getAttribute('width')).toBe('500')
  })

  it('progress clip width is 0 when currentTime is 0', () => {
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} currentTime={0} />
      </Wrap>,
    )
    const clipRect = container.querySelector('clipPath rect')
    expect(clipRect?.getAttribute('width')).toBe('0')
  })

  it('progress clip width clamps at full when currentTime exceeds duration', () => {
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} currentTime={9999} />
      </Wrap>,
    )
    const clipRect = container.querySelector('clipPath rect')
    expect(clipRect?.getAttribute('width')).toBe('1000')
  })

  it('marks SVG as interactive and exposes a button role when onSeek is provided', () => {
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} onSeek={() => {}} />
      </Wrap>,
    )
    const svg = container.querySelector('[data-mol-id="audio-waveform-svg"]')
    expect(svg?.getAttribute('data-interactive')).toBe('true')
    expect(svg?.getAttribute('role')).toBe('button')
  })

  it('marks SVG as non-interactive when onSeek is omitted', () => {
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} />
      </Wrap>,
    )
    const svg = container.querySelector('[data-mol-id="audio-waveform-svg"]')
    expect(svg?.getAttribute('data-interactive')).toBe('false')
    expect(svg?.getAttribute('role')).toBe('img')
  })

  it('fires onSeek with the click position mapped to seconds', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} onSeek={onSeek} />
      </Wrap>,
    )
    const svg = container.querySelector('[data-mol-id="audio-waveform-svg"]') as SVGSVGElement
    // jsdom's getBoundingClientRect returns zeros, so stub it.
    svg.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 200,
        height: 64,
        right: 200,
        bottom: 64,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    fireEvent.click(svg, { clientX: 100 })
    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(30)
  })

  it('does not fire onSeek when duration is zero', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={0} onSeek={onSeek} />
      </Wrap>,
    )
    const svg = container.querySelector('[data-mol-id="audio-waveform-svg"]') as SVGSVGElement
    expect(svg.getAttribute('data-interactive')).toBe('false')
    fireEvent.click(svg, { clientX: 100 })
    expect(onSeek).not.toHaveBeenCalled()
  })

  it('renders region overlays at the correct horizontal range', () => {
    const regions: WaveformRegion[] = [
      { id: 'r1', startTime: 0, duration: 30 },
      { id: 'r2', startTime: 30, duration: 30, color: '#ff000088' },
    ]
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} regions={regions} />
      </Wrap>,
    )
    const rendered = container.querySelectorAll('[data-mol-id="audio-waveform-region"]')
    expect(rendered.length).toBe(2)
    expect(rendered[0].getAttribute('data-region-id')).toBe('r1')
    expect(rendered[0].getAttribute('x')).toBe('0')
    expect(rendered[0].getAttribute('width')).toBe('500')
    expect(rendered[1].getAttribute('x')).toBe('500')
    expect(rendered[1].getAttribute('width')).toBe('500')
    expect(rendered[1].getAttribute('fill')).toBe('#ff000088')
  })

  it('skips regions with non-positive duration', () => {
    const regions: WaveformRegion[] = [
      { id: 'good', startTime: 0, duration: 5 },
      { id: 'zero', startTime: 5, duration: 0 },
      { id: 'neg', startTime: 10, duration: -1 },
    ]
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} regions={regions} />
      </Wrap>,
    )
    const rendered = container.querySelectorAll('[data-mol-id="audio-waveform-region"]')
    expect(rendered.length).toBe(1)
    expect(rendered[0].getAttribute('data-region-id')).toBe('good')
  })

  it('clamps region overlays to the audio duration', () => {
    const regions: WaveformRegion[] = [{ id: 'overflow', startTime: 30, duration: 9999 }]
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} regions={regions} />
      </Wrap>,
    )
    const rendered = container.querySelectorAll('[data-mol-id="audio-waveform-region"]')
    expect(rendered.length).toBe(1)
    expect(rendered[0].getAttribute('x')).toBe('500')
    expect(rendered[0].getAttribute('width')).toBe('500')
  })

  it('honors a custom height', () => {
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} height={120} />
      </Wrap>,
    )
    const svg = container.querySelector('[data-mol-id="audio-waveform-svg"]')
    expect(svg?.getAttribute('height')).toBe('120')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1000 120')
  })

  it('uses progressColor / waveColor when provided', () => {
    const { container } = render(
      <Wrap>
        <AudioWaveform peaks={peaks} duration={60} progressColor="#abcdef" waveColor="#123456" />
      </Wrap>,
    )
    const baseGroup = container.querySelector('[data-mol-id="audio-waveform-bars-base"]')
    const progressGroup = container.querySelector('[data-mol-id="audio-waveform-bars-progress"]')
    expect(baseGroup?.getAttribute('fill')).toBe('#123456')
    expect(progressGroup?.getAttribute('fill')).toBe('#abcdef')
  })
})
