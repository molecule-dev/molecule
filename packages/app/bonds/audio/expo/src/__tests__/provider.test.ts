import type { AudioEvents, AudioPlayer, AudioStatus, createAudioPlayer } from 'expo-audio'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider } from '../index.js'

type PlaybackListener = AudioEvents['playbackStatusUpdate']
type ExpoPlayer = Pick<
  AudioPlayer,
  | 'currentTime'
  | 'duration'
  | 'loop'
  | 'pause'
  | 'play'
  | 'playing'
  | 'release'
  | 'replace'
  | 'seekTo'
  | 'volume'
> & {
  addListener: (
    event: 'playbackStatusUpdate',
    listener: PlaybackListener,
  ) => ReturnType<AudioPlayer['addListener']>
}

const expo = vi.hoisted(() => ({
  createAudioPlayer: vi.fn<(...args: Parameters<typeof createAudioPlayer>) => ExpoPlayer>(),
}))
vi.mock('expo-audio', () => expo)

const FIRST = 'https://example.com/episode.opus'
const SECOND = 'https://example.com/episode.mp3'

function fixture() {
  let listen: PlaybackListener | undefined
  let playing = false
  const remove = vi.fn()
  const player = {
    currentTime: 0,
    duration: 100,
    loop: false,
    get playing() {
      return playing
    },
    volume: 1,
    play: vi.fn(() => {
      playing = true
    }),
    pause: vi.fn(() => {
      playing = false
    }),
    release: vi.fn(() => {
      playing = false
    }),
    replace: vi.fn<AudioPlayer['replace']>(),
    seekTo: vi.fn<AudioPlayer['seekTo']>(async (time) => {
      player.currentTime = time
    }),
    addListener: vi.fn<ExpoPlayer['addListener']>((_event, listener) => {
      listen = listener
      return { remove }
    }),
  } satisfies ExpoPlayer
  expo.createAudioPlayer.mockReturnValue(player)
  const emit = (status: Partial<AudioStatus>): void => {
    listen?.({
      id: 1,
      currentTime: player.currentTime,
      duration: player.duration,
      playbackState: 'ready',
      timeControlStatus: player.playing ? 'playing' : 'paused',
      reasonForWaitingToPlay: '',
      mute: player.volume === 0,
      playing: player.playing,
      loop: player.loop,
      didJustFinish: false,
      isLoaded: true,
      isBuffering: false,
      playbackRate: 1,
      shouldCorrectPitch: true,
      ...status,
    })
  }
  return { player, emit, remove }
}

beforeEach(() => vi.resetAllMocks())
afterEach(() => vi.useRealTimers())

describe('Expo audio provider (SDK 53)', () => {
  it('uses the SDK factory, applies volume and loop, and autoplays when requested', () => {
    const { player } = fixture()
    const audio = provider.createPlayer({ src: FIRST, autoplay: true, loop: true, volume: 0.4 })
    expect(expo.createAudioPlayer).toHaveBeenCalledExactlyOnceWith(FIRST, 100)
    expect(player.loop).toBe(true)
    expect(player.volume).toBe(0.4)
    expect(player.play).toHaveBeenCalledOnce()
    expect(audio.isPlaying()).toBe(true)
    audio.destroy()
  })

  it('plays, pauses, seeks in seconds, clamps volume, and stops at zero', async () => {
    const { player } = fixture()
    const audio = provider.createPlayer({ src: FIRST })
    expect(player.play).not.toHaveBeenCalled()
    audio.play()
    expect(audio.isPlaying()).toBe(true)
    audio.pause()
    expect(player.pause).toHaveBeenCalledOnce()
    expect(audio.isPlaying()).toBe(false)
    audio.seek(27.5)
    await vi.waitFor(() => expect(audio.getCurrentTime()).toBe(27.5))
    expect(player.seekTo).toHaveBeenLastCalledWith(27.5)
    expect(audio.getDuration()).toBe(100)
    audio.setVolume(2)
    expect(audio.getVolume()).toBe(1)
    audio.setVolume(-0.5)
    expect(player.volume).toBe(0)
    audio.stop()
    expect(player.pause).toHaveBeenCalledTimes(2)
    expect(player.seekTo).toHaveBeenLastCalledWith(0)
    expect(audio.getCurrentTime()).toBe(0)
    audio.destroy()
  })

  it('publishes normalized metadata and progress, and reports a terminal status once', () => {
    const { player, emit } = fixture()
    const progress = vi.fn()
    const end = vi.fn()
    const audio = provider.createPlayer({ src: FIRST, onProgress: progress, onEnd: end })
    expect(player.addListener).toHaveBeenCalledExactlyOnceWith(
      'playbackStatusUpdate',
      expect.any(Function),
    )
    player.duration = Number.NaN
    expect(audio.getDuration()).toBe(0)
    emit({ currentTime: -1, duration: Number.NaN, isLoaded: false })
    emit({ currentTime: 30.25, duration: 100, playing: true })
    const finished = {
      currentTime: 100,
      duration: 100,
      didJustFinish: true,
      playbackState: 'ended',
    }
    emit(finished)
    emit(finished)
    expect(progress.mock.calls).toEqual([
      [0, 0],
      [30.25, 100],
      [100, 100],
      [100, 100],
    ])
    expect(end).toHaveBeenCalledOnce()
    audio.destroy()
  })

  it('rewinds completed audio and cancels an in-flight replay when paused', async () => {
    const { player, emit } = fixture()
    const end = vi.fn()
    const audio = provider.createPlayer({ src: FIRST, onEnd: end })
    player.currentTime = 100
    emit({ didJustFinish: true })
    audio.play()
    expect(player.seekTo).toHaveBeenCalledExactlyOnceWith(0)
    expect(player.play).not.toHaveBeenCalled()
    audio.pause()
    await player.seekTo.mock.results[0]?.value
    await Promise.resolve()
    expect(player.play).not.toHaveBeenCalled()
    audio.play()
    expect(player.play).toHaveBeenCalledOnce()
    player.currentTime = 100
    emit({ didJustFinish: true })
    expect(end).toHaveBeenCalledTimes(2)
    audio.destroy()
  })

  it('tries the next URL on failure and keeps the requested playback state', () => {
    vi.useFakeTimers()
    const { player, emit } = fixture()
    const audio = provider.createPlayer({ src: [FIRST, SECOND], autoplay: true })
    expect(expo.createAudioPlayer).toHaveBeenCalledExactlyOnceWith(FIRST, 100)
    emit({ playbackState: 'failed', isLoaded: false })
    expect(player.replace).toHaveBeenCalledExactlyOnceWith(SECOND)
    expect(player.play).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(10_000)
    expect(player.replace).toHaveBeenCalledOnce()
    audio.destroy()
  })

  it('falls back after a stalled source, but leaves a loaded source alone', () => {
    vi.useFakeTimers()
    const { player, emit } = fixture()
    const loaded = provider.createPlayer({ src: [FIRST, SECOND] })
    emit({ currentTime: 0, duration: 100 })
    vi.advanceTimersByTime(10_000)
    expect(player.replace).not.toHaveBeenCalled()
    loaded.destroy()

    const stalled = provider.createPlayer({ src: [FIRST, SECOND] })
    emit({ playbackState: 'idle', isLoaded: true })
    vi.advanceTimersByTime(10_000)
    expect(player.replace).toHaveBeenCalledExactlyOnceWith(SECOND)
    expect(player.play).not.toHaveBeenCalled()
    stalled.destroy()
  })

  it('unsubscribes and releases once, ignoring late events and pending fallbacks', () => {
    vi.useFakeTimers()
    const { player, emit, remove } = fixture()
    const progress = vi.fn()
    const end = vi.fn()
    const audio = provider.createPlayer({ src: [FIRST, SECOND], onProgress: progress, onEnd: end })
    audio.destroy()
    audio.destroy()
    emit({ didJustFinish: true })
    vi.advanceTimersByTime(10_000)
    expect(remove).toHaveBeenCalledOnce()
    expect(player.release).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledBefore(player.release)
    expect(player.replace).not.toHaveBeenCalled()
    expect(progress).not.toHaveBeenCalled()
    expect(end).not.toHaveBeenCalled()
  })
})
