// @vitest-environment jsdom

import { act, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  computeArticleProgress,
  computeWindowProgress,
  ReadingProgressBar,
} from '../ReadingProgressBar.js'

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
 * Drain pending `requestAnimationFrame` callbacks the component scheduled.
 *
 * We replace `requestAnimationFrame` with a synchronous shim in tests
 * (see `beforeEach`), so this just flushes any microtasks/state updates
 * inside an `act()` boundary.
 */
async function flushFrames() {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  // Run rAF callbacks synchronously so component state updates surface
  // immediately. Real browsers throttle to next frame, but for assertion
  // purposes synchronous is equivalent and deterministic.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  // Default a sensible viewport so progress math is deterministic.
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 800,
  })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 2400,
  })
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: 0,
  })
})

afterEach(() => {
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
    const el = {
      getBoundingClientRect: () => ({
        top: 100,
        height: 2000,
        bottom: 2100,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as Element
    expect(computeArticleProgress(el, 800)).toBe(0)
  })

  it('returns 1 when fully scrolled past', () => {
    const el = {
      getBoundingClientRect: () => ({
        top: -5000,
        height: 2000,
        bottom: -3000,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as Element
    expect(computeArticleProgress(el, 800)).toBe(1)
  })

  it('interpolates at 50% scroll-through', () => {
    // height 2000, viewport 800, total = 1200; halfway scrolled = top -600
    const el = {
      getBoundingClientRect: () => ({
        top: -600,
        height: 2000,
        bottom: 1400,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as Element
    expect(computeArticleProgress(el, 800)).toBeCloseTo(0.5, 5)
  })

  it('treats articles shorter than the viewport as fully read once the top hits the viewport top', () => {
    const short = {
      getBoundingClientRect: () => ({
        top: -10,
        height: 200,
        bottom: 190,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as Element
    expect(computeArticleProgress(short, 800)).toBe(1)
    const notYet = {
      getBoundingClientRect: () => ({
        top: 50,
        height: 200,
        bottom: 250,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as Element
    expect(computeArticleProgress(notYet, 800)).toBe(0)
  })
})

describe('<ReadingProgressBar>', () => {
  it('renders a progressbar with i18n aria-label and default aria values', async () => {
    const { getByRole } = render(
      <Wrap>
        <ReadingProgressBar />
      </Wrap>,
    )
    await flushFrames()
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-label')).toBe('Reading progress')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.getAttribute('data-mol-id')).toBe('reading-progress-bar')
    expect(bar.getAttribute('data-position')).toBe('top')
  })

  it('updates aria-valuenow as window scroll changes', async () => {
    const { getByRole } = render(
      <Wrap>
        <ReadingProgressBar />
      </Wrap>,
    )
    await flushFrames()
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')

    // Scroll to halfway and dispatch scroll
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 800,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50')

    // Scroll past end
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 5000,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })

  it('measures progress against the containerRef element when provided', async () => {
    const articleRect = {
      top: -600,
      height: 2000,
      bottom: 1400,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
    const getRect = vi.fn(() => articleRect)

    /**
     * Test harness that wires `containerRef` to a stub element whose
     * bounding rect is always `articleRect`.
     *
     * @returns The component under test wrapped in an I18nProvider.
     */
    function Harness(): React.ReactElement {
      const ref = useRef<Element>({
        getBoundingClientRect: getRect,
      } as unknown as Element)
      return <ReadingProgressBar containerRef={ref} />
    }

    const { getByRole } = render(
      <Wrap>
        <Harness />
      </Wrap>,
    )
    await flushFrames()
    expect(getRect).toHaveBeenCalled()
    // height 2000, viewport 800 → total 1200; top -600 → scrolled 600 → 50%
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50')
  })

  it('uses the requested position variant', async () => {
    const { getByRole, rerender } = render(
      <Wrap>
        <ReadingProgressBar position="bottom" />
      </Wrap>,
    )
    await flushFrames()
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('data-position')).toBe('bottom')
    expect(bar.style.bottom).toBe('0px')
    expect(bar.style.top).toBe('')

    rerender(
      <Wrap>
        <ReadingProgressBar position="top" />
      </Wrap>,
    )
    expect(bar.getAttribute('data-position')).toBe('top')
    expect(bar.style.top).toBe('0px')
  })

  it('honors thickness and color props', async () => {
    const { getByRole, container } = render(
      <Wrap>
        <ReadingProgressBar thickness={6} color="#ff0000" />
      </Wrap>,
    )
    await flushFrames()
    const bar = getByRole('progressbar')
    expect(bar.style.height).toBe('6px')
    const fill = container.querySelector('[data-mol-id="reading-progress-bar-fill"]') as HTMLElement
    expect(fill).not.toBeNull()
    expect(fill.style.background).toBe('rgb(255, 0, 0)')
  })

  it('removes scroll/resize listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(
      <Wrap>
        <ReadingProgressBar />
      </Wrap>,
    )
    const addedScroll = addSpy.mock.calls.some(([type]) => type === 'scroll')
    const addedResize = addSpy.mock.calls.some(([type]) => type === 'resize')
    expect(addedScroll).toBe(true)
    expect(addedResize).toBe(true)

    unmount()

    const removedScroll = removeSpy.mock.calls.some(([type]) => type === 'scroll')
    const removedResize = removeSpy.mock.calls.some(([type]) => type === 'resize')
    expect(removedScroll).toBe(true)
    expect(removedResize).toBe(true)
  })
})
