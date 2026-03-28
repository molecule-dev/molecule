import { beforeEach, describe, expect, it } from 'vitest'

import type { AudioPlayerInstance, AudioPlayerOptions, AudioProvider } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-audio', () => {
  beforeEach(() => {
    setProvider(null as unknown as AudioProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile AudioPlayerOptions with string src', () => {
      const options: AudioPlayerOptions = {
        src: '/audio/track.mp3',
        autoplay: false,
        loop: true,
        volume: 0.5,
        onEnd: () => {},
        onProgress: () => {},
      }
      expect(options.volume).toBe(0.5)
    })

    it('should compile AudioPlayerOptions with array src', () => {
      const options: AudioPlayerOptions = {
        src: ['/audio/track.mp3', '/audio/track.ogg'],
      }
      expect(Array.isArray(options.src)).toBe(true)
    })

    it('should compile AudioPlayerOptions with minimal fields', () => {
      const options: AudioPlayerOptions = { src: '/audio.mp3' }
      expect(options.autoplay).toBeUndefined()
    })

    it('should compile AudioPlayerInstance type', () => {
      const instance: AudioPlayerInstance = {
        play: () => {},
        pause: () => {},
        stop: () => {},
        seek: () => {},
        setVolume: () => {},
        getVolume: () => 1.0,
        getDuration: () => 180,
        getCurrentTime: () => 30,
        isPlaying: () => false,
        destroy: () => {},
      }
      expect(instance.getDuration()).toBe(180)
      expect(instance.isPlaying()).toBe(false)
    })

    it('should compile AudioProvider type', () => {
      const provider: AudioProvider = {
        name: 'test',
        createPlayer: () => ({
          play: () => {},
          pause: () => {},
          stop: () => {},
          seek: () => {},
          setVolume: () => {},
          getVolume: () => 1.0,
          getDuration: () => 0,
          getCurrentTime: () => 0,
          isPlaying: () => false,
          destroy: () => {},
        }),
      }
      expect(provider.name).toBe('test')
    })
  })

  describe('Provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false for hasProvider when none set', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should throw on requireProvider when none set', () => {
      expect(() => requireProvider()).toThrow(
        'Audio provider not configured. Bond an audio provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: AudioProvider = {
        name: 'test-audio',
        createPlayer: () => ({
          play: () => {},
          pause: () => {},
          stop: () => {},
          seek: () => {},
          setVolume: () => {},
          getVolume: () => 1.0,
          getDuration: () => 0,
          getCurrentTime: () => 0,
          isPlaying: () => false,
          destroy: () => {},
        }),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('Provider operations', () => {
    it('should create a player instance', () => {
      const mockInstance: AudioPlayerInstance = {
        play: () => {},
        pause: () => {},
        stop: () => {},
        seek: () => {},
        setVolume: () => {},
        getVolume: () => 0.8,
        getDuration: () => 240,
        getCurrentTime: () => 60,
        isPlaying: () => true,
        destroy: () => {},
      }
      const mockProvider: AudioProvider = {
        name: 'test',
        createPlayer: () => mockInstance,
      }
      setProvider(mockProvider)

      const player = requireProvider().createPlayer({ src: '/track.mp3' })
      expect(player.isPlaying()).toBe(true)
      expect(player.getCurrentTime()).toBe(60)
      expect(player.getDuration()).toBe(240)
      expect(player.getVolume()).toBe(0.8)
    })
  })
})
