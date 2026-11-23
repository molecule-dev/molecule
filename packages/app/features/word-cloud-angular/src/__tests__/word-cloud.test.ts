// @vitest-environment jsdom
/**
 * Unit tests of `WordCloud` — the port of `@molecule/app-word-cloud-react`'s
 * own suite. The React suite renders the component with a stubbed ClassMap and
 * asserts the markup; this port mounts the same tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
// bond — the same stub the React tests use.
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
        const fn = (..._args: unknown[]): string => token
        return new Proxy(fn, {
          get(_target, key) {
            if (key === Symbol.toPrimitive || key === 'toString') return (): string => token
            return undefined
          },
        })
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { bboxesIntersect, estimateBBox, packWords, scaleFontSize } = await import('../packing.js')
const { WordCloud } = await import('../word-cloud.component.js')

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the WordCloud through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [WordCloud as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<svg mol-word-cloud [words]="p['words']" [width]="p['width']" [height]="p['height']" [minFontSize]="p['minFontSize']" [maxFontSize]="p['maxFontSize']" [colorScale]="p['colorScale']" [orientation]="p['orientation']" [onWordClick]="p['onWordClick']" [ariaLabel]="p['ariaLabel']" [className]="p['className']"></svg>`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
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
  it('renders an svg with role=img', async () => {
    const m = await render({ words: [{ text: 'hello', value: 1 }] })
    const svg = m.host.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('data-mol-id')).toBe('word-cloud')
  })

  it('renders a <text> element per packed word', async () => {
    const m = await render({
      words: [
        { text: 'alpha', value: 10 },
        { text: 'beta', value: 5 },
        { text: 'gamma', value: 1 },
      ],
      width: 600,
      height: 400,
    })
    const texts = m.host.querySelectorAll('text')
    expect(texts.length).toBe(3)
  })

  it('attaches data-value and data-mol-id to each word', async () => {
    const m = await render({ words: [{ text: 'alpha', value: 7 }] })
    const node = m.host.querySelector('[data-mol-id="word-cloud-word-alpha"]')
    expect(node).not.toBeNull()
    expect(node?.getAttribute('data-value')).toBe('7')
  })

  it('fires onWordClick with the source Word', async () => {
    const onWordClick = vi.fn()
    const m = await render({ words: [{ text: 'click-me', value: 9 }], onWordClick })
    const node = m.host.querySelector('[data-mol-id="word-cloud-word-click-me"]')!
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onWordClick).toHaveBeenCalledTimes(1)
    expect(onWordClick.mock.calls[0][0]).toEqual({ text: 'click-me', value: 9 })
  })

  it('respects an explicit per-word color', async () => {
    const m = await render({ words: [{ text: 'red', value: 1, color: '#ff0000' }] })
    const node = m.host.querySelector('[data-mol-id="word-cloud-word-red"]')!
    expect(node.getAttribute('fill')).toBe('#ff0000')
  })

  it('cycles through colorScale for un-colored words', async () => {
    const palette = ['#111111', '#222222', '#333333'] as const
    const m = await render({
      words: [
        { text: 'a', value: 9 },
        { text: 'b', value: 7 },
        { text: 'c', value: 5 },
        { text: 'd', value: 3 },
      ],
      colorScale: palette,
      width: 600,
      height: 400,
    })
    const a = m.host.querySelector('[data-mol-id="word-cloud-word-a"]')!
    const b = m.host.querySelector('[data-mol-id="word-cloud-word-b"]')!
    const d = m.host.querySelector('[data-mol-id="word-cloud-word-d"]')!
    expect(a.getAttribute('fill')).toBe('#111111')
    expect(b.getAttribute('fill')).toBe('#222222')
    // Wraps after palette length.
    expect(d.getAttribute('fill')).toBe('#111111')
  })

  it('applies a rotation transform when orientation=mixed', async () => {
    const m = await render({
      words: [
        { text: 'a', value: 8 },
        { text: 'b', value: 7 },
        { text: 'c', value: 6 },
        { text: 'd', value: 5 },
      ],
      orientation: 'mixed',
      width: 600,
      height: 400,
    })
    const rotated = m.host.querySelector('[data-mol-id="word-cloud-word-d"]')
    expect(rotated?.getAttribute('data-rotation')).toBe('90')
    expect(rotated?.getAttribute('transform')).toMatch(/rotate\(90/)
  })

  it('renders an empty SVG with the empty aria-label when words is empty', async () => {
    const m = await render({ words: [] })
    const svg = m.host.querySelector('svg')
    expect(svg?.getAttribute('aria-label')).toContain('No words')
    expect(m.host.querySelectorAll('text').length).toBe(0)
  })

  it('font size of largest word equals maxFontSize', async () => {
    const m = await render({
      words: [
        { text: 'a', value: 1 },
        { text: 'big', value: 100 },
      ],
      minFontSize: 10,
      maxFontSize: 50,
    })
    const big = m.host.querySelector('[data-mol-id="word-cloud-word-big"]')!
    expect(big.getAttribute('font-size')).toBe('50')
    const small = m.host.querySelector('[data-mol-id="word-cloud-word-a"]')!
    expect(small.getAttribute('font-size')).toBe('10')
  })
})
