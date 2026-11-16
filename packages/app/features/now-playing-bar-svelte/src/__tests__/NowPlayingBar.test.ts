// @vitest-environment jsdom
/**
 * Unit tests for `NowPlayingBar`, ported from
 * `@molecule/app-now-playing-bar-react`'s own suite: the same test names and
 * behavioral assertions, rendered with a real mount (jsdom), the bonded
 * ClassMap and the bonded i18n provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatTime } from '../format.js'
import NowPlayingBar from '../NowPlayingBar.svelte'
import type { NowPlayingTrack } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: Array<ReturnType<typeof mount>> = []

/**
 * Mounts a `NowPlayingBar` with the given props.
 *
 * @param props - The component props.
 * @returns The host element.
 */
function render(props: Record<string, unknown>): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(NowPlayingBar, { target, props }))
  flushSync()
  return target
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
  flushSync()
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
  flushSync()
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
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
    const host = render({
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
    const host = render({
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

  it('shows Play label when paused and Pause label when playing', () => {
    const paused = render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    const pausedBtn = paused.querySelector('[data-mol-id="now-playing-bar-play"]')!
    expect(pausedBtn.getAttribute('aria-label')).toBe('Play')
    expect(pausedBtn.getAttribute('aria-pressed')).toBe('false')

    const playing = render({
      track: baseTrack,
      isPlaying: true,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    const playingBtn = playing.querySelector('[data-mol-id="now-playing-bar-play"]')!
    expect(playingBtn.getAttribute('aria-label')).toBe('Pause')
    expect(playingBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('fires onPlay when paused and the toggle is clicked', () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const host = render({
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
    const host = render({
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
    const host = render({
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
    const host = render({
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
    const host = render({
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
    const host = render({
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
    const host = render({
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
    const host = render({
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
    const host = render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
      trailing: raw('<button data-mol-id="custom-queue">Q</button>'),
    })
    const trailing = host.querySelector('[data-mol-id="now-playing-bar-trailing"]')
    expect(trailing).not.toBeNull()
    expect(trailing?.querySelector('[data-mol-id="custom-queue"]')).not.toBeNull()
  })

  it('renders the documented empty state (no throw) when track is null', () => {
    let host: HTMLElement | undefined
    expect(() => {
      host = render({ track: null, isPlaying: false, currentTime: 0, duration: 0, ...required })
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
    const host = render({ isPlaying: false, currentTime: 0, duration: 0, ...required })
    expect(host.querySelector('[role="region"]')?.getAttribute('data-mol-empty')).toBe('true')
    expect(host.querySelector('[data-mol-id="now-playing-bar-empty"]')?.textContent).toBe(
      'Nothing playing',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-seek"]')).toBeNull()
  })

  it('renders artwork placeholder div when artwork is omitted', () => {
    const host = render({
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
