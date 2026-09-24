// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { NowPlayingBar, type NowPlayingTrack } from '../index.js'

const queue: NowPlayingTrack[] = [
  {
    id: 't1',
    title: 'Morning Light',
    artist: 'The Aurora Band',
    artwork: '/covers/morning-light.jpg',
  },
  { id: 't2', title: 'Night Drive', artist: 'Neon Coast' },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered player.
 */
function Player(): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const track = queue[index] ?? null
  return (
    <>
      <audio
        ref={audioRef}
        src={track ? `/audio/${track.id}.mp3` : undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <NowPlayingBar
        track={track}
        isPlaying={isPlaying}
        onPlay={() =>
          audioRef.current
            ?.play()
            .catch((error: unknown) => console.warn('Playback blocked', error))
        }
        onPause={() => audioRef.current?.pause()}
        onPrev={index > 0 ? () => setIndex(index - 1) : undefined}
        onNext={index < queue.length - 1 ? () => setIndex(index + 1) : undefined}
        currentTime={time} // seconds
        duration={duration} // seconds
        onSeek={(seconds) => {
          if (audioRef.current) audioRef.current.currentTime = seconds
        }}
        volume={volume} // 0..1
        onVolumeChange={(v) => {
          setVolume(v)
          if (audioRef.current) audioRef.current.volume = v
        }}
      />
    </>
  )
}

/**
 * Renders the example inside the i18n provider the bar requires.
 *
 * @returns The testing-library render result.
 */
function renderPlayer(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <Player />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  beforeEach(() => {
    // jsdom has no media playback — stand in for the browser's <audio> engine.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      this.dispatchEvent(new Event('pause'))
    })
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('drives the audio element and reflects its state in the bar', () => {
    const view = renderPlayer()
    const audio = view.container.querySelector('audio')
    expect(audio).not.toBeNull()
    const media = audio as HTMLAudioElement
    expect(media.getAttribute('src')).toBe('/audio/t1.mp3')
    expect(view.getByRole('region', { name: 'Now playing: Morning Light' })).toBeTruthy()
    expect(view.getByAltText('Artwork for Morning Light').getAttribute('src')).toBe(
      '/covers/morning-light.jpg',
    )
    expect(view.queryByRole('button', { name: 'Previous track' })).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Play' }))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
    expect(view.getByRole('button', { name: 'Pause' }).getAttribute('aria-pressed')).toBe('true')

    Object.defineProperty(media, 'duration', { configurable: true, value: 245 })
    fireEvent(media, new Event('loadedmetadata'))
    media.currentTime = 65
    fireEvent(media, new Event('timeupdate'))
    expect(view.getByText('1:05')).toBeTruthy()
    expect(view.getByText('4:05')).toBeTruthy()

    fireEvent.change(view.getByRole('slider', { name: 'Seek' }), { target: { value: '120' } })
    expect(media.currentTime).toBe(120)
    fireEvent.change(view.getByRole('slider', { name: 'Volume' }), { target: { value: '0.3' } })
    expect(media.volume).toBe(0.3)

    fireEvent.click(view.getByRole('button', { name: 'Pause' }))
    expect(view.getByRole('button', { name: 'Play' })).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Next track' }))
    expect(view.getByRole('region', { name: 'Now playing: Night Drive' })).toBeTruthy()
    expect(media.getAttribute('src')).toBe('/audio/t2.mp3')
    expect(view.queryByRole('button', { name: 'Next track' })).toBeNull()
  })
})
