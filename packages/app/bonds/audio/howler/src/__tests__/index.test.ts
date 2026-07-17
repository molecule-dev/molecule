import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AudioProvider } from '@molecule/app-audio'

// Howler needs a real browser audio backend (Web Audio / HTML5 Audio) that
// jsdom/node don't provide, so we mock the whole module and assert the provider
// wires each interface method onto the corresponding real Howler call. The mock
// `Howl` instance is stateful — `duration()`, `seek()`, `playing()`, `volume()`
// report values from `howlState`, so the tests prove those reads reflect Howler
// state rather than hardcoded 0/false.
const { MockHowl, mockHowler, howlState } = vi.hoisted(() => {
  const howlState = {
    options: null as unknown,
    handlers: {} as Record<string, Array<(...args: unknown[]) => void>>,
    instance: null as Record<string, ReturnType<typeof vi.fn>> | null,
    volume: 1,
    duration: 0,
    position: 0,
    isPlaying: false,
  }

  const makeInstance = (options: unknown): Record<string, ReturnType<typeof vi.fn>> => {
    howlState.options = options
    howlState.handlers = {}

    const on = vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      ;(howlState.handlers[event] ||= []).push(callback)
      return instance
    })

    const instance: Record<string, ReturnType<typeof vi.fn>> = {
      play: vi.fn(() => 1),
      pause: vi.fn(() => instance),
      stop: vi.fn(() => instance),
      // Getter (no arg) returns the position; setter (with arg) returns the Howl.
      seek: vi.fn((value?: number) => (typeof value === 'number' ? instance : howlState.position)),
      // Getter (no arg) returns the volume; setter (with arg) returns the Howl.
      volume: vi.fn((value?: number) => (typeof value === 'number' ? instance : howlState.volume)),
      rate: vi.fn((value?: number) => (typeof value === 'number' ? instance : 1)),
      duration: vi.fn(() => howlState.duration),
      playing: vi.fn(() => howlState.isPlaying),
      state: vi.fn(() => 'loaded'),
      load: vi.fn(() => instance),
      unload: vi.fn(() => null),
      off: vi.fn(() => instance),
      on,
    }

    howlState.instance = instance
    return instance
  }

  // Regular function (not an arrow) so `new Howl(...)` can construct it; the
  // returned object overrides `this`.
  const MockHowl = vi.fn(function (options: unknown) {
    return makeInstance(options)
  })
  const mockHowler = { volume: vi.fn(() => 1) }

  return { MockHowl, mockHowler, howlState }
})

vi.mock('howler', () => ({ Howl: MockHowl, Howler: mockHowler }))

import { createHowlerPlayer, createProvider, provider } from '../index.js'

/** Invokes every handler the provider registered for a Howler event. */
const fire = (event: string, ...args: unknown[]): void => {
  howlState.handlers[event]?.forEach((handler) => handler(...args))
}

describe('@molecule/app-audio-howler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    howlState.options = null
    howlState.handlers = {}
    howlState.instance = null
    howlState.volume = 1
    howlState.duration = 0
    howlState.position = 0
    howlState.isPlaying = false
  })

  describe('provider', () => {
    it('exports a default provider instance conforming to AudioProvider', () => {
      const p: AudioProvider = provider
      expect(p.name).toBe('howler')
      expect(typeof p.createPlayer).toBe('function')
    })

    it('createProvider applies config.volume to the Howler global volume', () => {
      createProvider({ volume: 0.4 })
      expect(mockHowler.volume).toHaveBeenCalledWith(0.4)
    })

    it('createProvider leaves the global volume untouched when omitted', () => {
      createProvider({})
      expect(mockHowler.volume).not.toHaveBeenCalled()
    })
  })

  describe('createPlayer → Howl construction', () => {
    it('constructs a Howl with the mapped src and options', () => {
      createProvider({ html5: true }).createPlayer({
        src: '/audio.mp3',
        loop: true,
        autoplay: true,
        volume: 0.5,
      })

      expect(MockHowl).toHaveBeenCalledTimes(1)
      expect(MockHowl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/audio.mp3'],
          loop: true,
          autoplay: true,
          volume: 0.5,
          html5: true,
        }),
      )
    })

    it('normalizes an array of sources and defaults html5/loop/autoplay off', () => {
      createProvider().createPlayer({ src: ['/audio.mp3', '/audio.ogg'] })

      expect(MockHowl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/audio.mp3', '/audio.ogg'],
          loop: false,
          autoplay: false,
          html5: false,
          volume: 1,
        }),
      )
    })

    it('clamps the initial volume into the 0.0–1.0 range', () => {
      createProvider().createPlayer({ src: '/audio.mp3', volume: 5 })
      expect(MockHowl).toHaveBeenCalledWith(expect.objectContaining({ volume: 1 }))
    })
  })

  describe('playback controls delegate to Howler', () => {
    it('play/pause/stop call the corresponding Howl methods', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      const howl = howlState.instance!

      player.play()
      expect(howl.play).toHaveBeenCalledTimes(1)

      player.pause()
      expect(howl.pause).toHaveBeenCalledTimes(1)

      player.stop()
      expect(howl.stop).toHaveBeenCalledTimes(1)
    })

    it('seek clamps below 0 and forwards the position to Howl.seek', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      const howl = howlState.instance!

      player.seek(30)
      expect(howl.seek).toHaveBeenCalledWith(30)

      player.seek(-5)
      expect(howl.seek).toHaveBeenCalledWith(0)
    })

    it('setVolume forwards a clamped value to Howl.volume', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      const howl = howlState.instance!

      player.setVolume(0.5)
      expect(howl.volume).toHaveBeenCalledWith(0.5)

      player.setVolume(1.5)
      expect(howl.volume).toHaveBeenCalledWith(1)

      player.setVolume(-0.5)
      expect(howl.volume).toHaveBeenCalledWith(0)
    })

    it('destroy stops the progress loop and unloads the Howl', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      const howl = howlState.instance!

      player.destroy()
      expect(howl.off).toHaveBeenCalledTimes(1)
      expect(howl.unload).toHaveBeenCalledTimes(1)
    })
  })

  describe('state reads reflect real Howler state', () => {
    it('getDuration returns the loaded duration Howl reports (not 0)', () => {
      howlState.duration = 214.5
      const player = provider.createPlayer({ src: '/audio.mp3' })

      expect(player.getDuration()).toBe(214.5)
      expect(howlState.instance!.duration).toHaveBeenCalled()
    })

    it('getCurrentTime returns the real seek position Howl reports', () => {
      howlState.position = 42.7
      const player = provider.createPlayer({ src: '/audio.mp3' })

      expect(player.getCurrentTime()).toBe(42.7)
      // seek() called with no argument (the getter form).
      expect(howlState.instance!.seek).toHaveBeenCalledWith()
    })

    it('getCurrentTime falls back to 0 when seek() returns the Howl (pre-load)', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      const howl = howlState.instance!
      // Simulate Howler returning the instance (not a number) before load.
      howl.seek.mockReturnValueOnce(howl)

      expect(player.getCurrentTime()).toBe(0)
    })

    it('getVolume returns the volume Howl reports', () => {
      howlState.volume = 0.33
      const player = provider.createPlayer({ src: '/audio.mp3' })

      expect(player.getVolume()).toBe(0.33)
      expect(howlState.instance!.volume).toHaveBeenCalledWith()
    })

    it('isPlaying returns the playing state Howl reports', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })

      expect(player.isPlaying()).toBe(false)
      howlState.isPlaying = true
      expect(player.isPlaying()).toBe(true)
      expect(howlState.instance!.playing).toHaveBeenCalled()
    })
  })

  describe('event subscriptions register via Howl.on', () => {
    it('subscribes to play/pause/stop/end/load through Howl.on', () => {
      provider.createPlayer({ src: '/audio.mp3' })
      const registered = howlState.instance!.on.mock.calls.map((call) => call[0])

      expect(registered).toEqual(expect.arrayContaining(['play', 'pause', 'stop', 'end', 'load']))
    })

    it('forwards the Howler "end" event to the caller onEnd', () => {
      const onEnd = vi.fn()
      provider.createPlayer({ src: '/audio.mp3', onEnd })

      expect(onEnd).not.toHaveBeenCalled()
      fire('end')
      expect(onEnd).toHaveBeenCalledTimes(1)
    })

    it('emits onProgress with (currentTime, duration) on the Howler "load" event', () => {
      const onProgress = vi.fn()
      howlState.position = 0
      howlState.duration = 200
      provider.createPlayer({ src: '/audio.mp3', onProgress })

      fire('load')
      expect(onProgress).toHaveBeenCalledWith(0, 200)
    })

    it('drives onProgress from a requestAnimationFrame loop while playing', () => {
      let captured: FrameRequestCallback | null = null
      const original = globalThis.requestAnimationFrame
      globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        captured = callback
        return 1
      }) as typeof globalThis.requestAnimationFrame

      try {
        const onProgress = vi.fn()
        howlState.position = 12
        howlState.duration = 200
        howlState.isPlaying = true
        createHowlerPlayer({ src: '/audio.mp3', onProgress })

        // The Howler "play" event starts the progress loop.
        fire('play')
        expect(captured).toBeTypeOf('function')

        // One frame elapses; stop after this tick so it does not reschedule.
        howlState.isPlaying = false
        captured!(0)
        expect(onProgress).toHaveBeenCalledWith(12, 200)
      } finally {
        globalThis.requestAnimationFrame = original
      }
    })

    it('does not start a progress loop when no onProgress callback is given', () => {
      let scheduled = 0
      const original = globalThis.requestAnimationFrame
      globalThis.requestAnimationFrame = ((_callback: FrameRequestCallback) => {
        scheduled += 1
        return 1
      }) as typeof globalThis.requestAnimationFrame

      try {
        provider.createPlayer({ src: '/audio.mp3' })
        fire('play')
        expect(scheduled).toBe(0)
      } finally {
        globalThis.requestAnimationFrame = original
      }
    })
  })
})
