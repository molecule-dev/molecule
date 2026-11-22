// @vitest-environment jsdom
/**
 * Unit tests for the Solid `NowPlayingBar` — a port of
 * `@molecule/app-now-playing-bar-react/src/__tests__/NowPlayingBar.test.tsx`:
 * the same test names and behavioral assertions, rendered with Solid in jsdom
 * and asserted on the DOM the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { NowPlayingTrack } from '../types.js'

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
// resolves to the inline English default, interpolating `{{placeholders}}`.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values: Record<string, unknown> = {}, opts?: { defaultValue?: string }) =>
      (opts?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        String(values[name] ?? ''),
      ),
    locale: () => 'en',
    setLocale: () => {},
  }),
}))

const { formatTime, NowPlayingBar } = await import('../NowPlayingBar.jsx')
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view to render.
 * @returns The container element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={0}
        duration={180}
        {...required}
      />
    ))
    const region = host.querySelector('[role="region"]')!
    expect(region.getAttribute('aria-label')).toContain('Midnight City')
    expect(region.getAttribute('data-mol-id')).toBe('now-playing-bar')
  })

  it('renders title, artist, and artwork', () => {
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={0}
        duration={180}
        {...required}
      />
    ))
    expect(host.querySelector('[data-mol-id="now-playing-bar-title"]')?.textContent).toBe(
      'Midnight City',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-artist"]')?.textContent).toBe('M83')
    const img = host.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.test/art.jpg')
    expect(img?.getAttribute('alt')).toContain('Midnight City')
  })

  it('shows Play label when paused and Pause label when playing', () => {
    const [isPlaying, setPlaying] = createSignal(false)
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={isPlaying()}
        currentTime={0}
        duration={180}
        {...required}
      />
    ))
    const btn = (): Element => host.querySelector('[data-mol-id="now-playing-bar-play"]')!
    expect(btn().getAttribute('aria-label')).toBe('Play')
    expect(btn().getAttribute('aria-pressed')).toBe('false')

    setPlaying(true)
    expect(btn().getAttribute('aria-label')).toBe('Pause')
    expect(btn().getAttribute('aria-pressed')).toBe('true')
  })

  it('fires onPlay when paused and the toggle is clicked', () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        onPlay={onPlay}
        onPause={onPause}
        currentTime={0}
        duration={180}
        onSeek={() => {}}
      />
    ))
    click(host, '[data-mol-id="now-playing-bar-play"]')
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPause).not.toHaveBeenCalled()
  })

  it('fires onPause when playing and the toggle is clicked', () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying
        onPlay={onPlay}
        onPause={onPause}
        currentTime={0}
        duration={180}
        onSeek={() => {}}
      />
    ))
    click(host, '[data-mol-id="now-playing-bar-play"]')
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('hides next/prev buttons when handlers are not provided', () => {
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={0}
        duration={180}
        {...required}
      />
    ))
    expect(host.querySelector('[data-mol-id="now-playing-bar-prev"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="now-playing-bar-next"]')).toBeNull()
  })

  it('fires onPrev / onNext when their handlers are provided', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={0}
        duration={180}
        {...required}
        onPrev={onPrev}
        onNext={onNext}
      />
    ))
    click(host, '[data-mol-id="now-playing-bar-prev"]')
    click(host, '[data-mol-id="now-playing-bar-next"]')
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('renders current time and duration formatted as m:ss', () => {
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={65}
        duration={245}
        {...required}
      />
    ))
    expect(host.querySelector('[data-mol-id="now-playing-bar-current-time"]')?.textContent).toBe(
      '1:05',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-duration"]')?.textContent).toBe('4:05')
  })

  it('fires onSeek with parsed numeric value', () => {
    const onSeek = vi.fn()
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={0}
        duration={180}
        onPlay={() => {}}
        onPause={() => {}}
        onSeek={onSeek}
      />
    ))
    input(host, '[data-mol-id="now-playing-bar-seek"]', '42')
    expect(onSeek).toHaveBeenCalledWith(42)
  })

  it('hides volume control when volume / handler are not provided', () => {
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={0}
        duration={180}
        {...required}
      />
    ))
    expect(host.querySelector('[data-mol-id="now-playing-bar-volume"]')).toBeNull()
  })

  it('fires onVolumeChange with parsed value', () => {
    const onVolumeChange = vi.fn()
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={0}
        duration={180}
        {...required}
        volume={0.5}
        onVolumeChange={onVolumeChange}
      />
    ))
    const slider = host.querySelector('[data-mol-id="now-playing-bar-volume-slider"]')
    expect(slider).not.toBeNull()
    input(host, '[data-mol-id="now-playing-bar-volume-slider"]', '0.8')
    expect(onVolumeChange).toHaveBeenCalledWith(0.8)
  })

  it('renders trailing slot when provided', () => {
    const host = mount(() => (
      <NowPlayingBar
        track={baseTrack}
        isPlaying={false}
        currentTime={0}
        duration={180}
        {...required}
        trailing={<button data-mol-id="custom-queue">Q</button>}
      />
    ))
    const trailing = host.querySelector('[data-mol-id="now-playing-bar-trailing"]')
    expect(trailing).not.toBeNull()
    expect(trailing?.querySelector('[data-mol-id="custom-queue"]')).not.toBeNull()
  })

  it('renders the documented empty state (no throw) when track is null', () => {
    let host: HTMLElement | undefined
    expect(() => {
      host = mount(() => (
        <NowPlayingBar track={null} isPlaying={false} currentTime={0} duration={0} {...required} />
      ))
    }).not.toThrow()
    const container = host!
    const region = container.querySelector('[role="region"]')!
    expect(region.getAttribute('data-mol-id')).toBe('now-playing-bar')
    expect(region.getAttribute('data-mol-empty')).toBe('true')
    const empty = container.querySelector('[data-mol-id="now-playing-bar-empty"]')
    expect(empty?.textContent).toBe('Nothing playing')
    expect(container.querySelector('[data-mol-id="now-playing-bar-play"]')).toBeNull()
  })

  it('renders the empty state when track is undefined (prop omitted)', () => {
    const host = mount(() => (
      <NowPlayingBar isPlaying={false} currentTime={0} duration={0} {...required} />
    ))
    expect(host.querySelector('[role="region"]')?.getAttribute('data-mol-empty')).toBe('true')
    expect(host.querySelector('[data-mol-id="now-playing-bar-empty"]')?.textContent).toBe(
      'Nothing playing',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-seek"]')).toBeNull()
  })

  it('renders artwork placeholder div when artwork is omitted', () => {
    const host = mount(() => (
      <NowPlayingBar
        track={{ id: 't2', title: 'Empty', artist: 'Nobody' }}
        isPlaying={false}
        currentTime={0}
        duration={0}
        {...required}
      />
    ))
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-mol-id="now-playing-bar-artwork"]')).not.toBeNull()
  })
})
