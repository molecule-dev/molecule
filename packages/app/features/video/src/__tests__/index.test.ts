// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createNativePlayer,
  createNativeVideoProvider,
  createPlayer,
  formatTime,
  getProvider,
  getVideoType,
  parseTime,
  setProvider,
} from '../index.js'
import type { PlayerConfig, VideoPlayer, VideoProvider, VideoSource } from '../types.js'

interface MockVideoElement {
  style: { width: string; height: string; backgroundColor: string }
  poster: string
  autoplay: boolean
  loop: boolean
  muted: boolean
  volume: number
  preload: string
  playsInline: boolean
  crossOrigin: string
  controls: boolean
  className: string
  currentTime: number
  duration: number
  paused: boolean
  ended: boolean
  seeking: boolean
  readyState: number
  playbackRate: number
  src: string
  videoWidth: number
  videoHeight: number
  buffered: {
    length: number
    start: ReturnType<typeof vi.fn>
    end: ReturnType<typeof vi.fn>
  }
  textTracks: TextTrackList
  appendChild: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  load: ReturnType<typeof vi.fn>
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  requestPictureInPicture: ReturnType<typeof vi.fn>
  innerHTML: string
  triggerEvent: (event: string) => void
}

/**
 * Helper to create a mock video element
 */
const createMockVideoElement = (): MockVideoElement => {
  const eventHandlers: Record<string, (() => void)[]> = {}

  const mockVideo: Omit<MockVideoElement, 'triggerEvent'> = {
    style: { width: '', height: '', backgroundColor: '' },
    poster: '',
    autoplay: false,
    loop: false,
    muted: false,
    volume: 1,
    preload: '',
    playsInline: false,
    crossOrigin: '',
    controls: false,
    className: '',
    currentTime: 0,
    duration: 120,
    paused: true,
    ended: false,
    seeking: false,
    readyState: 4,
    playbackRate: 1,
    src: '',
    videoWidth: 1920,
    videoHeight: 1080,
    buffered: {
      length: 1,
      start: vi.fn().mockImplementation((i: number) => (i === 0 ? 0 : 0)),
      end: vi.fn().mockImplementation((i: number) => (i === 0 ? 60 : 0)),
    },
    textTracks: {
      length: 0,
    } as unknown as TextTrackList,
    appendChild: vi.fn(),
    remove: vi.fn(),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockImplementation(function (this: { paused: boolean }) {
      this.paused = true
    }),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = []
      }
      eventHandlers[event].push(handler)
    }),
    removeEventListener: vi.fn(),
    requestPictureInPicture: vi.fn().mockResolvedValue({}),
    innerHTML: '',
  }

  return {
    ...mockVideo,
    triggerEvent: (event: string): void => {
      eventHandlers[event]?.forEach((handler) => handler())
    },
  }
}

/**
 * Helper to create a mock container element
 */
const createMockContainer = (): {
  appendChild: ReturnType<typeof vi.fn>
  requestFullscreen: ReturnType<typeof vi.fn>
} => ({
  appendChild: vi.fn(),
  requestFullscreen: vi.fn().mockResolvedValue(undefined),
})

describe('video', () => {
  describe('utilities', () => {
    describe('formatTime', () => {
      it('should format 0 seconds as 0:00', () => {
        expect(formatTime(0)).toBe('0:00')
      })

      it('should format seconds under a minute', () => {
        expect(formatTime(45)).toBe('0:45')
      })

      it('should format minutes correctly', () => {
        expect(formatTime(90)).toBe('1:30')
      })

      it('should format hours correctly', () => {
        expect(formatTime(3661)).toBe('1:01:01')
      })

      it('should pad minutes and seconds with zeros', () => {
        expect(formatTime(3605)).toBe('1:00:05')
      })

      it('should handle negative values', () => {
        expect(formatTime(-10)).toBe('0:00')
      })

      it('should handle NaN', () => {
        expect(formatTime(NaN)).toBe('0:00')
      })

      it('should handle Infinity', () => {
        expect(formatTime(Infinity)).toBe('0:00')
      })
    })

    describe('parseTime', () => {
      it('should parse seconds only', () => {
        expect(parseTime('45')).toBe(45)
      })

      it('should parse minutes and seconds', () => {
        expect(parseTime('1:30')).toBe(90)
      })

      it('should parse hours, minutes and seconds', () => {
        expect(parseTime('1:01:01')).toBe(3661)
      })

      it('should handle empty string', () => {
        expect(parseTime('')).toBe(0)
      })
    })

    describe('getVideoType', () => {
      it('should detect mp4 type', () => {
        expect(getVideoType('video.mp4')).toBe('video/mp4')
      })

      it('should detect webm type', () => {
        expect(getVideoType('video.webm')).toBe('video/webm')
      })

      it('should detect ogg type', () => {
        expect(getVideoType('video.ogg')).toBe('video/ogg')
      })

      it('should detect ogv type', () => {
        expect(getVideoType('video.ogv')).toBe('video/ogg')
      })

      it('should detect m3u8 (HLS) type', () => {
        expect(getVideoType('stream.m3u8')).toBe('application/x-mpegURL')
      })

      it('should detect mpd (DASH) type', () => {
        expect(getVideoType('stream.mpd')).toBe('application/dash+xml')
      })

      it('should handle URLs with query parameters', () => {
        expect(getVideoType('video.mp4?token=abc')).toBe('video/mp4')
      })

      it('should return undefined for unknown types', () => {
        expect(getVideoType('video.unknown')).toBeUndefined()
      })

      it('should return undefined for URLs without extension', () => {
        expect(getVideoType('video')).toBeUndefined()
      })
    })
  })

  describe('provider', () => {
    describe('createNativeVideoProvider', () => {
      let provider: VideoProvider

      beforeEach(() => {
        provider = createNativeVideoProvider()
      })

      it('should return provider name as native', () => {
        expect(provider.getName()).toBe('native')
      })

      it('should report as loaded', () => {
        expect(provider.isLoaded()).toBe(true)
      })

      it('should return supported formats', () => {
        const formats = provider.getSupportedFormats()
        expect(formats).toContain('video/mp4')
        expect(formats).toContain('video/webm')
        expect(formats).toContain('video/ogg')
      })

      it('should not support HLS natively', () => {
        expect(provider.supportsHls()).toBe(false)
      })

      it('should not support DASH natively', () => {
        expect(provider.supportsDash()).toBe(false)
      })
    })

    describe('setProvider/getProvider', () => {
      afterEach(() => {
        // Reset provider by setting native provider
        setProvider(createNativeVideoProvider())
      })

      it('should return native provider by default', () => {
        const provider = getProvider()
        expect(provider.getName()).toBe('native')
      })

      it('should allow setting custom provider', () => {
        const customProvider: VideoProvider = {
          getName: () => 'custom',
          isLoaded: () => true,
          getSupportedFormats: () => ['video/mp4'],
          supportsHls: () => true,
          supportsDash: () => true,
          createPlayer: vi.fn(),
        }

        setProvider(customProvider)
        expect(getProvider().getName()).toBe('custom')
      })
    })

    describe('createPlayer', () => {
      let mockVideo: ReturnType<typeof createMockVideoElement>
      let mockContainer: ReturnType<typeof createMockContainer>
      let originalCreateElement: typeof document.createElement

      beforeEach(() => {
        mockVideo = createMockVideoElement()
        mockContainer = createMockContainer()

        originalCreateElement = document.createElement

        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
          if (tag === 'video') {
            return mockVideo as unknown as HTMLVideoElement
          }
          if (tag === 'source') {
            return { src: '', type: '' } as unknown as HTMLSourceElement
          }
          if (tag === 'track') {
            return {
              kind: '',
              label: '',
              srclang: '',
              src: '',
              default: false,
            } as unknown as HTMLTrackElement
          }
          if (tag === 'canvas') {
            return {
              width: 0,
              height: 0,
              getContext: vi.fn().mockReturnValue({
                drawImage: vi.fn(),
              }),
              toDataURL: vi.fn().mockReturnValue('data:image/png;base64,'),
            } as unknown as HTMLCanvasElement
          }
          return originalCreateElement.call(document, tag)
        })

        vi.spyOn(document, 'getElementById').mockImplementation((id) => {
          if (id === 'video-container') {
            return mockContainer as unknown as HTMLElement
          }
          return null
        })

        // Reset provider
        setProvider(createNativeVideoProvider())
      })

      afterEach(() => {
        vi.restoreAllMocks()
      })

      it('should create player using default provider', () => {
        const config: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: [{ src: 'video.mp4', type: 'video/mp4' }],
        }

        const player = createPlayer(config)
        expect(player).toBeDefined()
      })
    })
  })

  describe('player', () => {
    let mockVideo: ReturnType<typeof createMockVideoElement>
    let mockContainer: ReturnType<typeof createMockContainer>
    let player: VideoPlayer
    let originalCreateElement: typeof document.createElement

    const defaultSources: VideoSource[] = [
      { src: 'video-720p.mp4', type: 'video/mp4', label: '720p', resolution: '720p' },
      { src: 'video-1080p.mp4', type: 'video/mp4', label: '1080p', resolution: '1080p' },
    ]

    beforeEach(() => {
      mockVideo = createMockVideoElement()
      mockContainer = createMockContainer()

      originalCreateElement = document.createElement

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'video') {
          return mockVideo as unknown as HTMLVideoElement
        }
        if (tag === 'source') {
          return { src: '', type: '' } as unknown as HTMLSourceElement
        }
        if (tag === 'track') {
          return {
            kind: '',
            label: '',
            srclang: '',
            src: '',
            default: false,
          } as unknown as HTMLTrackElement
        }
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue({
              drawImage: vi.fn(),
            }),
            toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
          } as unknown as HTMLCanvasElement
        }
        return originalCreateElement.call(document, tag)
      })

      // Mock fullscreen APIs
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      })

      Object.defineProperty(document, 'exitFullscreen', {
        value: vi.fn().mockResolvedValue(undefined),
        writable: true,
        configurable: true,
      })

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: null,
        writable: true,
        configurable: true,
      })

      Object.defineProperty(document, 'exitPictureInPicture', {
        value: vi.fn().mockResolvedValue(undefined),
        writable: true,
        configurable: true,
      })

      const config: PlayerConfig = {
        container: mockContainer as unknown as HTMLElement,
        sources: defaultSources,
      }

      player = createNativePlayer(config)
    })

    afterEach(() => {
      player.destroy()
      vi.restoreAllMocks()
    })

    describe('initialization', () => {
      it('should create video element', () => {
        expect(document.createElement).toHaveBeenCalledWith('video')
      })

      it('should append video to container', () => {
        expect(mockContainer.appendChild).toHaveBeenCalled()
      })

      it('should add sources to video', () => {
        expect(mockVideo.appendChild).toHaveBeenCalled()
      })

      it('should set video dimensions to 100%', () => {
        expect(mockVideo.style.width).toBe('100%')
        expect(mockVideo.style.height).toBe('100%')
      })

      it('should enable controls by default', () => {
        expect(mockVideo.controls).toBe(true)
      })

      it('should apply poster if provided', () => {
        const configWithPoster: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          poster: 'poster.jpg',
        }
        const playerWithPoster = createNativePlayer(configWithPoster)
        expect(mockVideo.poster).toBe('poster.jpg')
        playerWithPoster.destroy()
      })

      it('should apply autoplay if provided', () => {
        const configWithAutoplay: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          autoplay: true,
        }
        const playerWithAutoplay = createNativePlayer(configWithAutoplay)
        expect(mockVideo.autoplay).toBe(true)
        playerWithAutoplay.destroy()
      })

      it('should apply loop if provided', () => {
        const configWithLoop: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          loop: true,
        }
        const playerWithLoop = createNativePlayer(configWithLoop)
        expect(mockVideo.loop).toBe(true)
        playerWithLoop.destroy()
      })

      it('should apply muted if provided', () => {
        const configWithMuted: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          muted: true,
        }
        const playerWithMuted = createNativePlayer(configWithMuted)
        expect(mockVideo.muted).toBe(true)
        playerWithMuted.destroy()
      })

      it('should apply volume if provided', () => {
        const configWithVolume: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          volume: 0.5,
        }
        const playerWithVolume = createNativePlayer(configWithVolume)
        expect(mockVideo.volume).toBe(0.5)
        playerWithVolume.destroy()
      })

      it('should apply preload if provided', () => {
        const configWithPreload: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          preload: 'metadata',
        }
        const playerWithPreload = createNativePlayer(configWithPreload)
        expect(mockVideo.preload).toBe('metadata')
        playerWithPreload.destroy()
      })

      it('should apply playsinline if provided', () => {
        const configWithPlaysinline: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          playsinline: true,
        }
        const playerWithPlaysinline = createNativePlayer(configWithPlaysinline)
        expect(mockVideo.playsInline).toBe(true)
        playerWithPlaysinline.destroy()
      })

      it('should apply crossorigin if provided', () => {
        const configWithCrossorigin: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          crossorigin: 'anonymous',
        }
        const playerWithCrossorigin = createNativePlayer(configWithCrossorigin)
        expect(mockVideo.crossOrigin).toBe('anonymous')
        playerWithCrossorigin.destroy()
      })

      it('should disable controls when set to false', () => {
        const configWithoutControls: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          controls: false,
        }
        // Reset mock to check initial state
        mockVideo.controls = false
        const playerWithoutControls = createNativePlayer(configWithoutControls)
        expect(mockVideo.controls).toBe(false)
        playerWithoutControls.destroy()
      })

      it('should apply className if provided', () => {
        const configWithClassName: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          className: 'my-video-class',
        }
        const playerWithClassName = createNativePlayer(configWithClassName)
        expect(mockVideo.className).toBe('my-video-class')
        playerWithClassName.destroy()
      })

      it('should add text tracks if provided', () => {
        const configWithTracks: PlayerConfig = {
          container: mockContainer as unknown as HTMLElement,
          sources: defaultSources,
          tracks: [
            {
              kind: 'subtitles',
              label: 'English',
              language: 'en',
              src: 'subs-en.vtt',
              default: true,
            },
          ],
        }
        const playerWithTracks = createNativePlayer(configWithTracks)
        expect(mockVideo.appendChild).toHaveBeenCalled()
        playerWithTracks.destroy()
      })

      it('should resolve container by ID string', () => {
        vi.spyOn(document, 'getElementById').mockReturnValue(
          mockContainer as unknown as HTMLElement,
        )

        const configWithStringContainer: PlayerConfig = {
          container: 'video-container',
          sources: defaultSources,
        }
        const playerWithStringContainer = createNativePlayer(configWithStringContainer)
        expect(document.getElementById).toHaveBeenCalledWith('video-container')
        playerWithStringContainer.destroy()
      })
    })

    describe('playback controls', () => {
      describe('play', () => {
        it('should call video.play()', async () => {
          await player.play()
          expect(mockVideo.play).toHaveBeenCalled()
        })

        it('should return a promise', () => {
          const result = player.play()
          expect(result).toBeInstanceOf(Promise)
        })
      })

      describe('pause', () => {
        it('should call video.pause()', () => {
          player.pause()
          expect(mockVideo.pause).toHaveBeenCalled()
        })
      })

      describe('togglePlay', () => {
        it('should play when paused', async () => {
          mockVideo.paused = true
          player.togglePlay()
          expect(mockVideo.play).toHaveBeenCalled()
        })

        it('should pause when playing', () => {
          mockVideo.paused = false
          player.togglePlay()
          expect(mockVideo.pause).toHaveBeenCalled()
        })
      })

      describe('stop', () => {
        it('should pause and reset currentTime to 0', () => {
          mockVideo.currentTime = 60
          player.stop()
          expect(mockVideo.pause).toHaveBeenCalled()
          expect(mockVideo.currentTime).toBe(0)
        })
      })
    })

    describe('seeking', () => {
      describe('seek', () => {
        it('should set currentTime', () => {
          player.seek(30)
          expect(mockVideo.currentTime).toBe(30)
        })
      })

      describe('seekForward', () => {
        it('should seek forward by default 10 seconds', () => {
          mockVideo.currentTime = 30
          player.seekForward()
          expect(mockVideo.currentTime).toBe(40)
        })

        it('should seek forward by specified seconds', () => {
          mockVideo.currentTime = 30
          player.seekForward(15)
          expect(mockVideo.currentTime).toBe(45)
        })

        it('should not exceed duration', () => {
          mockVideo.currentTime = 115
          mockVideo.duration = 120
          player.seekForward(10)
          expect(mockVideo.currentTime).toBe(120)
        })
      })

      describe('seekBackward', () => {
        it('should seek backward by default 10 seconds', () => {
          mockVideo.currentTime = 30
          player.seekBackward()
          expect(mockVideo.currentTime).toBe(20)
        })

        it('should seek backward by specified seconds', () => {
          mockVideo.currentTime = 30
          player.seekBackward(15)
          expect(mockVideo.currentTime).toBe(15)
        })

        it('should not go below 0', () => {
          mockVideo.currentTime = 5
          player.seekBackward(10)
          expect(mockVideo.currentTime).toBe(0)
        })
      })

      describe('getCurrentTime', () => {
        it('should return current time', () => {
          mockVideo.currentTime = 45
          expect(player.getCurrentTime()).toBe(45)
        })
      })

      describe('getDuration', () => {
        it('should return duration', () => {
          mockVideo.duration = 120
          expect(player.getDuration()).toBe(120)
        })
      })

      describe('getBuffered', () => {
        it('should return buffered ranges', () => {
          const buffered = player.getBuffered()
          expect(buffered).toHaveLength(1)
          expect(buffered[0]).toEqual({ start: 0, end: 60 })
        })
      })
    })

    describe('volume controls', () => {
      describe('setVolume', () => {
        it('should set volume', () => {
          player.setVolume(0.5)
          expect(mockVideo.volume).toBe(0.5)
        })

        it('should clamp volume to max 1', () => {
          player.setVolume(1.5)
          expect(mockVideo.volume).toBe(1)
        })

        it('should clamp volume to min 0', () => {
          player.setVolume(-0.5)
          expect(mockVideo.volume).toBe(0)
        })
      })

      describe('getVolume', () => {
        it('should return current volume', () => {
          mockVideo.volume = 0.75
          expect(player.getVolume()).toBe(0.75)
        })
      })

      describe('mute', () => {
        it('should set muted to true', () => {
          player.mute()
          expect(mockVideo.muted).toBe(true)
        })
      })

      describe('unmute', () => {
        it('should set muted to false', () => {
          mockVideo.muted = true
          player.unmute()
          expect(mockVideo.muted).toBe(false)
        })
      })

      describe('toggleMute', () => {
        it('should toggle muted state', () => {
          mockVideo.muted = false
          player.toggleMute()
          expect(mockVideo.muted).toBe(true)

          player.toggleMute()
          expect(mockVideo.muted).toBe(false)
        })
      })

      describe('isMuted', () => {
        it('should return muted state', () => {
          mockVideo.muted = true
          expect(player.isMuted()).toBe(true)

          mockVideo.muted = false
          expect(player.isMuted()).toBe(false)
        })
      })
    })

    describe('playback rate', () => {
      describe('setPlaybackRate', () => {
        it('should set playback rate', () => {
          player.setPlaybackRate(1.5)
          expect(mockVideo.playbackRate).toBe(1.5)
        })
      })

      describe('getPlaybackRate', () => {
        it('should return playback rate', () => {
          mockVideo.playbackRate = 2
          expect(player.getPlaybackRate()).toBe(2)
        })
      })
    })

    describe('quality levels', () => {
      describe('getQualityLevels', () => {
        it('should return quality levels from sources', () => {
          const levels = player.getQualityLevels()
          expect(levels).toHaveLength(2)
          expect(levels[0].label).toBe('720p')
          expect(levels[1].label).toBe('1080p')
        })
      })

      describe('setQuality', () => {
        it('should change source by index', () => {
          player.setQuality(1)
          expect(mockVideo.src).toBe('video-1080p.mp4')
        })

        it('should change source by label', () => {
          player.setQuality('1080p')
          expect(mockVideo.src).toBe('video-1080p.mp4')
        })

        it('should preserve current time', () => {
          mockVideo.currentTime = 45
          player.setQuality(1)
          expect(mockVideo.currentTime).toBe(45)
        })

        it('should resume playback if was playing', async () => {
          mockVideo.paused = false
          player.setQuality(1)
          expect(mockVideo.play).toHaveBeenCalled()
        })
      })

      describe('getQuality', () => {
        it('should return current quality', () => {
          const quality = player.getQuality()
          expect(quality?.id).toBe(0)
          expect(quality?.label).toBe('720p')
        })
      })
    })

    describe('fullscreen', () => {
      describe('enterFullscreen', () => {
        it('should request fullscreen on container', async () => {
          await player.enterFullscreen()
          expect(mockContainer.requestFullscreen).toHaveBeenCalled()
        })
      })

      describe('exitFullscreen', () => {
        it('should exit fullscreen', async () => {
          await player.exitFullscreen()
          expect(document.exitFullscreen).toHaveBeenCalled()
        })
      })

      describe('toggleFullscreen', () => {
        it('should enter fullscreen when not fullscreen', async () => {
          ;(document as unknown as Record<string, unknown>).fullscreenElement = null
          await player.toggleFullscreen()
          expect(mockContainer.requestFullscreen).toHaveBeenCalled()
        })

        it('should exit fullscreen when fullscreen', async () => {
          ;(document as unknown as Record<string, unknown>).fullscreenElement = mockContainer
          await player.toggleFullscreen()
          expect(document.exitFullscreen).toHaveBeenCalled()
        })
      })

      describe('isFullscreen', () => {
        it('should return true when fullscreen', () => {
          ;(document as unknown as Record<string, unknown>).fullscreenElement = mockContainer
          expect(player.isFullscreen()).toBe(true)
        })

        it('should return false when not fullscreen', () => {
          ;(document as unknown as Record<string, unknown>).fullscreenElement = null
          expect(player.isFullscreen()).toBe(false)
        })
      })
    })

    describe('picture-in-picture', () => {
      describe('enterPip', () => {
        it('should request picture-in-picture', async () => {
          await player.enterPip()
          expect(mockVideo.requestPictureInPicture).toHaveBeenCalled()
        })
      })

      describe('exitPip', () => {
        it('should exit picture-in-picture', async () => {
          await player.exitPip()
          expect(document.exitPictureInPicture).toHaveBeenCalled()
        })
      })

      describe('togglePip', () => {
        it('should enter pip when not in pip', async () => {
          ;(document as unknown as Record<string, unknown>).pictureInPictureElement = null
          await player.togglePip()
          expect(mockVideo.requestPictureInPicture).toHaveBeenCalled()
        })

        it('should exit pip when in pip', async () => {
          ;(document as unknown as Record<string, unknown>).pictureInPictureElement = mockVideo
          await player.togglePip()
          expect(document.exitPictureInPicture).toHaveBeenCalled()
        })
      })

      describe('isPip', () => {
        it('should return true when in pip', () => {
          ;(document as unknown as Record<string, unknown>).pictureInPictureElement = mockVideo
          expect(player.isPip()).toBe(true)
        })

        it('should return false when not in pip', () => {
          ;(document as unknown as Record<string, unknown>).pictureInPictureElement = null
          expect(player.isPip()).toBe(false)
        })
      })
    })

    describe('source management', () => {
      describe('load', () => {
        it('should load new sources', () => {
          const newSources: VideoSource[] = [{ src: 'new-video.mp4', type: 'video/mp4' }]
          player.load(newSources)
          expect(mockVideo.innerHTML).toBe('')
          expect(mockVideo.load).toHaveBeenCalled()
        })

        it('should update poster if provided', () => {
          const newSources: VideoSource[] = [{ src: 'new-video.mp4', type: 'video/mp4' }]
          player.load(newSources, 'new-poster.jpg')
          expect(mockVideo.poster).toBe('new-poster.jpg')
        })
      })

      describe('getSource', () => {
        it('should return current source', () => {
          const source = player.getSource()
          expect(source?.src).toBe('video-720p.mp4')
        })
      })
    })

    describe('state', () => {
      describe('getState', () => {
        it('should return player state', () => {
          mockVideo.currentTime = 30
          mockVideo.duration = 120
          mockVideo.paused = false
          mockVideo.ended = false
          mockVideo.seeking = false
          mockVideo.muted = false
          mockVideo.volume = 0.8
          mockVideo.playbackRate = 1
          mockVideo.readyState = 4
          ;(document as unknown as Record<string, unknown>).fullscreenElement = null
          ;(document as unknown as Record<string, unknown>).pictureInPictureElement = null

          const state = player.getState()

          expect(state.currentTime).toBe(30)
          expect(state.duration).toBe(120)
          expect(state.playing).toBe(true)
          expect(state.paused).toBe(false)
          expect(state.ended).toBe(false)
          expect(state.seeking).toBe(false)
          expect(state.muted).toBe(false)
          expect(state.volume).toBe(0.8)
          expect(state.playbackRate).toBe(1)
          expect(state.fullscreen).toBe(false)
          expect(state.pip).toBe(false)
        })

        it('should return waiting state based on readyState', () => {
          mockVideo.readyState = 2
          const state = player.getState()
          expect(state.waiting).toBe(true)
        })

        it('should return buffered ranges', () => {
          const state = player.getState()
          expect(state.buffered).toHaveLength(1)
          expect(state.buffered[0]).toEqual({ start: 0, end: 60 })
        })
      })
    })

    describe('event handling', () => {
      describe('on', () => {
        it('should add event listener', () => {
          const handler = vi.fn()
          player.on('play', handler)

          // Trigger the event
          mockVideo.triggerEvent('play')

          expect(handler).toHaveBeenCalled()
        })

        it('should return unsubscribe function', () => {
          const handler = vi.fn()
          const unsubscribe = player.on('play', handler)

          unsubscribe()

          // Trigger the event
          mockVideo.triggerEvent('play')

          expect(handler).not.toHaveBeenCalled()
        })

        it('should support multiple handlers for same event', () => {
          const handler1 = vi.fn()
          const handler2 = vi.fn()

          player.on('play', handler1)
          player.on('play', handler2)
          mockVideo.triggerEvent('play')

          expect(handler1).toHaveBeenCalled()
          expect(handler2).toHaveBeenCalled()
        })
      })

      describe('off', () => {
        it('should remove event listener', () => {
          const handler = vi.fn()
          player.on('play', handler)
          player.off('play', handler)
          mockVideo.triggerEvent('play')

          expect(handler).not.toHaveBeenCalled()
        })
      })

      it('should map native events to player events', () => {
        const events = [
          'play',
          'pause',
          'ended',
          'timeupdate',
          'progress',
          'seeking',
          'seeked',
          'volumechange',
          'ratechange',
          'waiting',
          'canplay',
          'canplaythrough',
          'loadedmetadata',
          'loadeddata',
          'durationchange',
          'error',
        ]

        for (const event of events) {
          expect(mockVideo.addEventListener).toHaveBeenCalledWith(event, expect.any(Function))
        }
      })
    })

    describe('text tracks', () => {
      describe('getTextTracks', () => {
        it('should return empty array when no tracks configured', () => {
          expect(player.getTextTracks()).toEqual([])
        })

        it('should return configured tracks', () => {
          const configWithTracks: PlayerConfig = {
            container: mockContainer as unknown as HTMLElement,
            sources: defaultSources,
            tracks: [
              { kind: 'subtitles', label: 'English', language: 'en', src: 'subs-en.vtt' },
              { kind: 'subtitles', label: 'Spanish', language: 'es', src: 'subs-es.vtt' },
            ],
          }
          const playerWithTracks = createNativePlayer(configWithTracks)
          const tracks = playerWithTracks.getTextTracks()
          expect(tracks).toHaveLength(2)
          expect(tracks[0].label).toBe('English')
          expect(tracks[1].label).toBe('Spanish')
          playerWithTracks.destroy()
        })
      })

      describe('setTextTrack', () => {
        it('should set active text track', () => {
          // Create mock text tracks
          const mockTextTracks = [
            { language: 'en', mode: 'hidden' },
            { language: 'es', mode: 'hidden' },
          ]
          Object.defineProperty(mockVideo, 'textTracks', {
            value: {
              length: 2,
              0: mockTextTracks[0],
              1: mockTextTracks[1],
            },
            configurable: true,
          })

          player.setTextTrack('en')
          expect(mockTextTracks[0].mode).toBe('showing')
          expect(mockTextTracks[1].mode).toBe('hidden')
        })

        it('should hide all tracks when null is passed', () => {
          const mockTextTracks = [
            { language: 'en', mode: 'showing' },
            { language: 'es', mode: 'hidden' },
          ]
          Object.defineProperty(mockVideo, 'textTracks', {
            value: {
              length: 2,
              0: mockTextTracks[0],
              1: mockTextTracks[1],
            },
            configurable: true,
          })

          player.setTextTrack(null)
          expect(mockTextTracks[0].mode).toBe('hidden')
          expect(mockTextTracks[1].mode).toBe('hidden')
        })
      })

      describe('getActiveTextTrack', () => {
        it('should return undefined when no track is showing', () => {
          expect(player.getActiveTextTrack()).toBeUndefined()
        })

        it('should return active track', () => {
          const configWithTracks: PlayerConfig = {
            container: mockContainer as unknown as HTMLElement,
            sources: defaultSources,
            tracks: [{ kind: 'subtitles', label: 'English', language: 'en', src: 'subs-en.vtt' }],
          }
          const playerWithTracks = createNativePlayer(configWithTracks)

          Object.defineProperty(mockVideo, 'textTracks', {
            value: {
              length: 1,
              0: { language: 'en', mode: 'showing' },
            },
            configurable: true,
          })

          const activeTrack = playerWithTracks.getActiveTextTrack()
          expect(activeTrack?.language).toBe('en')
          playerWithTracks.destroy()
        })
      })
    })

    describe('controls', () => {
      describe('showControls', () => {
        it('should set controls to true', () => {
          mockVideo.controls = false
          player.showControls()
          expect(mockVideo.controls).toBe(true)
        })
      })

      describe('hideControls', () => {
        it('should set controls to false', () => {
          mockVideo.controls = true
          player.hideControls()
          expect(mockVideo.controls).toBe(false)
        })
      })
    })

    describe('element access', () => {
      describe('getVideoElement', () => {
        it('should return video element', () => {
          expect(player.getVideoElement()).toBe(mockVideo)
        })
      })

      describe('getContainer', () => {
        it('should return container element', () => {
          expect(player.getContainer()).toBe(mockContainer)
        })
      })

      describe('getInstance', () => {
        it('should return video element as instance', () => {
          expect(player.getInstance()).toBe(mockVideo)
        })
      })
    })

    describe('screenshot', () => {
      it('should create canvas and return data URL', () => {
        const result = player.screenshot()
        expect(result).toBe('data:image/png;base64,test')
        expect(document.createElement).toHaveBeenCalledWith('canvas')
      })
    })

    describe('destroy', () => {
      it('should pause video', () => {
        player.destroy()
        expect(mockVideo.pause).toHaveBeenCalled()
      })

      it('should clear video source', () => {
        player.destroy()
        expect(mockVideo.src).toBe('')
      })

      it('should call video.load() to reset', () => {
        player.destroy()
        expect(mockVideo.load).toHaveBeenCalled()
      })

      it('should remove video from DOM', () => {
        player.destroy()
        expect(mockVideo.remove).toHaveBeenCalled()
      })
    })
  })
})
