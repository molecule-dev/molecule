// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { formatTime, NowPlayingBar, type NowPlayingTrack } from '../NowPlayingBar.js'

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

const baseTrack: NowPlayingTrack = {
  id: 't1',
  title: 'Midnight City',
  artist: 'M83',
  artwork: 'https://example.test/art.jpg',
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
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
    const { getByRole } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    const region = getByRole('region')
    expect(region.getAttribute('aria-label')).toContain('Midnight City')
    expect(region.getAttribute('data-mol-id')).toBe('now-playing-bar')
  })

  it('renders title, artist, and artwork', () => {
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="now-playing-bar-title"]')?.textContent).toBe(
      'Midnight City',
    )
    expect(container.querySelector('[data-mol-id="now-playing-bar-artist"]')?.textContent).toBe(
      'M83',
    )
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.test/art.jpg')
    expect(img?.getAttribute('alt')).toContain('Midnight City')
  })

  it('shows Play label when paused and Pause label when playing', () => {
    const { rerender, container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    const btn = (): Element => container.querySelector('[data-mol-id="now-playing-bar-play"]')!
    expect(btn().getAttribute('aria-label')).toBe('Play')
    expect(btn().getAttribute('aria-pressed')).toBe('false')

    rerender(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    expect(btn().getAttribute('aria-label')).toBe('Pause')
    expect(btn().getAttribute('aria-pressed')).toBe('true')
  })

  it('fires onPlay when paused and the toggle is clicked', () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={onPlay}
          onPause={onPause}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="now-playing-bar-play"]')!)
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPause).not.toHaveBeenCalled()
  })

  it('fires onPause when playing and the toggle is clicked', () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying
          onPlay={onPlay}
          onPause={onPause}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="now-playing-bar-play"]')!)
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('hides next/prev buttons when handlers are not provided', () => {
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="now-playing-bar-prev"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="now-playing-bar-next"]')).toBeNull()
  })

  it('fires onPrev / onNext when their handlers are provided', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          onPrev={onPrev}
          onNext={onNext}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="now-playing-bar-prev"]')!)
    fireEvent.click(container.querySelector('[data-mol-id="now-playing-bar-next"]')!)
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('renders current time and duration formatted as m:ss', () => {
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={65}
          duration={245}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    expect(
      container.querySelector('[data-mol-id="now-playing-bar-current-time"]')?.textContent,
    ).toBe('1:05')
    expect(container.querySelector('[data-mol-id="now-playing-bar-duration"]')?.textContent).toBe(
      '4:05',
    )
  })

  it('fires onSeek with parsed numeric value', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={onSeek}
        />
      </Wrap>,
    )
    const slider = container.querySelector(
      '[data-mol-id="now-playing-bar-seek"]',
    ) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '42' } })
    expect(onSeek).toHaveBeenCalledWith(42)
  })

  it('hides volume control when volume / handler are not provided', () => {
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="now-playing-bar-volume"]')).toBeNull()
  })

  it('fires onVolumeChange with parsed value', () => {
    const onVolumeChange = vi.fn()
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
          volume={0.5}
          onVolumeChange={onVolumeChange}
        />
      </Wrap>,
    )
    const slider = container.querySelector(
      '[data-mol-id="now-playing-bar-volume-slider"]',
    ) as HTMLInputElement
    expect(slider).not.toBeNull()
    fireEvent.change(slider, { target: { value: '0.8' } })
    expect(onVolumeChange).toHaveBeenCalledWith(0.8)
  })

  it('renders trailing slot when provided', () => {
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={baseTrack}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={180}
          onSeek={() => {}}
          trailing={<button data-mol-id="custom-queue">Q</button>}
        />
      </Wrap>,
    )
    const trailing = container.querySelector('[data-mol-id="now-playing-bar-trailing"]')
    expect(trailing).not.toBeNull()
    expect(trailing?.querySelector('[data-mol-id="custom-queue"]')).not.toBeNull()
  })

  it('renders the documented empty state (no throw) when track is null', () => {
    let result: ReturnType<typeof render> | undefined
    // The whole point of the fix: a null track must not throw.
    expect(() => {
      result = render(
        <Wrap>
          <NowPlayingBar
            track={null}
            isPlaying={false}
            onPlay={() => {}}
            onPause={() => {}}
            currentTime={0}
            duration={0}
            onSeek={() => {}}
          />
        </Wrap>,
      )
    }).not.toThrow()
    const container = result!.container
    const region = container.querySelector('[role="region"]')!
    expect(region.getAttribute('data-mol-id')).toBe('now-playing-bar')
    expect(region.getAttribute('data-mol-empty')).toBe('true')
    const empty = container.querySelector('[data-mol-id="now-playing-bar-empty"]')
    expect(empty?.textContent).toBe('Nothing playing')
    // The transport / play controls must NOT be present in the empty state.
    expect(container.querySelector('[data-mol-id="now-playing-bar-play"]')).toBeNull()
  })

  it('renders the empty state when track is undefined (prop omitted)', () => {
    const { container, getByRole } = render(
      <Wrap>
        <NowPlayingBar
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={0}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    expect(getByRole('region').getAttribute('data-mol-empty')).toBe('true')
    expect(container.querySelector('[data-mol-id="now-playing-bar-empty"]')?.textContent).toBe(
      'Nothing playing',
    )
    expect(container.querySelector('[data-mol-id="now-playing-bar-seek"]')).toBeNull()
  })

  it('renders artwork placeholder div when artwork is omitted', () => {
    const { container } = render(
      <Wrap>
        <NowPlayingBar
          track={{ id: 't2', title: 'Empty', artist: 'Nobody' }}
          isPlaying={false}
          onPlay={() => {}}
          onPause={() => {}}
          currentTime={0}
          duration={0}
          onSeek={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelector('img')).toBeNull()
    const wrap = container.querySelector('[data-mol-id="now-playing-bar-artwork"]')
    expect(wrap).not.toBeNull()
  })
})
