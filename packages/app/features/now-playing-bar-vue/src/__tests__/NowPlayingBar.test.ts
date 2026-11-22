// @vitest-environment jsdom
/**
 * Unit tests for the Vue `NowPlayingBar` — a port of
 * `@molecule/app-now-playing-bar-react/src/__tests__/NowPlayingBar.test.tsx`:
 * the same test names and behavioral assertions, rendered with Vue in jsdom
 * and asserted on the DOM the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, reactive, type VNodeChild } from 'vue'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values: Record<string, unknown> = {}, opts?: { defaultValue?: string }) =>
      (opts?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        String(values[name] ?? ''),
      ),
    locale: 'en',
    setLocale: () => {},
  }),
}))

import { formatTime, NowPlayingBar } from '../NowPlayingBar.js'
import type { NowPlayingTrack } from '../types.js'

/** A mounted bar: its host element and a props updater. */
interface Mounted {
  /** The host element whose children the component rendered. */
  readonly host: HTMLElement
  /** The live props object the render reads (mutate then `await nextTick()`). */
  readonly props: Record<string, unknown>
  /** Merges props and flushes reactivity. */
  update(next: Record<string, unknown>): Promise<void>
}

/** Mounted apps, unmounted in `afterEach`. */
const apps: Array<{ app: ReturnType<typeof createApp>; host: HTMLElement }> = []

/**
 * Mounts a `NowPlayingBar` with the given props.
 *
 * @param props - The component props.
 * @param slots - Optional named slots (e.g. `trailing`).
 * @returns The mounted bar.
 */
function mount(
  props: Record<string, unknown>,
  slots?: () => Record<string, () => VNodeChild[]>,
): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const live = reactive<Record<string, unknown>>({ ...props })
  const app = createApp(
    defineComponent({ render: () => h(NowPlayingBar, live, slots ? slots() : undefined) }),
  )
  app.mount(host)
  apps.push({ app, host })
  return {
    host,
    props: live,
    update: async (next: Record<string, unknown>) => {
      Object.assign(live, next)
      await nextTick()
    },
  }
}

const baseTrack: NowPlayingTrack = {
  id: 't1',
  title: 'Midnight City',
  artist: 'M83',
  artwork: 'https://example.test/art.jpg',
}

/** The required callbacks of a non-empty case. */
const required = { onPlay: () => {}, onPause: () => {}, onSeek: () => {} }

/**
 * Dispatches a click on the first element matching the selector.
 *
 * @param host - The mounted host element.
 * @param selector - The CSS selector.
 */
function click(host: HTMLElement, selector: string): void {
  host.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

/**
 * Sets an input's value and dispatches its `input` event, as a user would.
 *
 * @param host - The mounted host element.
 * @param selector - The CSS selector.
 * @param value - The new value.
 */
function input(host: HTMLElement, selector: string, value: string): void {
  const element = host.querySelector(selector) as HTMLInputElement
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

afterEach(() => {
  for (const { app, host } of apps.splice(0)) {
    app.unmount()
    host.remove()
  }
  document.body.innerHTML = ''
})

describe('formatTime', () => {
  it('formats whole minutes', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(125)).toBe('2:05')
  })

  it('returns 0:00 for non-finite or negative input', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(Infinity)).toBe('0:00')
    expect(formatTime(-1)).toBe('0:00')
  })
})

describe('<NowPlayingBar>', () => {
  it('renders a region with an aria-label naming the track', () => {
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    const region = host.querySelector('[role="region"]')!
    expect(region.getAttribute('aria-label')).toContain('Midnight City')
    expect(region.getAttribute('data-mol-id')).toBe('now-playing-bar')
  })

  it('renders title, artist, and artwork', () => {
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    expect(host.querySelector('[data-mol-id="now-playing-bar-title"]')?.textContent).toBe(
      'Midnight City',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-artist"]')?.textContent).toBe('M83')
    const img = host.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.test/art.jpg')
    expect(img?.getAttribute('alt')).toContain('Midnight City')
  })

  it('shows Play label when paused and Pause label when playing', async () => {
    const mounted = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    const btn = (): Element => mounted.host.querySelector('[data-mol-id="now-playing-bar-play"]')!
    expect(btn().getAttribute('aria-label')).toBe('Play')
    expect(btn().getAttribute('aria-pressed')).toBe('false')

    await mounted.update({ isPlaying: true })
    expect(btn().getAttribute('aria-label')).toBe('Pause')
    expect(btn().getAttribute('aria-pressed')).toBe('true')
  })

  it('fires onPlay when paused and the toggle is clicked', () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      onPlay,
      onPause,
      currentTime: 0,
      duration: 180,
      onSeek: () => {},
    })
    click(host, '[data-mol-id="now-playing-bar-play"]')
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPause).not.toHaveBeenCalled()
  })

  it('fires onPause when playing and the toggle is clicked', () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const { host } = mount({
      track: baseTrack,
      isPlaying: true,
      onPlay,
      onPause,
      currentTime: 0,
      duration: 180,
      onSeek: () => {},
    })
    click(host, '[data-mol-id="now-playing-bar-play"]')
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('hides next/prev buttons when handlers are not provided', () => {
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    expect(host.querySelector('[data-mol-id="now-playing-bar-prev"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="now-playing-bar-next"]')).toBeNull()
  })

  it('fires onPrev / onNext when their handlers are provided', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
      onPrev,
      onNext,
    })
    click(host, '[data-mol-id="now-playing-bar-prev"]')
    click(host, '[data-mol-id="now-playing-bar-next"]')
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('renders current time and duration formatted as m:ss', () => {
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 65,
      duration: 245,
      ...required,
    })
    expect(host.querySelector('[data-mol-id="now-playing-bar-current-time"]')?.textContent).toBe(
      '1:05',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-duration"]')?.textContent).toBe('4:05')
  })

  it('fires onSeek with parsed numeric value', () => {
    const onSeek = vi.fn()
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      onPlay: () => {},
      onPause: () => {},
      onSeek,
    })
    input(host, '[data-mol-id="now-playing-bar-seek"]', '42')
    expect(onSeek).toHaveBeenCalledWith(42)
  })

  it('hides volume control when volume / handler are not provided', () => {
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    expect(host.querySelector('[data-mol-id="now-playing-bar-volume"]')).toBeNull()
  })

  it('fires onVolumeChange with parsed value', () => {
    const onVolumeChange = vi.fn()
    const { host } = mount({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
      volume: 0.5,
      onVolumeChange,
    })
    const slider = host.querySelector('[data-mol-id="now-playing-bar-volume-slider"]')
    expect(slider).not.toBeNull()
    input(host, '[data-mol-id="now-playing-bar-volume-slider"]', '0.8')
    expect(onVolumeChange).toHaveBeenCalledWith(0.8)
  })

  it('renders trailing slot when provided', () => {
    const { host } = mount(
      { track: baseTrack, isPlaying: false, currentTime: 0, duration: 180, ...required },
      () => ({
        trailing: () => [h('button', { 'data-mol-id': 'custom-queue' }, 'Q')],
      }),
    )
    const trailing = host.querySelector('[data-mol-id="now-playing-bar-trailing"]')
    expect(trailing).not.toBeNull()
    expect(trailing?.querySelector('[data-mol-id="custom-queue"]')).not.toBeNull()
  })

  it('renders the documented empty state (no throw) when track is null', () => {
    let mounted: Mounted | undefined
    expect(() => {
      mounted = mount({ track: null, isPlaying: false, currentTime: 0, duration: 0, ...required })
    }).not.toThrow()
    const host = mounted!.host
    const region = host.querySelector('[role="region"]')!
    expect(region.getAttribute('data-mol-id')).toBe('now-playing-bar')
    expect(region.getAttribute('data-mol-empty')).toBe('true')
    const empty = host.querySelector('[data-mol-id="now-playing-bar-empty"]')
    expect(empty?.textContent).toBe('Nothing playing')
    expect(host.querySelector('[data-mol-id="now-playing-bar-play"]')).toBeNull()
  })

  it('renders the empty state when track is undefined (prop omitted)', () => {
    const { host } = mount({ isPlaying: false, currentTime: 0, duration: 0, ...required })
    expect(host.querySelector('[role="region"]')?.getAttribute('data-mol-empty')).toBe('true')
    expect(host.querySelector('[data-mol-id="now-playing-bar-empty"]')?.textContent).toBe(
      'Nothing playing',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-seek"]')).toBeNull()
  })

  it('renders artwork placeholder div when artwork is omitted', () => {
    const { host } = mount({
      track: { id: 't2', title: 'Empty', artist: 'Nobody' },
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      ...required,
    })
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-mol-id="now-playing-bar-artwork"]')).not.toBeNull()
  })
})
