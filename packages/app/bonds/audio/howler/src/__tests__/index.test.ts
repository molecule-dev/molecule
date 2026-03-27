import { describe, expect, it } from 'vitest'

import type { AudioProvider } from '@molecule/app-audio'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-audio-howler', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('howler')
    })

    it('should conform to AudioProvider interface', () => {
      const p: AudioProvider = provider
      expect(typeof p.createPlayer).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('howler')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ html5: true, volume: 0.5 })
      expect(p.name).toBe('howler')
    })
  })

  describe('player instance', () => {
    it('should create a player', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      expect(player).toBeDefined()
      expect(player.isPlaying()).toBe(false)
    })

    it('should play and pause', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      player.play()
      expect(player.isPlaying()).toBe(true)
      player.pause()
      expect(player.isPlaying()).toBe(false)
    })

    it('should stop and reset time', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      player.play()
      player.seek(30)
      player.stop()
      expect(player.isPlaying()).toBe(false)
      expect(player.getCurrentTime()).toBe(0)
    })

    it('should seek to position', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      player.seek(30)
      expect(player.getCurrentTime()).toBe(0) // duration is 0, so clamped
    })

    it('should set and get volume', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      player.setVolume(0.5)
      expect(player.getVolume()).toBe(0.5)
    })

    it('should clamp volume between 0 and 1', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      player.setVolume(1.5)
      expect(player.getVolume()).toBe(1)
      player.setVolume(-0.5)
      expect(player.getVolume()).toBe(0)
    })

    it('should use initial volume from options', () => {
      const player = provider.createPlayer({ src: '/audio.mp3', volume: 0.3 })
      expect(player.getVolume()).toBe(0.3)
    })

    it('should default volume to 1.0', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      expect(player.getVolume()).toBe(1.0)
    })

    it('should return duration', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      expect(player.getDuration()).toBe(0)
    })

    it('should destroy player', () => {
      const player = provider.createPlayer({ src: '/audio.mp3' })
      player.play()
      player.destroy()
      expect(player.isPlaying()).toBe(false)
      expect(player.getCurrentTime()).toBe(0)
    })

    it('should accept array of sources', () => {
      const player = provider.createPlayer({
        src: ['/audio.mp3', '/audio.ogg'],
      })
      expect(player).toBeDefined()
    })
  })
})
