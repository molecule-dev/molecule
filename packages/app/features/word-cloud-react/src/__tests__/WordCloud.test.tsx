// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { bboxesIntersect, estimateBBox, packWords, scaleFontSize, WordCloud } from '../WordCloud.js'

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
 * Wrap children in I18nProvider so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('scaleFontSize', () => {
  it('maps the min weight to minFontSize', () => {
    expect(scaleFontSize(1, 1, 10, 12, 64)).toBe(12)
  })

  it('maps the max weight to maxFontSize', () => {
    expect(scaleFontSize(10, 1, 10, 12, 64)).toBe(64)
  })

  it('linearly interpolates the midpoint', () => {
    expect(scaleFontSize(5.5, 1, 10, 12, 64)).toBeCloseTo(38, 5)
  })

  it('returns the midpoint when min === max', () => {
    expect(scaleFontSize(7, 7, 7, 12, 64)).toBe(38)
  })
})

describe('estimateBBox', () => {
  it('produces a width proportional to text length and fontSize', () => {
    const a = estimateBBox('hi', 20, 0, 100, 100)
    const b = estimateBBox('hello', 20, 0, 100, 100)
    expect(b.w).toBeGreaterThan(a.w)
  })

  it('swaps width/height when rotated 90deg', () => {
    const horiz = estimateBBox('hello', 20, 0, 100, 100)
    const vert = estimateBBox('hello', 20, 90, 100, 100)
    expect(vert.h).toBeGreaterThan(vert.w)
    expect(vert.w).toBeLessThan(horiz.w)
  })

  it('centers the box on cx, cy', () => {
    const box = estimateBBox('hello', 20, 0, 100, 100)
    expect(box.x + box.w / 2).toBeCloseTo(100, 5)
    expect(box.y + box.h / 2).toBeCloseTo(100, 5)
  })
})

describe('bboxesIntersect', () => {
  it('detects overlap', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 }
    const b = { x: 5, y: 5, w: 10, h: 10 }
    expect(bboxesIntersect(a, b)).toBe(true)
  })

  it('returns false for adjacent (non-overlapping) boxes', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 }
    const b = { x: 10, y: 0, w: 10, h: 10 }
    expect(bboxesIntersect(a, b)).toBe(false)
  })

  it('returns false for fully separated boxes', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 }
    const b = { x: 100, y: 100, w: 10, h: 10 }
    expect(bboxesIntersect(a, b)).toBe(false)
  })
})

describe('packWords', () => {
  it('returns [] for empty input', () => {
    expect(packWords([], { width: 400, height: 300, minFontSize: 12, maxFontSize: 64 })).toEqual([])
  })

  it('places the largest-value word at center', () => {
    const placed = packWords(
      [
        { text: 'small', value: 1 },
        { text: 'big', value: 100 },
        { text: 'mid', value: 50 },
      ],
      { width: 400, height: 300, minFontSize: 12, maxFontSize: 64 },
    )
    expect(placed[0].word.text).toBe('big')
    expect(placed[0].x).toBeCloseTo(200, 5)
    expect(placed[0].y).toBeCloseTo(150, 5)
  })

  it('assigns the highest font size to the largest-value word', () => {
    const placed = packWords(
      [
        { text: 'a', value: 1 },
        { text: 'b', value: 10 },
        { text: 'c', value: 5 },
      ],
      { width: 400, height: 300, minFontSize: 12, maxFontSize: 64 },
    )
    const big = placed.find((p) => p.word.text === 'b')!
    const small = placed.find((p) => p.word.text === 'a')!
    expect(big.fontSize).toBe(64)
    expect(small.fontSize).toBe(12)
  })

  it('produces non-overlapping bounding boxes for placed words', () => {
    const placed = packWords(
      [
        { text: 'one', value: 10 },
        { text: 'two', value: 8 },
        { text: 'three', value: 6 },
        { text: 'four', value: 4 },
        { text: 'five', value: 2 },
      ],
      { width: 600, height: 400, minFontSize: 14, maxFontSize: 48 },
    )
    expect(placed.length).toBeGreaterThan(0)
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = estimateBBox(
          placed[i].word.text,
          placed[i].fontSize,
          placed[i].rotation,
          placed[i].x,
          placed[i].y,
        )
        const b = estimateBBox(
          placed[j].word.text,
          placed[j].fontSize,
          placed[j].rotation,
          placed[j].x,
          placed[j].y,
        )
        expect(bboxesIntersect(a, b)).toBe(false)
      }
    }
  })

  it('rotates roughly every 4th word in mixed orientation', () => {
    const placed = packWords(
      [
        { text: 'a', value: 8 },
        { text: 'b', value: 7 },
        { text: 'c', value: 6 },
        { text: 'd', value: 5 },
        { text: 'e', value: 4 },
        { text: 'f', value: 3 },
        { text: 'g', value: 2 },
        { text: 'h', value: 1 },
      ],
      { width: 600, height: 400, minFontSize: 14, maxFontSize: 32, orientation: 'mixed' },
    )
    // Position 3 (index) and 7 (index) are rotated 90deg.
    const rotatedCount = placed.filter((p) => p.rotation === 90).length
    expect(rotatedCount).toBeGreaterThan(0)
  })

  it('keeps every word horizontal in horizontal orientation', () => {
    const placed = packWords(
      [
        { text: 'a', value: 8 },
        { text: 'b', value: 7 },
        { text: 'c', value: 6 },
        { text: 'd', value: 5 },
      ],
      { width: 600, height: 400, minFontSize: 14, maxFontSize: 32, orientation: 'horizontal' },
    )
    expect(placed.every((p) => p.rotation === 0)).toBe(true)
  })
})

describe('<WordCloud>', () => {
  it('renders an svg with role=img', () => {
    const { container } = render(
      <Wrap>
        <WordCloud words={[{ text: 'hello', value: 1 }]} />
      </Wrap>,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('data-mol-id')).toBe('word-cloud')
  })

  it('renders a <text> element per packed word', () => {
    const { container } = render(
      <Wrap>
        <WordCloud
          words={[
            { text: 'alpha', value: 10 },
            { text: 'beta', value: 5 },
            { text: 'gamma', value: 1 },
          ]}
          width={600}
          height={400}
        />
      </Wrap>,
    )
    const texts = container.querySelectorAll('text')
    expect(texts.length).toBe(3)
  })

  it('attaches data-value and data-mol-id to each word', () => {
    const { container } = render(
      <Wrap>
        <WordCloud words={[{ text: 'alpha', value: 7 }]} />
      </Wrap>,
    )
    const node = container.querySelector('[data-mol-id="word-cloud-word-alpha"]')
    expect(node).not.toBeNull()
    expect(node?.getAttribute('data-value')).toBe('7')
  })

  it('fires onWordClick with the source Word', () => {
    const onWordClick = vi.fn()
    const { container } = render(
      <Wrap>
        <WordCloud words={[{ text: 'click-me', value: 9 }]} onWordClick={onWordClick} />
      </Wrap>,
    )
    const node = container.querySelector('[data-mol-id="word-cloud-word-click-me"]')!
    fireEvent.click(node)
    expect(onWordClick).toHaveBeenCalledTimes(1)
    expect(onWordClick.mock.calls[0][0]).toEqual({ text: 'click-me', value: 9 })
  })

  it('respects an explicit per-word color', () => {
    const { container } = render(
      <Wrap>
        <WordCloud words={[{ text: 'red', value: 1, color: '#ff0000' }]} />
      </Wrap>,
    )
    const node = container.querySelector('[data-mol-id="word-cloud-word-red"]')!
    expect(node.getAttribute('fill')).toBe('#ff0000')
  })

  it('cycles through colorScale for un-colored words', () => {
    const palette = ['#111111', '#222222', '#333333'] as const
    const { container } = render(
      <Wrap>
        <WordCloud
          words={[
            { text: 'a', value: 9 },
            { text: 'b', value: 7 },
            { text: 'c', value: 5 },
            { text: 'd', value: 3 },
          ]}
          colorScale={palette}
          width={600}
          height={400}
        />
      </Wrap>,
    )
    const a = container.querySelector('[data-mol-id="word-cloud-word-a"]')!
    const b = container.querySelector('[data-mol-id="word-cloud-word-b"]')!
    const d = container.querySelector('[data-mol-id="word-cloud-word-d"]')!
    expect(a.getAttribute('fill')).toBe('#111111')
    expect(b.getAttribute('fill')).toBe('#222222')
    // Wraps after palette length.
    expect(d.getAttribute('fill')).toBe('#111111')
  })

  it('applies a rotation transform when orientation=mixed', () => {
    const { container } = render(
      <Wrap>
        <WordCloud
          words={[
            { text: 'a', value: 8 },
            { text: 'b', value: 7 },
            { text: 'c', value: 6 },
            { text: 'd', value: 5 },
          ]}
          orientation="mixed"
          width={600}
          height={400}
        />
      </Wrap>,
    )
    const rotated = container.querySelector('[data-mol-id="word-cloud-word-d"]')
    expect(rotated?.getAttribute('data-rotation')).toBe('90')
    expect(rotated?.getAttribute('transform')).toMatch(/rotate\(90/)
  })

  it('renders an empty SVG with the empty aria-label when words is empty', () => {
    const { container } = render(
      <Wrap>
        <WordCloud words={[]} />
      </Wrap>,
    )
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-label')).toContain('No words')
    expect(container.querySelectorAll('text').length).toBe(0)
  })

  it('font size of largest word equals maxFontSize', () => {
    const { container } = render(
      <Wrap>
        <WordCloud
          words={[
            { text: 'a', value: 1 },
            { text: 'big', value: 100 },
          ]}
          minFontSize={10}
          maxFontSize={50}
        />
      </Wrap>,
    )
    const big = container.querySelector('[data-mol-id="word-cloud-word-big"]')!
    expect(big.getAttribute('font-size')).toBe('50')
    const small = container.querySelector('[data-mol-id="word-cloud-word-a"]')!
    expect(small.getAttribute('font-size')).toBe('10')
  })
})
