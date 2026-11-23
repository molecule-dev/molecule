// @vitest-environment jsdom
/**
 * Unit tests of `ReadingProgressBar` — the port of
 * `@molecule/app-reading-progress-bar-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same behavior.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests can
// assert which cm.* call was applied without a real bond — the same mock the
// React tests use.
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
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { computeArticleProgress, computeWindowProgress } = await import('../progress.js')
const { ReadingProgressBar } = await import('../reading-progress-bar.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): void
  /** Flushes pending change detection. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The host template every case mounts, written as an app would write it. */
const TEMPLATE = `<div
  mol-reading-progress-bar
  [containerRef]="p['containerRef']"
  [thickness]="p['thickness']"
  [position]="p['position']"
  [color]="p['color']"
  [className]="p['className']"
  [dataMolId]="p['dataMolId']"
></div>`

/** Distinguishes the JIT hosts Angular derives a component id from (NG0912). */
let hostCount = 0

/**
 * Mounts the component through a JIT host template.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ReadingProgressBar as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(++hostCount) },
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The mounted hosts of one test, torn down in `afterEach`. */
const mounted: Mounted[] = []

/**
 * Mounts a `ReadingProgressBar` with the given props.
 *
 * @param props - The bar's props.
 * @returns The mounted host.
 */
const renderBar = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

/** The rendered progressbar (the host element itself). */
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

/** Frame callbacks the shim queued, run by {@link flushFrames}. */
let frames: FrameRequestCallback[] = []

/**
 * Runs the queued animation frames (state updates surface immediately) and
 * flushes the change detection they scheduled.
 */
const flushFrames = (): void => {
  for (const cb of frames.splice(0)) cb(0)
  for (const m of mounted) m.tick()
}

beforeEach(() => {
  // Queue rAF callbacks and run them from the test body, so a state update
  // never lands inside Angular's own change detection pass.
  frames = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames[id - 1] = () => {}
  })
  // Default a sensible viewport so progress math is deterministic.
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 2400,
  })
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
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
  it('renders a progressbar with i18n aria-label and default aria values', async () => {
    await renderBar()
    flushFrames()
    const el = bar()
    expect(el.getAttribute('aria-label')).toBe('Reading progress')
    expect(el.getAttribute('aria-valuemin')).toBe('0')
    expect(el.getAttribute('aria-valuemax')).toBe('100')
    expect(el.getAttribute('data-mol-id')).toBe('reading-progress-bar')
    expect(el.getAttribute('data-position')).toBe('top')
  })

  it('updates aria-valuenow as window scroll changes', async () => {
    await renderBar()
    flushFrames()
    expect(bar().getAttribute('aria-valuenow')).toBe('0')

    // Scroll to halfway and dispatch scroll
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 800,
    })
    window.dispatchEvent(new Event('scroll'))
    flushFrames()
    expect(bar().getAttribute('aria-valuenow')).toBe('50')

    // Scroll past end
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 5000,
    })
    window.dispatchEvent(new Event('scroll'))
    flushFrames()
    expect(bar().getAttribute('aria-valuenow')).toBe('100')
  })

  it('measures progress against the containerRef element when provided', async () => {
    const el = elementAt(-600, 2000)
    const getRect = vi.spyOn(el, 'getBoundingClientRect')
    await renderBar({ containerRef: { current: el } })
    flushFrames()
    expect(getRect).toHaveBeenCalled()
    // height 2000, viewport 800 → total 1200; top -600 → scrolled 600 → 50%
    expect(bar().getAttribute('aria-valuenow')).toBe('50')
  })

  it('uses the requested position variant', async () => {
    const rendered = await renderBar({ position: 'bottom' })
    flushFrames()
    let el = bar()
    expect(el.getAttribute('data-position')).toBe('bottom')
    expect(el.style.bottom).toBe('0px')
    expect(el.style.top).toBe('')

    rendered.setProps({ position: 'top' })
    el = bar()
    expect(el.getAttribute('data-position')).toBe('top')
    expect(el.style.top).toBe('0px')
  })

  it('honors thickness and color props', async () => {
    await renderBar({ thickness: 6, color: '#ff0000' })
    flushFrames()
    const el = bar()
    expect(el.style.height).toBe('6px')
    const fill = document.querySelector<HTMLElement>('[data-mol-id="reading-progress-bar-fill"]')
    expect(fill).not.toBeNull()
    expect(fill?.style.background).toBe('rgb(255, 0, 0)')
  })

  it('removes scroll/resize listeners on unmount', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    await renderBar()
    const addedScroll = addSpy.mock.calls.some(([type]) => type === 'scroll')
    const addedResize = addSpy.mock.calls.some(([type]) => type === 'resize')
    expect(addedScroll).toBe(true)
    expect(addedResize).toBe(true)

    for (const m of mounted.splice(0)) await m.destroy()

    const removedScroll = removeSpy.mock.calls.some(([type]) => type === 'scroll')
    const removedResize = removeSpy.mock.calls.some(([type]) => type === 'resize')
    expect(removedScroll).toBe(true)
    expect(removedResize).toBe(true)
  })
})
