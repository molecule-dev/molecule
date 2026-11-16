// @vitest-environment jsdom
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests can
// assert which cm.* call was applied without a real bond — the same mock the
// React package's own tests use.
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { computeArticleProgress, computeWindowProgress } = await import('../progress.js')
const { ReadingProgressBar } = await import('../ReadingProgressBar.jsx')

/** The disposers of the roots mounted in one test. */
const disposers: Array<() => void> = []

/** A mounted bar: its host element and a setter that re-renders it. */
interface Mounted {
  /** Where the component mounted. */
  host: HTMLElement
  /** Replaces one prop and re-renders, as React's next render would. */
  setProp(key: string, value: unknown): void
}

/**
 * Renders a `ReadingProgressBar` and returns its host and prop setter.
 *
 * @param initial - The bar's props.
 * @returns The mounted bar.
 */
const renderBar = (initial: Record<string, unknown> = {}): Mounted => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const [props, setProps] = createSignal<Record<string, unknown>>({ ...initial })
  const setProp = (key: string, value: unknown): void => {
    setProps((current) => ({ ...current, [key]: value }))
  }
  disposers.push(
    render(() => {
      const merged: Record<string, unknown> = {}
      for (const key of Object.keys(initial))
        Object.defineProperty(merged, key, { enumerable: true, get: () => props()[key] })
      return <ReadingProgressBar {...merged} />
    }, host),
  )
  return { host, setProp }
}

/** The rendered progressbar. */
const bar = (): HTMLElement => {
  const el = document.querySelector<HTMLElement>('[role="progressbar"]')
  if (!el) throw new Error('no progressbar rendered')
  return el
}

/**
 * A bounding rect with the fields the progress formula reads.
 *
 * @param top - The element's top edge relative to the viewport.
 * @param height - The element's height.
 * @returns A DOMRect-shaped value.
 */
const rectAt = (top: number, height: number): DOMRect => ({
  top,
  height,
  bottom: top + height,
  left: 0,
  right: 0,
  width: 0,
  x: 0,
  y: top,
  toJSON: () => ({ top, height, bottom: top + height }),
})

/**
 * A real element whose bounding rect is the given one.
 *
 * @param top - The element's top edge relative to the viewport.
 * @param height - The element's height.
 * @returns The element.
 */
const elementAt = (top: number, height: number): Element => {
  const el = document.createElement('article')
  el.getBoundingClientRect = () => rectAt(top, height)
  return el
}

beforeEach(() => {
  // Run rAF callbacks synchronously so component state updates surface
  // immediately. Real browsers throttle to next frame, but for assertion
  // purposes synchronous is equivalent and deterministic.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  // Default a sensible viewport so progress math is deterministic.
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 2400,
  })
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('computeWindowProgress', () => {
  it('returns 0 at the top of the page', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    expect(computeWindowProgress()).toBe(0)
  })

  it('returns 1 once scrolled past the bottom', () => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 9999,
    })
    expect(computeWindowProgress()).toBe(1)
  })

  it('linearly interpolates in the middle', () => {
    // total scrollable = 2400 - 800 = 1600; halfway = 800
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 800,
    })
    expect(computeWindowProgress()).toBeCloseTo(0.5, 5)
  })

  it('returns 0 when nothing is scrollable', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 400, // shorter than viewport
    })
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 50 })
    expect(computeWindowProgress()).toBe(0)
  })
})

describe('computeArticleProgress', () => {
  it('returns 0 when the article is below the viewport top', () => {
    expect(computeArticleProgress(elementAt(100, 2000), 800)).toBe(0)
  })

  it('returns 1 when fully scrolled past', () => {
    expect(computeArticleProgress(elementAt(-5000, 2000), 800)).toBe(1)
  })

  it('interpolates at 50% scroll-through', () => {
    // height 2000, viewport 800, total = 1200; halfway scrolled = top -600
    expect(computeArticleProgress(elementAt(-600, 2000), 800)).toBeCloseTo(0.5, 5)
  })

  it('treats articles shorter than the viewport as fully read once the top hits the viewport top', () => {
    expect(computeArticleProgress(elementAt(-10, 200), 800)).toBe(1)
    expect(computeArticleProgress(elementAt(50, 200), 800)).toBe(0)
  })
})

describe('<ReadingProgressBar>', () => {
  it('renders a progressbar with i18n aria-label and default aria values', () => {
    renderBar()
    const el = bar()
    expect(el.getAttribute('aria-label')).toBe('Reading progress')
    expect(el.getAttribute('aria-valuemin')).toBe('0')
    expect(el.getAttribute('aria-valuemax')).toBe('100')
    expect(el.getAttribute('data-mol-id')).toBe('reading-progress-bar')
    expect(el.getAttribute('data-position')).toBe('top')
  })

  it('updates aria-valuenow as window scroll changes', () => {
    renderBar()
    expect(bar().getAttribute('aria-valuenow')).toBe('0')

    // Scroll to halfway and dispatch scroll
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 800,
    })
    window.dispatchEvent(new Event('scroll'))
    expect(bar().getAttribute('aria-valuenow')).toBe('50')

    // Scroll past end
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 5000,
    })
    window.dispatchEvent(new Event('scroll'))
    expect(bar().getAttribute('aria-valuenow')).toBe('100')
  })

  it('measures progress against the containerRef element when provided', () => {
    const el = elementAt(-600, 2000)
    const getRect = vi.spyOn(el, 'getBoundingClientRect')
    renderBar({ containerRef: { current: el } })
    expect(getRect).toHaveBeenCalled()
    // height 2000, viewport 800 → total 1200; top -600 → scrolled 600 → 50%
    expect(bar().getAttribute('aria-valuenow')).toBe('50')
  })

  it('uses the requested position variant', () => {
    const rendered = renderBar({ position: 'bottom' })
    let el = bar()
    expect(el.getAttribute('data-position')).toBe('bottom')
    expect(el.style.bottom).toBe('0px')
    expect(el.style.top).toBe('')

    rendered.setProp('position', 'top')
    el = bar()
    expect(el.getAttribute('data-position')).toBe('top')
    expect(el.style.top).toBe('0px')
  })

  it('honors thickness and color props', () => {
    renderBar({ thickness: 6, color: '#ff0000' })
    const el = bar()
    expect(el.style.height).toBe('6px')
    const fill = document.querySelector<HTMLElement>('[data-mol-id="reading-progress-bar-fill"]')
    expect(fill).not.toBeNull()
    expect(fill?.style.background).toBe('rgb(255, 0, 0)')
  })

  it('removes scroll/resize listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    renderBar()
    const addedScroll = addSpy.mock.calls.some(([type]) => type === 'scroll')
    const addedResize = addSpy.mock.calls.some(([type]) => type === 'resize')
    expect(addedScroll).toBe(true)
    expect(addedResize).toBe(true)

    for (const dispose of disposers.splice(0)) dispose()

    const removedScroll = removeSpy.mock.calls.some(([type]) => type === 'scroll')
    const removedResize = removeSpy.mock.calls.some(([type]) => type === 'resize')
    expect(removedScroll).toBe(true)
    expect(removedResize).toBe(true)
  })
})
